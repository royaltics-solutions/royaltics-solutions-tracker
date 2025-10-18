<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker\Core;

use Royaltics\ErrorTracker\Types\EventContext;
use Royaltics\ErrorTracker\Types\EventIssue;
use Royaltics\ErrorTracker\Types\EventLevel;
use Royaltics\ErrorTracker\Types\SerializedError;

final class EventBuilder
{
    public function __construct(
        private readonly ?string $app,
        private readonly ?string $version,
        private readonly ?string $platform,
        private readonly ?string $device
    ) {}

    public function build(
        string $title,
        \Throwable $error,
        EventLevel $level = EventLevel::ERROR,
        ?array $extra = null
    ): EventIssue {
        $culprit = $this->extractCulprit($error);
        $serializedError = $this->serializeError($error);
        $tags = $this->extractTags($error);

        return new EventIssue(
            eventId: $this->generateUuid(),
            title: $title,
            level: $level->value,
            event: $serializedError,
            context: new EventContext(
                culprit: $culprit,
                extra: $extra,
                platform: $this->platform ?? PHP_OS,
                app: $this->app,
                version: $this->version,
                device: $this->device ?? gethostname() ?: 'unknown',
                tags: $tags
            ),
            timestamp: (new \DateTimeImmutable())->format(\DateTimeInterface::RFC3339)
        );
    }

    public function stringify(EventIssue $event): string
    {
        return json_encode([
            'event_id' => $event->eventId,
            'title' => $event->title,
            'level' => $event->level,
            'event' => [
                'name' => $event->event->name,
                'message' => $event->event->message,
                'stack' => $event->event->stack,
                'extra' => $event->event->extra,
            ],
            'context' => [
                'culprit' => $event->context->culprit,
                'extra' => $event->context->extra,
                'platform' => $event->context->platform,
                'app' => $event->context->app,
                'version' => $event->context->version,
                'device' => $event->context->device,
                'tags' => $event->context->tags,
            ],
            'timestamp' => $event->timestamp,
        ], JSON_THROW_ON_ERROR);
    }

    private function extractCulprit(\Throwable $error): string
    {
        $trace = $error->getTrace();
        
        if (!empty($trace)) {
            $firstFrame = $trace[0];
            $class = $firstFrame['class'] ?? '';
            $function = $firstFrame['function'] ?? '';
            
            if ($class && $function) {
                return "{$class}::{$function}";
            }
            
            if ($function) {
                return $function;
            }
        }

        return get_class($error);
    }

    private function serializeError(\Throwable $error): SerializedError
    {
        return new SerializedError(
            name: get_class($error),
            message: $error->getMessage(),
            stack: $error->getTraceAsString(),
            extra: null
        );
    }

    private function extractTags(\Throwable $error): array
    {
        $tags = [];
        $tags[] = 'error:' . get_class($error);
        
        if ($error->getCode() !== 0) {
            $tags[] = 'code:' . $error->getCode();
        }
        
        return $tags;
    }

    private function generateUuid(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
