# @royaltics/tracker-nestjs

> NestJS module for Royaltics Error Tracker

## Features

- ✅ **NestJS Module**: Native module integration
- ✅ **Dependency Injection**: Injectable service
- ✅ **Global Exception Filter**: Automatic error capture
- ✅ **HTTP Interceptor**: Request/response tracking
- ✅ **Async Configuration**: Support for ConfigService
- ✅ **TypeScript Support**: Full type definitions

## Installation

```bash
pnpm add @royaltics/tracker-nestjs
# or
npm install @royaltics/tracker-nestjs
# or
yarn add @royaltics/tracker-nestjs
```

## Quick Start

### 1. Import Module

```typescript
import { Module } from '@nestjs/common';
import { ErrorTrackerModule } from '@royaltics/tracker-nestjs';

@Module({
  imports: [
    ErrorTrackerModule.forRoot({
      webhookUrl: 'https://api.example.com/webhook',
      licenseId: 'your-license-id',
      licenseDevice: 'server-01',
      app: 'my-nestjs-app',
      version: '1.0.0'
    })
  ]
})
export class AppModule {}
```

### 2. Use Service

```typescript
import { Injectable } from '@nestjs/common';
import { ErrorTrackerService } from '@royaltics/tracker-nestjs';

@Injectable()
export class UserService {
  constructor(private readonly errorTracker: ErrorTrackerService) {}

  async createUser(data: CreateUserDto) {
    try {
      // Your code
    } catch (error) {
      this.errorTracker.error(error, 'ERROR', {
        userId: data.email,
        action: 'createUser'
      });
      throw error;
    }
  }
}
```

## Configuration

### Synchronous Configuration

```typescript
ErrorTrackerModule.forRoot({
  webhookUrl: process.env.ERROR_TRACKER_WEBHOOK_URL,
  licenseId: process.env.ERROR_TRACKER_LICENSE_ID,
  licenseDevice: process.env.ERROR_TRACKER_DEVICE,
  app: 'my-app',
  version: '1.0.0',
  enabled: true,
  maxRetries: 3,
  timeout: 10000
})
```

### Async Configuration with ConfigService

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ErrorTrackerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        webhookUrl: configService.get('ERROR_TRACKER_WEBHOOK_URL'),
        licenseId: configService.get('ERROR_TRACKER_LICENSE_ID'),
        licenseDevice: configService.get('ERROR_TRACKER_DEVICE'),
        app: 'my-app',
        version: '1.0.0'
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

### Async Configuration with Factory Class

```typescript
import { Injectable } from '@nestjs/common';
import { ErrorTrackerOptionsFactory, ErrorTrackerModuleOptions } from '@royaltics/tracker-nestjs';

@Injectable()
export class ErrorTrackerConfigService implements ErrorTrackerOptionsFactory {
  createErrorTrackerOptions(): ErrorTrackerModuleOptions {
    return {
      webhookUrl: process.env.ERROR_TRACKER_WEBHOOK_URL,
      licenseId: process.env.ERROR_TRACKER_LICENSE_ID,
      licenseDevice: process.env.ERROR_TRACKER_DEVICE
    };
  }
}

@Module({
  imports: [
    ErrorTrackerModule.forRootAsync({
      useClass: ErrorTrackerConfigService
    })
  ]
})
export class AppModule {}
```

## Usage

### Error Tracking Service

```typescript
import { ErrorTrackerService } from '@royaltics/tracker-nestjs';

@Injectable()
export class MyService {
  constructor(private readonly errorTracker: ErrorTrackerService) {}

  async doSomething() {
    try {
      // Your code
    } catch (error) {
      this.errorTracker.error(error, 'ERROR', {
        context: 'doSomething'
      });
    }
  }

  async trackEvent() {
    this.errorTracker.event('User action', 'INFO', {
      userId: '123'
    });
  }
}
```

### Global Exception Filter

```typescript
import { NestFactory } from '@nestjs/core';
import { ErrorTrackerFilter } from '@royaltics/tracker-nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get ErrorTrackerService from DI
  const errorTracker = app.get(ErrorTrackerService);
  
  // Apply global filter
  app.useGlobalFilters(new ErrorTrackerFilter(errorTracker));
  
  await app.listen(3000);
}
bootstrap();
```

### HTTP Interceptor

```typescript
import { NestFactory } from '@nestjs/core';
import { ErrorTrackerInterceptor } from '@royaltics/tracker-nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const errorTracker = app.get(ErrorTrackerService);
  
  // Apply global interceptor
  app.useGlobalInterceptors(new ErrorTrackerInterceptor(errorTracker));
  
  await app.listen(3000);
}
bootstrap();
```

### Controller-Level Usage

```typescript
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ErrorTrackerInterceptor } from '@royaltics/tracker-nestjs';

@Controller('users')
@UseInterceptors(ErrorTrackerInterceptor)
export class UserController {
  @Get()
  findAll() {
    // Automatically tracked
  }
}
```

## API

### ErrorTrackerService

```typescript
class ErrorTrackerService {
  // Track an error
  error(
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient;

  // Track a custom event
  event(
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient;

  // Force flush pending events
  flush(): Promise<void>;

  // Pause tracking
  pause(): ErrorTrackerClient;

  // Resume tracking
  resume(): ErrorTrackerClient;
}
```

### Event Levels

```typescript
type EventLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `webhookUrl` | `string` | **required** | HTTP/HTTPS webhook URL |
| `licenseId` | `string` | **required** | Your license ID |
| `licenseDevice` | `string` | **required** | Device identifier |
| `licenseName` | `string` | `undefined` | License name |
| `app` | `string` | `undefined` | Application name |
| `version` | `string` | `undefined` | Application version |
| `enabled` | `boolean` | `true` | Enable/disable tracking |
| `maxRetries` | `number` | `3` | Max retry attempts (0-10) |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `flushInterval` | `number` | `5000` | Batch flush interval in ms |
| `maxQueueSize` | `number` | `50` | Max events before auto-flush |
| `headers` | `Record<string, string>` | `{}` | Custom HTTP headers |
| `captureRequests` | `boolean` | `false` | Capture all requests |
| `captureResponses` | `boolean` | `false` | Capture all responses |
| `captureHeaders` | `boolean` | `false` | Include request headers |
| `ignoredRoutes` | `string[]` | `[]` | Routes to ignore |
| `ignoredErrors` | `string[]` | `[]` | Errors to ignore |

## Examples

### Environment Variables

```env
ERROR_TRACKER_WEBHOOK_URL=https://api.example.com/webhook
ERROR_TRACKER_LICENSE_ID=your-license-id
ERROR_TRACKER_DEVICE=production-server-01
```

### Complete Setup

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ErrorTrackerService, ErrorTrackerFilter, ErrorTrackerInterceptor } from '@royaltics/tracker-nestjs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const errorTracker = app.get(ErrorTrackerService);
  
  app.useGlobalFilters(new ErrorTrackerFilter(errorTracker));
  app.useGlobalInterceptors(new ErrorTrackerInterceptor(errorTracker));
  
  await app.listen(3000);
}
bootstrap();
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  ErrorTrackerModuleOptions,
  ErrorTrackerModuleAsyncOptions,
  ErrorTrackerOptionsFactory
} from '@royaltics/tracker-nestjs';
```

## License

MIT
