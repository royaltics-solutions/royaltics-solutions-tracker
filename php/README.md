# Royaltics Error Tracker - PHP

> PHP client for Royaltics Error Tracker

## Features

- ✅ **PHP 8.1+**: Modern PHP with strict types
- ✅ **Enums**: Type-safe event levels
- ✅ **Readonly Classes**: Immutable data structures
- ✅ **Guzzle HTTP**: Reliable HTTP client
- ✅ **PSR-4 Autoloading**: Composer integration
- ✅ **Production Ready**: Comprehensive error handling

## Requirements

- PHP 8.1 or higher
- ext-json
- ext-zlib
- Composer

## Installation

```bash
composer require royaltics/tracker-php
```

## Quick Start

```php
<?php

require_once __DIR__ . '/vendor/autoload.php';

use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventLevel;

// Initialize tracker
$config = new ClientConfig(
    webhookUrl: 'https://api.example.com/webhook',
    licenseId: 'your-license-id',
    licenseDevice: 'server-01',
    app: 'my-php-app',
    version: '1.0.0'
);

Tracker::create($config);

// Track errors
try {
    // Your code
    throw new Exception('Something went wrong');
} catch (Throwable $e) {
    Tracker::error($e, EventLevel::ERROR, [
        'userId' => '123',
        'action' => 'processPayment'
    ]);
}

// Track events
Tracker::event('User logged in', EventLevel::INFO, [
    'userId' => '123'
]);

// Flush before shutdown
Tracker::flush();
Tracker::shutdown();
```

## Configuration

```php
use Royaltics\ErrorTracker\Types\ClientConfig;

$config = new ClientConfig(
    // Required
    webhookUrl: 'https://api.example.com/webhook',
    licenseId: 'your-license-id',
    licenseDevice: 'server-01',
    
    // Optional
    licenseName: 'My Company',
    app: 'my-app',
    version: '1.0.0',
    platform: 'php',
    enabled: true,
    maxRetries: 3,
    timeout: 10000,
    flushInterval: 5000,
    maxQueueSize: 50,
    headers: [
        'X-Custom-Header' => 'value'
    ]
);
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `webhookUrl` | `string` | **required** | HTTP/HTTPS webhook URL |
| `licenseId` | `string` | **required** | Your license ID |
| `licenseDevice` | `string` | **required** | Device identifier |
| `licenseName` | `string\|null` | `null` | License name |
| `app` | `string\|null` | `null` | Application name |
| `version` | `string\|null` | `null` | Application version |
| `platform` | `string\|null` | `null` | Platform identifier |
| `enabled` | `bool` | `true` | Enable/disable tracking |
| `maxRetries` | `int` | `3` | Max retry attempts (0-10) |
| `timeout` | `int` | `10000` | Request timeout in ms |
| `flushInterval` | `int` | `5000` | Batch flush interval in ms |
| `maxQueueSize` | `int` | `50` | Max events before auto-flush |
| `headers` | `array` | `[]` | Custom HTTP headers |

## Usage

### Basic Error Tracking

```php
use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\EventLevel;

function processOrder(string $orderId): void
{
    try {
        // Your code
        throw new RuntimeException('Order not found');
    } catch (Throwable $e) {
        Tracker::error($e, EventLevel::ERROR, [
            'orderId' => $orderId,
            'action' => 'processOrder'
        ]);
        throw $e;
    }
}
```

### Event Levels

```php
use Royaltics\ErrorTracker\Types\EventLevel;

Tracker::event('Debug message', EventLevel::DEBUG);
Tracker::event('Info message', EventLevel::INFO);
Tracker::event('Warning message', EventLevel::WARNING);
Tracker::error(new Exception('Error'), EventLevel::ERROR);
Tracker::error(new Exception('Fatal'), EventLevel::FATAL);
```

### Using ErrorTrackerClient Directly

```php
use Royaltics\ErrorTracker\ErrorTrackerClient;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventLevel;

$client = new ErrorTrackerClient($config);
$client->start();

$client->error(
    new Exception('Test error'),
    EventLevel::ERROR,
    ['context' => 'test']
);

$client->event('Test event', EventLevel::INFO);

// Force flush
$client->forceFlush();

// Shutdown
$client->shutdown();
```

### Multiple Instances

```php
// Create named instances
Tracker::create($prodConfig, 'production');
Tracker::create($stagingConfig, 'staging');

// Use specific instance
Tracker::get('production')->error($error);
Tracker::get('staging')->event('Test event');

// Check if instance exists
if (Tracker::has('production')) {
    // ...
}
```

### Laravel Integration

#### Service Provider

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\ClientConfig;

class ErrorTrackerServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton('tracker', function ($app) {
            $config = new ClientConfig(
                webhookUrl: config('services.error_tracker.webhook_url'),
                licenseId: config('services.error_tracker.license_id'),
                licenseDevice: config('services.error_tracker.device'),
                app: config('app.name'),
                version: config('app.version'),
                enabled: config('services.error_tracker.enabled', true)
            );
            
            return Tracker::create($config);
        });
    }

    public function boot(): void
    {
        //
    }
}
```

#### Configuration

```php
// config/services.php
return [
    'error_tracker' => [
        'webhook_url' => env('ERROR_TRACKER_WEBHOOK_URL'),
        'license_id' => env('ERROR_TRACKER_LICENSE_ID'),
        'device' => env('ERROR_TRACKER_DEVICE', 'laravel-server'),
        'enabled' => env('ERROR_TRACKER_ENABLED', true),
    ],
];
```

#### Exception Handler

```php
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\EventLevel;
use Throwable;

class Handler extends ExceptionHandler
{
    public function report(Throwable $exception): void
    {
        if ($this->shouldReport($exception)) {
            Tracker::error($exception, EventLevel::ERROR, [
                'url' => request()->fullUrl(),
                'method' => request()->method(),
                'ip' => request()->ip(),
            ]);
        }

        parent::report($exception);
    }
}
```

### Symfony Integration

#### Service Configuration

```yaml
# config/services.yaml
services:
    Royaltics\ErrorTracker\ErrorTrackerClient:
        factory: ['Royaltics\ErrorTracker\Tracker', 'create']
        arguments:
            - !php/const Royaltics\ErrorTracker\Types\ClientConfig
                webhookUrl: '%env(ERROR_TRACKER_WEBHOOK_URL)%'
                licenseId: '%env(ERROR_TRACKER_LICENSE_ID)%'
                licenseDevice: '%env(ERROR_TRACKER_DEVICE)%'
                app: 'symfony-app'
                version: '1.0.0'
```

#### Event Subscriber

```php
<?php

namespace App\EventSubscriber;

use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\EventLevel;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class ErrorTrackerSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => 'onKernelException',
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $request = $event->getRequest();

        Tracker::error($exception, EventLevel::ERROR, [
            'url' => $request->getUri(),
            'method' => $request->getMethod(),
            'ip' => $request->getClientIp(),
        ]);
    }
}
```

### WordPress Integration

```php
<?php
// wp-content/mu-plugins/tracker.php

use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventLevel;

add_action('init', function () {
    $config = new ClientConfig(
        webhookUrl: get_option('error_tracker_webhook_url'),
        licenseId: get_option('error_tracker_license_id'),
        licenseDevice: get_option('error_tracker_device', 'wordpress-server'),
        app: 'wordpress',
        version: get_bloginfo('version')
    );
    
    Tracker::create($config);
});

add_action('shutdown', function () {
    $error = error_get_last();
    
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR])) {
        Tracker::error(
            new ErrorException(
                $error['message'],
                0,
                $error['type'],
                $error['file'],
                $error['line']
            ),
            EventLevel::FATAL,
            ['source' => 'shutdown_handler']
        );
    }
    
    Tracker::flush();
    Tracker::shutdown();
});
```

### Custom Error Handler

```php
<?php

use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\EventLevel;

set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline) {
    Tracker::error(
        new ErrorException($errstr, 0, $errno, $errfile, $errline),
        EventLevel::ERROR,
        ['source' => 'error_handler']
    );
    
    return false; // Let PHP handle it too
});

set_exception_handler(function (Throwable $exception) {
    Tracker::error($exception, EventLevel::FATAL, [
        'source' => 'exception_handler'
    ]);
    
    Tracker::flush();
    
    echo "An error occurred. Please try again later.";
    exit(1);
});

register_shutdown_function(function () {
    Tracker::flush();
    Tracker::shutdown();
});
```

## API Reference

### Tracker Class

```php
final class Tracker
{
    public static function create(ClientConfig $config, ?string $name = null): ErrorTrackerClient;
    public static function get(?string $name = null): ErrorTrackerClient;
    public static function error(Throwable $error, EventLevel $level = EventLevel::ERROR, ?array $metadata = null): ErrorTrackerClient;
    public static function event(string $title, EventLevel $level = EventLevel::INFO, ?array $metadata = null): ErrorTrackerClient;
    public static function flush(): void;
    public static function pause(): ErrorTrackerClient;
    public static function resume(): ErrorTrackerClient;
    public static function shutdown(): void;
    public static function has(?string $name = null): bool;
}
```

### ErrorTrackerClient Class

```php
final class ErrorTrackerClient
{
    public function __construct(ClientConfig $config);
    public function start(): self;
    public function error(Throwable $error, EventLevel $level = EventLevel::ERROR, ?array $metadata = null): self;
    public function event(string $title, EventLevel $level = EventLevel::INFO, ?array $metadata = null): self;
    public function forceFlush(): void;
    public function pause(): self;
    public function resume(): self;
    public function shutdown(): void;
}
```

### EventLevel Enum

```php
enum EventLevel: string
{
    case DEBUG = 'DEBUG';
    case INFO = 'INFO';
    case WARNING = 'WARNING';
    case ERROR = 'ERROR';
    case FATAL = 'FATAL';
}
```

## Testing

```php
<?php

use PHPUnit\Framework\TestCase;
use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventLevel;

class ErrorTrackerTest extends TestCase
{
    public function testErrorTracking(): void
    {
        $config = new ClientConfig(
            webhookUrl: 'https://test.example.com/webhook',
            licenseId: 'test-license',
            licenseDevice: 'test-device'
        );
        
        $client = Tracker::create($config);
        
        $error = new Exception('Test error');
        $client->error($error, EventLevel::ERROR);
        
        $client->forceFlush();
        $client->shutdown();
        
        $this->assertTrue(true);
    }
}
```

## Environment Variables

```env
ERROR_TRACKER_WEBHOOK_URL=https://api.example.com/webhook
ERROR_TRACKER_LICENSE_ID=your-license-id
ERROR_TRACKER_DEVICE=production-server-01
ERROR_TRACKER_ENABLED=true
```

## License

MIT
