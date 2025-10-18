import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { Tracker, type ErrorTrackerClient, type EventLevel } from '@royaltics/tracker';
import { ERROR_TRACKER_OPTIONS } from './constants';
import type { ErrorTrackerModuleOptions } from './types';

@Injectable()
export class ErrorTrackerService implements OnModuleDestroy {
  private readonly client: ErrorTrackerClient;

  constructor(
    @Inject(ERROR_TRACKER_OPTIONS)
    private readonly options: ErrorTrackerModuleOptions
  ) {
    this.client = Tracker.create({
      ...this.options,
      platform: 'nestjs',
      app: 'nestjs-app',
    });
  }

  error(
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.error(error, 'ERROR', metadata);
  }

  fatal(
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.error(error, 'FATAL', metadata);
  }

  debug(
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.error(error, 'DEBUG', metadata);
  }

  capture(
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.error(error, level, metadata);
  }

  info(
    title: string,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.event(title, 'INFO', metadata);
  }

  warn(
    title: string,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.event(title, 'WARNING', metadata);
  }

  event(
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient {
    return this.client.event(title, level, metadata);
  }

  async flush(): Promise<void> {
    await this.client.forceFlush();
  }

  pause(): ErrorTrackerClient {
    return this.client.pause();
  }

  resume(): ErrorTrackerClient {
    return this.client.resume();
  }

  onModuleDestroy(): void {
    this.client.shutdown();
  }
}
