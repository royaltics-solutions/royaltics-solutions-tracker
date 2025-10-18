# Royaltics Error Tracker

> Production-ready error tracking library available for multiple platforms and languages

## Overview

Royaltics Error Tracker is a comprehensive error tracking and monitoring solution designed to help you track, monitor, and manage errors across your applications. With support for multiple platforms and languages, you can integrate error tracking seamlessly into your tech stack.

## Features

- ✅ **Multi-Platform Support**: Available for JavaScript, TypeScript, PHP, Kotlin, Go, and C#
- ✅ **Framework Integration**: Native support for NestJS, React, Sails.js, Laravel, Symfony, Spring Boot, and more
- ✅ **Automatic Error Capture**: Global error handlers for uncaught exceptions
- ✅ **Event Batching**: Efficient queuing and batch processing
- ✅ **Compression**: GZIP compression + Base64 encoding for minimal payload size
- ✅ **Retry Logic**: Exponential backoff with configurable retries
- ✅ **Type Safety**: Full TypeScript/type support for all platforms
- ✅ **Production Ready**: Input validation, sanitization, and security built-in

## Available Packages

### JavaScript / TypeScript

#### Core Library
```bash
npm install @royaltics/tracker
```
**Use cases**: Node.js applications, Express.js, Fastify, vanilla JavaScript/TypeScript

#### NestJS Module
```bash
npm install @royaltics/tracker-nestjs
```
**Use cases**: NestJS applications with dependency injection, filters, and interceptors

#### React Hooks
```bash
npm install @royaltics/tracker-react
```
**Use cases**: React applications, Next.js, error boundaries, hooks

#### Sails.js Hook
```bash
npm install @royaltics/tracker-sails
```
**Use cases**: Sails.js applications with automatic hook integration

### PHP
```bash
composer require royaltics/tracker-php
```
**Use cases**: Laravel, Symfony, WordPress, vanilla PHP applications

### Kotlin
```kotlin
dependencies {
    implementation("com.royaltics:tracker-kotlin:1.0.0")
}
```
**Use cases**: Spring Boot, Ktor, Android applications

### Go
```bash
go get github.com/royaltics/tracker-go
```
**Use cases**: Go applications, Gin, Echo, standard HTTP servers

### C#
```bash
dotnet add package Royaltics.ErrorTracker
```
**Use cases**: ASP.NET Core, .NET applications, console applications

## Quick Start

### JavaScript/TypeScript (Node.js)

```typescript
import Tracker from '@royaltics/tracker';

// Initialize
Tracker.create({
  webhookUrl: 'https://api.example.com/webhook',
  licenseId: 'your-license-id',
  licenseDevice: 'server-01',
  app: 'my-app',
  version: '1.0.0'
});

// Track errors
try {
  // Your code
} catch (error) {
  Tracker.error(error, 'ERROR', { userId: '123' });
}

// Track events
Tracker.event('User logged in', 'INFO', { userId: '123' });
```

### PHP

```php
<?php
use Royaltics\ErrorTracker\Tracker;
use Royaltics\ErrorTracker\Types\ClientConfig;
use Royaltics\ErrorTracker\Types\EventLevel;

$config = new ClientConfig(
    webhookUrl: 'https://api.example.com/webhook',
    licenseId: 'your-license-id',
    licenseDevice: 'server-01'
);

Tracker::create($config);

try {
    // Your code
} catch (Throwable $e) {
    Tracker::error($e, EventLevel::ERROR, ['userId' => '123']);
}
```

### Kotlin

```kotlin
import com.royaltics.errortracker.Tracker
import com.royaltics.errortracker.types.ClientConfig
import com.royaltics.errortracker.types.EventLevel

val config = ClientConfig(
    webhookUrl = "https://api.example.com/webhook",
    licenseId = "your-license-id",
    licenseDevice = "server-01"
)

Tracker.create(config)

try {
    // Your code
} catch (e: Exception) {
    Tracker.error(e, EventLevel.ERROR, mapOf("userId" to "123"))
}
```

### Go

```go
import (
    errortracker "github.com/royaltics/tracker-go"
    "github.com/royaltics/tracker-go/types"
)

config := &types.ClientConfig{
    WebhookURL:    "https://api.example.com/webhook",
    LicenseID:     "your-license-id",
    LicenseDevice: "server-01",
}

errortracker.Create(config)

if err := someOperation(); err != nil {
    errortracker.Error(err, types.LevelError, map[string]string{
        "userId": "123",
    })
}
```

### C#

```csharp
using Royaltics.ErrorTracker;
using Royaltics.ErrorTracker.Types;

var config = new ClientConfig
{
    WebhookUrl = "https://api.example.com/webhook",
    LicenseId = "your-license-id",
    LicenseDevice = "server-01"
};

Tracker.Create(config);

try
{
    // Your code
}
catch (Exception ex)
{
    Tracker.Error(ex, EventLevel.ERROR, new Dictionary<string, string>
    {
        ["userId"] = "123"
    });
}
```

## Webhook Server Example (Express.js)

Example backend server to receive and process error tracking events:

```typescript
import express from 'express';
import { createServer } from 'http';
import { gunzipSync } from 'zlib';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  try {
    const { event, license_id, license_name, license_device } = req.body;
    
    // Validate payload
    if (!event || !license_id || !license_device) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Decode and decompress event
    const compressedBuffer = Buffer.from(event, 'base64');
    const decompressed = gunzipSync(compressedBuffer);
    const eventData = JSON.parse(decompressed.toString('utf-8'));
    
    // Process event
    console.log('Received event:', {
      eventId: eventData.event_id,
      title: eventData.title,
      level: eventData.level,
      timestamp: eventData.timestamp,
      license: {
        id: license_id,
        name: license_name,
        device: license_device
      },
      error: {
        name: eventData.event.name,
        message: eventData.event.message,
        stack: eventData.event.stack
      },
      context: eventData.context
    });
    
    // Store in database, send alerts, etc.
    // await saveToDatabase(eventData);
    // await sendAlert(eventData);
    
    res.status(200).json({ success: true, eventId: eventData.event_id });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const server = createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### Event Payload Structure

The decompressed event has the following structure:

```typescript
{
  event_id: string;        // UUID v4
  title: string;           // Error message or event title
  level: string;           // DEBUG | INFO | WARNING | ERROR | FATAL
  timestamp: string;       // ISO 8601 timestamp
  event: {
    name: string;          // Error class name
    message: string;       // Error message
    stack: string;         // Stack trace
    extra: object | null;  // Additional error data
  },
  context: {
    culprit: string;       // Function/method that threw
    extra: object | null;  // Custom metadata
    platform: string;      // OS platform
    app: string | null;    // App name
    version: string | null;// App version
    device: string;        // Device identifier
    tags: string[];        // Auto-generated tags
  }
}
```

## Documentation

Each platform has its own detailed documentation:

- [JavaScript/TypeScript Core](./js/README.md)
- [NestJS Module](./nestjs/README.md)
- [React Hooks](./react/README.md)
- [Sails.js Hook](./sails/README.md)
- [PHP Client](./php/README.md)
- [Kotlin Client](./kotlin/README.md)
- [Go Client](./go/README.md)
- [C# Client](./csharp/README.md)

## Configuration

All clients share similar configuration options:

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `webhookUrl` | `string` | ✅ | HTTP/HTTPS webhook URL |
| `licenseId` | `string` | ✅ | Your license ID |
| `licenseDevice` | `string` | ✅ | Device identifier |
| `licenseName` | `string` | ❌ | License name |
| `app` | `string` | ❌ | Application name |
| `version` | `string` | ❌ | Application version |
| `enabled` | `boolean` | ❌ | Enable/disable tracking (default: `true`) |
| `maxRetries` | `number` | ❌ | Max retry attempts (default: `3`) |
| `timeout` | `number` | ❌ | Request timeout in ms (default: `10000`) |
| `flushInterval` | `number` | ❌ | Batch flush interval in ms (default: `5000`) |
| `maxQueueSize` | `number` | ❌ | Max events before auto-flush (default: `50`) |

## Event Levels

All platforms support the following event levels:

- `DEBUG` - Debug information
- `INFO` - Informational messages
- `WARNING` - Warning messages
- `ERROR` - Error messages
- `FATAL` - Fatal errors

## Architecture

```
┌─────────────────┐
│  Application    │
│  (Any Platform) │
└────────┬────────┘
         │
         │ Track Error/Event
         ▼
┌─────────────────┐
│ Error Tracker   │
│ Client Library  │
└────────┬────────┘
         │
         │ Queue & Batch
         ▼
┌─────────────────┐
│  Compression    │
│  (GZIP+Base64)  │
└────────┬────────┘
         │
         │ HTTP POST
         ▼
┌─────────────────┐
│ Webhook Server  │
│  (Your Backend) │
└────────┬────────┘
         │
         │ Process & Store
         ▼
┌─────────────────┐
│   Database /    │
│  Alert System   │
└─────────────────┘
```

## Features by Platform

| Feature | JS/TS | PHP | Kotlin | Go | C# |
|---------|-------|-----|--------|----|----|
| Error Tracking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Event Tracking | ✅ | ✅ | ✅ | ✅ | ✅ |
| Automatic Batching | ✅ | ✅ | ✅ | ✅ | ✅ |
| Compression | ✅ | ✅ | ✅ | ✅ | ✅ |
| Retry Logic | ✅ | ✅ | ✅ | ✅ | ✅ |
| Global Error Handlers | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multiple Instances | ✅ | ✅ | ✅ | ✅ | ✅ |
| Type Safety | ✅ | ✅ | ✅ | ✅ | ✅ |
| Async Support | ✅ | ❌ | ✅ | ✅ | ✅ |

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:
- GitHub Issues: [https://github.com/royaltics-solutions/royaltics-solutions-tracker/issues](https://github.com/royaltics-solutions/royaltics-solutions-tracker/issues)
- Documentation: See platform-specific README files
- Email: support@royaltics.com

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.


## Author

@royaltics-solutions <packages.support@royaltics.com> [https://github.com/royaltics-solutions/](https://github.com/royaltics-solutions/)