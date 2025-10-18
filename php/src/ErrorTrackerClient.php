<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker;

use Royaltics\ErrorTracker\Core\EventBuilder;
use Royaltics\ErrorTracker\Core\Transport;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventIssue;
use Royaltics\ErrorTracker\Types\EventLevel;
use Royaltics\ErrorTracker\Utils\Compression;

final class ErrorTrackerClient
{
    private readonly EventBuilder $eventBuilder;
    private readonly Transport $transport;
    private array $eventQueue = [];
    private bool $isActive = false;
    private bool $isEnabled;
    private bool $isProcessing = false;

    public function __construct(private readonly ClientConfig $config)
    {
        $this->isEnabled = $this->config->enabled;
        
        $this->eventBuilder = new EventBuilder(
            app: $this->config->app,
            version: $this->config->version,
            platform: $this->config->platform,
            device: $this->config->licenseDevice
        );

        $this->transport = new Transport($this->config);
    }

    public function start(): self
    {
        if ($this->isActive) {
            return $this;
        }

        $this->attachErrorHandlers();
        $this->startBatchProcessor();
        $this->isActive = true;

        return $this;
    }

    public function error(
        \Throwable $error,
        EventLevel $level = EventLevel::ERROR,
        ?array $metadata = null
    ): self {
        if (!$this->isEnabled) {
            return $this;
        }

        try {
            $title = $error->getMessage() ?: 'Unknown error';
            $event = $this->eventBuilder->build($title, $error, $level, $metadata);
            $this->enqueue($event);
        } catch (\Exception $e) {
            $this->handleInternalError('Failed to track error', $e);
        }

        return $this;
    }

    public function event(
        string $title,
        EventLevel $level = EventLevel::INFO,
        ?array $metadata = null
    ): self {
        if (!$this->isEnabled) {
            return $this;
        }

        try {
            $error = new \Exception($title);
            $event = $this->eventBuilder->build($title, $error, $level, $metadata);
            $this->enqueue($event);
        } catch (\Exception $e) {
            $this->handleInternalError('Failed to track event', $e);
        }

        return $this;
    }

    public function forceFlush(): void
    {
        while (count($this->eventQueue) > 0) {
            $this->processBatch();
        }
    }

    public function pause(): self
    {
        $this->isEnabled = false;
        return $this;
    }

    public function resume(): self
    {
        $this->isEnabled = true;
        return $this;
    }

    public function shutdown(): void
    {
        $this->isEnabled = false;
        $this->isActive = false;
        $this->forceFlush();
    }

    private function attachErrorHandlers(): void
    {
        set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline): bool {
            $this->error(
                new \ErrorException($errstr, 0, $errno, $errfile, $errline),
                EventLevel::ERROR,
                ['source' => 'error_handler']
            );
            return false;
        });

        set_exception_handler(function (\Throwable $exception): void {
            $this->error($exception, EventLevel::FATAL, ['source' => 'exception_handler']);
            $this->forceFlush();
        });

        register_shutdown_function(function (): void {
            $error = error_get_last();
            if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
                $this->error(
                    new \ErrorException($error['message'], 0, $error['type'], $error['file'], $error['line']),
                    EventLevel::FATAL,
                    ['source' => 'shutdown_handler']
                );
                $this->forceFlush();
            }
        });
    }

    private function startBatchProcessor(): void
    {
        register_tick_function(function (): void {
            if (!$this->isActive) {
                return;
            }

            static $lastFlush = 0;
            $now = (int)(microtime(true) * 1000);

            if ($now - $lastFlush >= $this->config->flushInterval) {
                $this->processBatch();
                $lastFlush = $now;
            }
        });
    }

    private function enqueue(EventIssue $event): void
    {
        $this->eventQueue[] = $event;

        if (count($this->eventQueue) >= $this->config->maxQueueSize) {
            $this->processBatch();
        }
    }

    private function processBatch(): void
    {
        if (count($this->eventQueue) === 0 || $this->isProcessing) {
            return;
        }

        $this->isProcessing = true;

        try {
            $batch = array_splice($this->eventQueue, 0, $this->config->maxQueueSize);

            foreach ($batch as $event) {
                try {
                    $this->dispatchEvent($event);
                } catch (\Exception $e) {
                    $this->handleInternalError('Failed to dispatch event', $e);
                }
            }
        } finally {
            $this->isProcessing = false;
        }
    }

    private function dispatchEvent(EventIssue $event): void
    {
        $eventString = $this->eventBuilder->stringify($event);
        $compressed = Compression::compressAndEncode($eventString);
        $this->transport->send($compressed);
    }

    private function handleInternalError(string $context, \Exception $error): void
    {
        error_log("[ErrorTracker] {$context}: {$error->getMessage()}");
    }
}
