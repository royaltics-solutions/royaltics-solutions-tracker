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
      app_name: 'nestjs-app',
    });
  }

  account(account: any, entity_id?: string): this {
    if (typeof account === 'string') {
      this.client.account(account, entity_id as string);
    } else {
      this.client.account(account);
    }
    return this;
  }

  error(
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): this {
    this.client.error(error, 'ERROR', metadata);
    return this;
  }

  fatal(
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): this {
    this.client.error(error, 'FATAL', metadata);
    return this;
  }

  debug(
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): this {
    this.client.error(error, 'DEBUG', metadata);
    return this;
  }

  capture(
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): this {
    this.client.error(error, level, metadata);
    return this;
  }

  info(
    title: string,
    metadata?: Record<string, unknown>
  ): this {
    this.client.event(title, 'INFO', metadata);
    return this;
  }

  warn(
    title: string,
    metadata?: Record<string, unknown>
  ): this {
    this.client.event(title, 'WARNING', metadata);
    return this;
  }

  event(
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): this {
    this.client.event(title, level, metadata);
    return this;
  }

  async flush(): Promise<void> {
    await this.client.forceFlush();
  }

  pause(): this {
    this.client.pause();
    return this;
  }

  resume(): this {
    this.client.resume();
    return this;
  }

  onModuleDestroy(): void {
    this.client.shutdown();
  }
}
