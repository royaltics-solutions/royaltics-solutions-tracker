# Royaltics Error Tracker

## Overview

The Royaltics Error Tracker is a JavaScript library designed to track and report errors in your application. It provides a simple and efficient way to monitor and manage errors, allowing you to focus on building a better user experience.

> Production-ready error tracking library for Node.js and TypeScript

## Features

- ✅ **TypeScript First**: Full type safety with strict typing
- ✅ **Zero Dependencies**: Core library uses only Node.js built-ins
- ✅ **Automatic Batching**: Efficient event queuing and batch processing
- ✅ **Compression**: GZIP compression + Base64 encoding
- ✅ **Retry Logic**: Exponential backoff with configurable retries
- ✅ **Global Error Handlers**: Automatic capture of uncaught exceptions
- ✅ **Multiple Instances**: Support for named instances
- ✅ **Production Ready**: Input validation, sanitization, and security

## Installation

To install the Royaltics Error Tracker, run the following command in your terminal:

```bash
npm install @royaltics/tracker
```

## Usage

### Creating a Tracker Instance

To create a tracker instance, import the `Tracker` class and call the `create` method, passing in your configuration options:

```javascript
import Tracker from '@royaltics/tracker';

const tracker = Tracker.create({
  webhookUrl: 'https://api.example.com/webhook',
  app_name: 'my-app',
  app_version: '1.0.0'
});

// Set account using an object
Tracker.account({
  entity: 'LICENSE',
  entity_id: 'your-license-id'
});

// Alternative: set account using positional arguments
Tracker.account('LICENSE', 'your-license-id');

// Chaining is also supported
Tracker.account('USER', '456').info('User action after account set');
```

### Tracking Errors

To track an error, call the `Error` method on the tracker instance, passing in the error object:

```javascript
tracker.error(new Error('Test error'));
```

### Tracking Events

To track an event, call the `event` method on the tracker instance, passing in the event name, severity, and optional metadata:

```javascript
tracker.event('User logged in', 'INFO', { userId: 123 });
```

### Multiple Instances

You can create multiple tracker instances with different configurations:

```javascript
const tracker1 = Tracker.create(config1, 'production');
const tracker2 = Tracker.create(config2, 'staging');
```

### Getting a Tracker Instance

To get a tracker instance by name, call the `get` method:

```javascript
const tracker = Tracker.get('production');
```

### Pause and Resume

You can pause and resume the tracker to control the flow of error reporting:

```javascript
tracker.pause();
tracker.resume();
```

### Manual Flush

To manually flush the error queue, call the `flush` method:

```javascript
await tracker.flush();
```

## Configuration Options

The following configuration options are available:

* `webhookUrl`: The URL of the webhook to send error reports to.
* `app_name`: The name of your application.
* `app_version`: The version of your application.
* `debug`: (Optional) Enable debug logging.



## Webhook Server Example

Example Express server to receive and process error tracking events:

```typescript
import express from 'express';
import { createServer } from 'http';
import { gunzipSync } from 'zlib';

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  try {
    const { event } = req.body;
    
    // Validate payload
    if (!event) {
      return res.status(400).json({ error: 'Missing event field' });
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
      account: eventData.account,
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
    [key: string]: any;    // Additional error data
  },
  account: {               // Optional persistent account
    entity: string;
    entity_id: string;
  } | null,
  context: {
    culprit: string;       // Function/method that threw
    extra: object | null;  // Custom metadata
    platform: string;      // OS platform
    app_name: string | null;    // App name
    app_version: string | null; // App version
    device: string;        // Device identifier
    tags: string[];        // Auto-generated tags
  }
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  ClientConfig,
  EventLevel,
  EventIssueInterface,
  EventContext,
  SerializedError,
  TransportPayload
} from '@royaltics/tracker';
```

## Testing

```bash
pnpm test
pnpm test:coverage
```

## Building

```bash
pnpm build
```

## License


MIT

The Royaltics Error Tracker is licensed under the MIT License.