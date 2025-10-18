// src/core/client.ts
import type {
  EventIssueInterface,
  ClientConfig,
  EventLevel,
  IErrorTrackerClient,
} from '../types';
import { EventBuilder } from './event-builder';
import { Transport } from './transport';
import { compressAndEncode } from '../utils/compression';
import { ConfigValidator } from '../types/config-validator';
import {
  DEFAULT_ENABLED,
  DEFAULT_FLUSH_INTERVAL,
  DEFAULT_MAX_QUEUE_SIZE,
} from '../constants';

export class ErrorTrackerClient implements IErrorTrackerClient {
  private readonly config: ClientConfig;
  private readonly eventBuilder: EventBuilder;
  private readonly transport: Transport;
  private readonly flushInterval: number;
  private readonly maxQueueSize: number;
  private isActive = false;
  private isEnabled: boolean;
  private eventQueue: EventIssueInterface[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isProcessing = false;

  constructor(config: Partial<ClientConfig>) {
    ConfigValidator.validate(config);
    const sanitizedConfig = ConfigValidator.sanitize(config as ClientConfig);

    this.config = sanitizedConfig;
    this.isEnabled = sanitizedConfig.enabled ?? DEFAULT_ENABLED;
    this.flushInterval = sanitizedConfig.flushInterval ?? DEFAULT_FLUSH_INTERVAL;
    this.maxQueueSize = sanitizedConfig.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;

    this.eventBuilder = new EventBuilder({
      app: sanitizedConfig.app,
      version: sanitizedConfig.version,
      platform: sanitizedConfig.platform,
      device: sanitizedConfig.licenseDevice,
    });

    this.transport = new Transport(sanitizedConfig);
  }

  start(): this {
    if (this.isActive) {
      return this;
    }

    this.attachErrorHandlers();
    this.startBatchProcessor();
    this.isActive = true;
    return this;
  }

  private attachErrorHandlers(): void {
    const uncaughtExceptionHandler = (error: Error): void => {
      if (this.config.debug) console.error(error, 'FATAL', { source: 'uncaughtException' });
      this.error(error, 'FATAL', { source: 'uncaughtException' });
      this.forceFlush()
        .catch(() => { })
        .finally(() => {
          process.exit(1);
        });
    };

    const unhandledRejectionHandler = (reason: unknown): void => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      if (this.config.debug) console.error('Unhandled rejection:', reason);
      this.error(error, 'ERROR', { source: 'unhandledRejection' });
    };

    const warningHandler = (warning: Error): void => {
      if (this.config.debug) console.log(warning, 'WARNING', { source: 'warning' });
      this.error(warning, 'WARNING', { source: 'warning' });
    };

    process.on('uncaughtException', uncaughtExceptionHandler);
    process.on('unhandledRejection', unhandledRejectionHandler);
    process.on('warning', warningHandler);
  }

  private startBatchProcessor(): void {
    this.flushTimer = setInterval(() => {
      this.processBatch().catch(() => { });
    }, this.flushInterval);

    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  error(error: Error | Record<string, unknown>, level?: EventLevel, metadata?: Record<string, unknown>): this {
    if (!this.isEnabled) {
      return this;
    }

    try {
      const title = this.extractErrorMessage(error);
      const event = this.eventBuilder.build(title, error, level, metadata);
      this.enqueue(event);
    } catch (err) {
      this.handleInternalError('Failed to track error', err);
    }

    return this;
  }

  event(title: string, level: EventLevel = 'INFO', metadata?: Record<string, unknown>): this {
    if (!this.isEnabled) {
      return this;
    }

    try {
      const event = this.eventBuilder.build(title, { message: title }, level, metadata);
      this.enqueue(event);
    } catch (err) {
      this.handleInternalError('Failed to track event', err);
    }

    return this;
  }

  private enqueue(event: EventIssueInterface): void {
    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.maxQueueSize) {
      this.processBatch().catch(() => { });
    }
  }

  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.eventQueue.splice(0, this.maxQueueSize);

      await Promise.allSettled(
        batch.map((event) => this.dispatchEvent(event))
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchEvent(event: EventIssueInterface): Promise<void> {
    try {
      const eventString = this.eventBuilder.stringify(event);
      const compressed = compressAndEncode(eventString);
      await this.transport.send(compressed);
    } catch (err) {
      this.handleInternalError('Failed to dispatch event', err);
      throw err;
    }
  }

  async forceFlush(): Promise<void> {
    while (this.eventQueue.length > 0) {
      await this.processBatch();
    }
  }

  pause(): this {
    this.isEnabled = false;
    return this;
  }

  resume(): this {
    this.isEnabled = true;
    return this;
  }

  shutdown(): void {
    this.isEnabled = false;
    this.isActive = false;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.forceFlush().catch(() => { });
  }

  private extractErrorMessage(error: Error | Record<string, unknown>): string {
    if (error instanceof Error) {
      return error.message || 'Unknown error';
    }

    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (typeof errorObj.message === 'string') {
        return errorObj.message;
      }
    }

    return 'Unknown error';
  }

  private handleInternalError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ErrorTracker] ${context}:`, errorMessage);
  }
}