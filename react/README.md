# @royaltics/tracker-react

> React hooks and components for Royaltics Error Tracker

## Features

- ✅ **React Hooks**: `useErrorTracker` and `useErrorBoundary`
- ✅ **Error Boundary**: Catch React component errors
- ✅ **Context Provider**: Global error tracking state
- ✅ **TypeScript Support**: Full type definitions
- ✅ **React 18+**: Compatible with latest React
- ✅ **Zero Config**: Works out of the box

## Installation

```bash
pnpm add @royaltics/tracker-react
# or
npm install @royaltics/tracker-react
# or
yarn add @royaltics/tracker-react
```

## Quick Start

### 1. Wrap Your App

```tsx
import { ErrorTrackerProvider } from '@royaltics/tracker-react';

function App() {
  return (
    <ErrorTrackerProvider
      config={{
        webhookUrl: 'https://api.example.com/webhook',
        licenseId: 'your-license-id',
        licenseDevice: 'browser-client',
        app: 'my-react-app',
        version: '1.0.0'
      }}
    >
      <YourApp />
    </ErrorTrackerProvider>
  );
}
```

### 2. Use the Hook

```tsx
import { useErrorTracker } from '@royaltics/tracker-react';

function MyComponent() {
  const { error, event } = useErrorTracker();

  const handleClick = async () => {
    try {
      await someAsyncOperation();
      event('Button clicked', 'INFO', { buttonId: 'submit' });
    } catch (err) {
      error(err, { action: 'handleClick' });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

## Usage

### ErrorTrackerProvider

Wrap your application with the provider:

```tsx
import { ErrorTrackerProvider } from '@royaltics/tracker-react';

function App() {
  return (
    <ErrorTrackerProvider
      config={{
        webhookUrl: process.env.REACT_APP_ERROR_TRACKER_URL,
        licenseId: process.env.REACT_APP_LICENSE_ID,
        licenseDevice: 'web-app',
        app: 'my-app',
        version: '1.0.0',
        enabled: process.env.NODE_ENV === 'production'
      }}
    >
      <YourApp />
    </ErrorTrackerProvider>
  );
}
```

### useErrorTracker Hook

Track errors and events from any component. The hook provides specialized methods for different severity levels.

```tsx
import { useErrorTracker } from '@royaltics/tracker-react';

function UserProfile() {
  const { error, info, flush } = useErrorTracker();

  const loadUserData = async (userId: string) => {
    try {
      const data = await fetchUser(userId);
      info('User data loaded', { userId });
      return data;
    } catch (err) {
      error(err, {
        userId,
        action: 'loadUserData'
      });
      throw err;
    }
  };

  const handleLogout = async () => {
    info('User logging out');
    await flush(); // Ensure events are sent before logout
    // ... logout logic
  };

  return <div>...</div>;
}
```

### Error Boundary

Catch React component errors and report them to the tracker.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `fallback` | `ReactNode \| ((err: Error) => ReactNode)` | No | UI to display when an error is caught. |
| `children` | `ReactNode` | Yes | The component tree to monitor. |

> [!IMPORTANT]
> `ErrorBoundary` must be placed inside an `ErrorTrackerProvider`. It automatically uses the client provided by the context to report errors.

```tsx
import { ErrorBoundary } from '@royaltics/tracker-react';

function App() {
  return (
    <ErrorTrackerProvider config={config}>
      <ErrorBoundary
        fallback={(error) => (
          <div style={{ padding: '20px' }}>
            <h1>Something went wrong</h1>
            <p>{error.message}</p>
          </div>
        )}
      >
        <YourApp />
      </ErrorBoundary>
    </ErrorTrackerProvider>
  );
}
```

### useErrorBoundary Hook

Create error boundaries programmatically:

```tsx
import { useErrorBoundary } from '@royaltics/tracker-react';

function MyComponent() {
  const { ErrorBoundary } = useErrorBoundary();

  return (
    <ErrorBoundary
      fallback={<div>Error occurred in this section</div>}
    >
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

## API

### ErrorTrackerProvider Props

```typescript
interface ErrorTrackerProviderProps {
  config: {
    webhookUrl: string;
    licenseId: string;
    licenseDevice: string;
    licenseName?: string;
    app?: string;
    version?: string;
    enabled?: boolean;
    maxRetries?: number;
    timeout?: number;
    flushInterval?: number;
    maxQueueSize?: number;
    headers?: Record<string, string>;
  };
  children: ReactNode;
}
```

### ErrorBoundary Props

```typescript
interface ErrorBoundaryProps {
  fallback?: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
}
```

### useErrorTracker Hook

```typescript
interface UseErrorTrackerReturn {
  // Error reporting (severity levels)
  error: (err: Error | Record<string, unknown>, meta?: Record<string, unknown>) => void;
  fatal: (err: Error | Record<string, unknown>, meta?: Record<string, unknown>) => void;
  debug: (err: Error | Record<string, unknown>, meta?: Record<string, unknown>) => void;
  capture: (err: Error | Record<string, unknown>, level?: EventLevel, meta?: Record<string, unknown>) => void;

  // Event reporting
  info: (title: string, meta?: Record<string, unknown>) => void;
  warn: (title: string, meta?: Record<string, unknown>) => void;
  event: (title: string, level?: EventLevel, meta?: Record<string, unknown>) => void;

  // Utils
  flush: () => Promise<void>;
}
```

### Event Levels

```typescript
type EventLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';
```

## Examples

### Track Form Errors

```tsx
function LoginForm() {
  const { error, info } = useErrorTracker();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      info('User logged in', { email });
    } catch (err) {
      error(err, {
        email,
        action: 'login'
      });
      setError('Login failed');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Track API Errors

```tsx
function DataFetcher() {
  const { error } = useErrorTracker();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch((err) => {
        error(err, {
          endpoint: '/api/data',
          timestamp: new Date().toISOString()
        });
      });
  }, [error]);

  return <div>{data}</div>;
}
```

### Nested Error Boundaries

```tsx
function App() {
  return (
    <ErrorTrackerProvider config={config}>
      <ErrorBoundary fallback={<AppError />}>
        <Header />
        
        <ErrorBoundary fallback={<SectionError />}>
          <MainContent />
        </ErrorBoundary>
        
        <ErrorBoundary fallback={<SidebarError />}>
          <Sidebar />
        </ErrorBoundary>
        
        <Footer />
      </ErrorBoundary>
    </ErrorTrackerProvider>
  );
}
```

### Custom Fallback

```tsx
<ErrorBoundary
  fallback={(error) => (
    <div className="error-container">
      <h1>Oops! Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  )}
>
  <YourComponent />
</ErrorBoundary>
```

### Environment-Based Configuration

```tsx
const config = {
  webhookUrl: process.env.REACT_APP_ERROR_TRACKER_URL!,
  licenseId: process.env.REACT_APP_LICENSE_ID!,
  licenseDevice: 'web-client',
  app: 'my-app',
  version: process.env.REACT_APP_VERSION || '1.0.0',
  enabled: process.env.NODE_ENV === 'production',
  headers: {
    'X-App-Environment': process.env.NODE_ENV
  }
};

function App() {
  return (
    <ErrorTrackerProvider config={config}>
      <YourApp />
    </ErrorTrackerProvider>
  );
}
```

## TypeScript

Full TypeScript support:

```typescript
import type {
  ErrorTrackerProviderProps,
  UseErrorTrackerReturn
} from '@royaltics/tracker-react';
```

## Best Practices

1. **Place Provider at Root**: Wrap your entire app with `ErrorTrackerProvider`
2. **Use Error Boundaries**: Protect critical sections with error boundaries
3. **Flush Before Navigation**: Call `flush()` before redirects or page changes
4. **Add Context**: Include relevant metadata with errors
5. **Environment Variables**: Use env vars for configuration
6. **Disable in Development**: Set `enabled: false` in development

## License

MIT
