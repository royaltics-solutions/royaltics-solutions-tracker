# @royaltics/tracker-sails

> Sails.js hook for Royaltics Error Tracker

## Features

- ✅ **Sails.js Integration**: Native hook implementation
- ✅ **Automatic Request Tracking**: Capture all HTTP requests
- ✅ **Error Middleware**: Automatic error capture
- ✅ **Route Filtering**: Ignore specific routes
- ✅ **Configurable**: Full control over what gets tracked
- ✅ **TypeScript Support**: Full type definitions

## Installation

```bash
pnpm add @royaltics/tracker-sails
# or
npm install @royaltics/tracker-sails
# or
yarn add @royaltics/tracker-sails
```

## Configuration

Create or update `config/tracker.js`:

```javascript
module.exports.tracker = {
  webhookUrl: process.env.ERROR_TRACKER_WEBHOOK_URL,
  licenseId: process.env.ERROR_TRACKER_LICENSE_ID,
  licenseDevice: process.env.ERROR_TRACKER_DEVICE || 'sails-server',
  licenseName: 'My Company',
  app: 'my-sails-app',
  version: '1.0.0',
  
  // Optional: Capture settings
  captureRoutes: true,
  captureQueries: true,
  captureHeaders: false,
  
  // Optional: Filtering
  ignoredRoutes: [
    '/health',
    '/metrics',
    '^/api/internal/.*'
  ],
  
  ignoredErrors: [
    'ValidationError',
    'NotFoundError'
  ],
  
  // Optional: Advanced settings
  enabled: true,
  maxRetries: 3,
  timeout: 10000,
  flushInterval: 5000,
  maxQueueSize: 50
};
```

## Usage


### Automatic Error Tracking

The hook automatically captures:

- Uncaught exceptions
- Unhandled promise rejections
- Route errors
- Request errors

### Manual Error Tracking

```javascript
// In a controller or service
module.exports = {
  async someAction(req, res) {
    try {
      // Your code
    } catch (error) {
      sails.hooks.tracker.error(error, 'ERROR', {
        userId: req.session.userId,
        action: 'someAction'
      });
      
      return res.serverError(error);
    }
  }
};
```

### Track Custom Events

```javascript
sails.hooks.tracker.event('User registered', 'INFO', {
  userId: user.id,
  email: user.email
});
```

## Configuration Options

### Required

| Option | Type | Description |
|--------|------|-------------|
| `webhookUrl` | `string` | HTTP/HTTPS webhook URL |
| `licenseId` | `string` | Your license ID |
| `licenseDevice` | `string` | Device identifier |

### Optional

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `licenseName` | `string` | `undefined` | License name |
| `app` | `string` | `undefined` | Application name |
| `version` | `string` | `undefined` | Application version |
| `captureRoutes` | `boolean` | `false` | Capture all route requests |
| `captureQueries` | `boolean` | `false` | Include query parameters |
| `captureHeaders` | `boolean` | `false` | Include request headers |
| `ignoredRoutes` | `string[]` | `[]` | Routes to ignore (regex patterns) |
| `ignoredErrors` | `string[]` | `[]` | Errors to ignore (regex patterns) |
| `enabled` | `boolean` | `true` | Enable/disable tracking |
| `maxRetries` | `number` | `3` | Max retry attempts |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `flushInterval` | `number` | `5000` | Batch flush interval in ms |
| `maxQueueSize` | `number` | `50` | Max events before auto-flush |

## Examples

### Environment Variables

```bash
ERROR_TRACKER_WEBHOOK_URL=https://api.example.com/webhook
ERROR_TRACKER_LICENSE_ID=your-license-id
ERROR_TRACKER_DEVICE=production-server-01
```

### Ignore Health Check Routes

```javascript
module.exports.tracker = {
  // ... other config
  ignoredRoutes: [
    '/health',
    '/ping',
    '/metrics',
    '^/api/internal/.*'
  ]
};
```

### Capture Only Errors

```javascript
module.exports.tracker = {
  // ... other config
  captureRoutes: false,  // Don't track successful requests
  captureQueries: true,  // But include query params in errors
  captureHeaders: false  // Don't include headers
};
```

## TypeScript

```typescript
import { SailsErrorTrackerConfig } from '@royaltics/tracker-sails';

const config: SailsErrorTrackerConfig = {
  webhookUrl: 'https://api.example.com/webhook',
  licenseId: 'your-license-id',
  licenseDevice: 'server-01',
  captureRoutes: true
};
```

## License

MIT
