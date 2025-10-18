<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker\Types;

final readonly class EventContext
{
    public function __construct(
        public string $culprit,
        public ?array $extra = null,
        public ?string $platform = null,
        public ?string $app = null,
        public ?string $version = null,
        public ?string $device = null,
        public ?array $tags = null
    ) {}
}

final readonly class SerializedError
{
    public function __construct(
        public string $name,
        public string $message,
        public ?string $stack = null,
        public ?array $extra = null
    ) {}
}

final readonly class EventIssue
{
    public function __construct(
        public string $eventId,
        public string $title,
        public string $level,
        public SerializedError $event,
        public EventContext $context,
        public string $timestamp
    ) {}
}

final readonly class TransportPayload
{
    public function __construct(
        public string $event,
        public string $licenseId,
        public string $licenseDevice,
        public ?string $licenseName = null
    ) {}
}
