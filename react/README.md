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
  const { trackError, trackEvent } = useErrorTracker();

  const handleClick = async () => {
    try {
      await someAsyncOperation();
      trackEvent('Button clicked', 'INFO', { buttonId: 'submit' });
    } catch (error) {
      trackError(error, 'ERROR', { action: 'handleClick' });
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

Track errors and events from any component:

```tsx
import { useErrorTracker } from '@royaltics/tracker-react';

function UserProfile() {
  const { trackError, trackEvent, flush } = useErrorTracker();

  const loadUserData = async (userId: string) => {
    try {
      const data = await fetchUser(userId);
      trackEvent('User data loaded', 'INFO', { userId });
      return data;
    } catch (error) {
      trackError(error, 'ERROR', {
        userId,
        action: 'loadUserData'
      });
      throw error;
    }
  };

  const handleLogout = async () => {
    trackEvent('User logging out', 'INFO');
    await flush(); // Ensure events are sent before logout
    // ... logout logic
  };

  return <div>...</div>;
}
```

### Error Boundary

Catch React component errors:

```tsx
import { ErrorBoundary } from '@royaltics/tracker-react';

function App() {
  return (
    <ErrorTrackerProvider config={config}>
      <ErrorBoundary
        fallback={(error) => (
          <div>
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
  fallback?: ReactNode | ((error: Error) => ReactNode);
}
```

### useErrorTracker Hook

```typescript
interface UseErrorTrackerReturn {
  trackError: (
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ) => void;
  
  trackEvent: (
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ) => void;
  
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
  const { trackError, trackEvent } = useErrorTracker();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
      trackEvent('User logged in', 'INFO', { email });
    } catch (error) {
      trackError(error, 'WARNING', {
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
  const { trackError } = useErrorTracker();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch((error) => {
        trackError(error, 'ERROR', {
          endpoint: '/api/data',
          timestamp: new Date().toISOString()
        });
      });
  }, [trackError]);

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
