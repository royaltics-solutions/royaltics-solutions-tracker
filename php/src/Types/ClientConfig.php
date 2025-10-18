<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker\Types;

final readonly class ClientConfig
{
    public function __construct(
        public string $webhookUrl,
        public string $licenseId,
        public string $licenseDevice,
        public ?string $licenseName = null,
        public ?string $app = null,
        public ?string $version = null,
        public ?string $platform = null,
        public bool $enabled = true,
        public int $maxRetries = 3,
        public int $timeout = 10000,
        public int $flushInterval = 5000,
        public int $maxQueueSize = 50,
        public array $headers = []
    ) {
        $this->validate();
    }

    private function validate(): void
    {
        if (empty($this->webhookUrl)) {
            throw new \InvalidArgumentException('webhookUrl is required');
        }

        if (!filter_var($this->webhookUrl, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('webhookUrl must be a valid URL');
        }

        if (empty($this->licenseId)) {
            throw new \InvalidArgumentException('licenseId is required');
        }

        if (empty($this->licenseDevice)) {
            throw new \InvalidArgumentException('licenseDevice is required');
        }

        if ($this->maxRetries < 0 || $this->maxRetries > 10) {
            throw new \InvalidArgumentException('maxRetries must be between 0 and 10');
        }

        if ($this->timeout < 1000 || $this->timeout > 60000) {
            throw new \InvalidArgumentException('timeout must be between 1000 and 60000ms');
        }

        if ($this->flushInterval < 100) {
            throw new \InvalidArgumentException('flushInterval must be at least 100ms');
        }

        if ($this->maxQueueSize < 1) {
            throw new \InvalidArgumentException('maxQueueSize must be at least 1');
        }
    }
}
