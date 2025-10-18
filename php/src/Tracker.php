<?php

declare(strict_types=1);

namespace Royaltics\ErrorTracker;

use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventLevel;

final class Tracker
{
    private static array $instances = [];
    private static ?ErrorTrackerClient $defaultInstance = null;

    public static function create(ClientConfig $config, ?string $name = null): ErrorTrackerClient
    {
        $client = new ErrorTrackerClient($config);

        if ($name !== null) {
            self::$instances[$name] = $client;
        } elseif (self::$defaultInstance === null) {
            self::$defaultInstance = $client;
        }

        return $client->start();
    }

    public static function get(?string $name = null): ErrorTrackerClient
    {
        if ($name !== null) {
            if (!isset(self::$instances[$name])) {
                throw new \RuntimeException("Tracker instance \"{$name}\" not found");
            }
            return self::$instances[$name];
        }

        if (self::$defaultInstance === null) {
            throw new \RuntimeException('No default tracker initialized. Call Tracker::create() first.');
        }

        return self::$defaultInstance;
    }

    public static function error(
        \Throwable $error,
        EventLevel $level = EventLevel::ERROR,
        ?array $metadata = null
    ): ErrorTrackerClient {
        return self::get()->error($error, $level, $metadata);
    }

    public static function event(
        string $title,
        EventLevel $level = EventLevel::INFO,
        ?array $metadata = null
    ): ErrorTrackerClient {
        return self::get()->event($title, $level, $metadata);
    }

    public static function flush(): void
    {
        self::get()->forceFlush();
    }

    public static function pause(): ErrorTrackerClient
    {
        return self::get()->pause();
    }

    public static function resume(): ErrorTrackerClient
    {
        return self::get()->resume();
    }

    public static function shutdown(): void
    {
        self::$defaultInstance?->shutdown();
        
        foreach (self::$instances as $instance) {
            $instance->shutdown();
        }

        self::$instances = [];
        self::$defaultInstance = null;
    }

    public static function has(?string $name = null): bool
    {
        if ($name !== null) {
            return isset(self::$instances[$name]);
        }

        return self::$defaultInstance !== null;
    }
}
