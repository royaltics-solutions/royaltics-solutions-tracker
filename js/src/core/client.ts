// src/core/client.ts
import type {
  EventIssueInterface,
  ClientConfig,
  EventLevel,
  IErrorTrackerClient,
  AccountService,
} from '../types';
import { EventBuilder } from './event-builder';
import { Transport } from './transport';
import { compressAndEncode } from '../utils/compression';
import { ConfigValidator } from '../types/config-validator';
import {
  DEFAULT_ENABLED,
  DEFAULT_FLUSH_INTERVAL,
  DEFAULT_MAX_QUEUE_SIZE,
  DEFAULT_THROTTLE_INTERVAL,
  DEFAULT_DEDUPLICATION_INTERVAL,
  DEFAULT_DEDUPLICATE,
  DEFAULT_MAX_RETRIES,
} from '../constants';

export class ErrorTrackerClient implements IErrorTrackerClient {
  private readonly config: ClientConfig;
  private readonly eventBuilder: EventBuilder;
  private readonly transport: Transport;
  private readonly flushInterval: number;
  private readonly maxQueueSize: number;
  private readonly throttleInterval: number;
  private readonly deduplicationInterval: number;
  private readonly deduplicate: boolean;
  private readonly maxRetries: number;
  
  private isActive = false;
  private isEnabled: boolean;
  private eventQueue: EventIssueInterface[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isProcessing = false;
  private fingerprintCache = new Map<string, number>();

  constructor(config: Partial<ClientConfig>) {
    ConfigValidator.validate(config);
    const sanitizedConfig = ConfigValidator.sanitize(config as ClientConfig);

    this.config = sanitizedConfig;
    this.isEnabled = sanitizedConfig.enabled ?? DEFAULT_ENABLED;
    this.flushInterval = sanitizedConfig.flushInterval ?? DEFAULT_FLUSH_INTERVAL;
    this.maxQueueSize = sanitizedConfig.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
    this.throttleInterval = sanitizedConfig.throttleInterval ?? DEFAULT_THROTTLE_INTERVAL;
    this.deduplicationInterval = sanitizedConfig.deduplicationInterval ?? DEFAULT_DEDUPLICATION_INTERVAL;
    this.deduplicate = sanitizedConfig.deduplicate ?? DEFAULT_DEDUPLICATE;
    this.maxRetries = sanitizedConfig.maxRetries ?? DEFAULT_MAX_RETRIES;

    this.eventBuilder = new EventBuilder({
      app_name: sanitizedConfig.app_name,
      app_version: sanitizedConfig.app_version,
      platform: sanitizedConfig.platform,
      device: sanitizedConfig.device,
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

  account(account: AccountService): this;
  account(entity: string, entity_id: string): this;
  account(accountOrEntity: AccountService | string, entity_id?: string): this {
    if (typeof accountOrEntity === 'string') {
      this.eventBuilder.account(accountOrEntity, entity_id as string);
    } else {
      this.eventBuilder.account(accountOrEntity);
    }
    return this;
  }

  private attachErrorHandlers(): void {
    const isNode = typeof process !== 'undefined' && process.versions?.node;

    if (isNode) {
      this.attachNodeErrorHandlers();
    } else {
      this.attachBrowserErrorHandlers();
    }
  }

  private attachNodeErrorHandlers(): void {
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

  private attachBrowserErrorHandlers(): void {
    const errorHandler = (event: ErrorEvent): void => {
      event.preventDefault();
      const error = event.error || new Error(event.message);
      if (this.config.debug) console.error('Uncaught error:', error);
      this.error(error, 'FATAL', { source: 'uncaughtException' });
    };

    const unhandledRejectionHandler = (event: PromiseRejectionEvent): void => {
      event.preventDefault();
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      if (this.config.debug) console.error('Unhandled rejection:', event.reason);
      this.error(error, 'ERROR', { source: 'unhandledRejection' });
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  }

  private startBatchProcessor(): void {
    this.flushTimer = setInterval(() => {
      this.processQueue().catch(() => { });
    }, this.flushInterval);

    if (this.flushTimer && (this.flushTimer as any).unref) {
      (this.flushTimer as any).unref();
    }
  }

  error(error: Error | Record<string, unknown>, level?: EventLevel, metadata?: Record<string, unknown>): this {
    if (!this.isEnabled) {
      return this;
    }

    try {
      const title = this.extractErrorMessage(error);
      const event = this.eventBuilder.build(title, error, level, metadata);
      
      if (this.isDuplicate(event)) {
        return this;
      }

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
      
      if (this.isDuplicate(event)) {
        return this;
      }

      this.enqueue(event);
    } catch (err) {
      this.handleInternalError('Failed to track event', err);
    }

    return this;
  }

  private isDuplicate(event: EventIssueInterface): boolean {
    if (!this.deduplicate) return false;

    const fingerprint = this.generateFingerprint(event);
    const now = Date.now();
    const lastSeen = this.fingerprintCache.get(fingerprint);

    if (lastSeen && (now - lastSeen) < this.deduplicationInterval) {
      return true;
    }

    this.fingerprintCache.set(fingerprint, now);
    
    // Cleanup old entries occasionally
    if (this.fingerprintCache.size > 1000) {
      for (const [key, time] of this.fingerprintCache.entries()) {
        if (now - time > this.deduplicationInterval) {
          this.fingerprintCache.delete(key);
        }
      }
    }

    return false;
  }

  private generateFingerprint(event: EventIssueInterface): string {
    const culprit = event.context.culprit || 'unknown';
    const message = (event.event as any).message || '';
    return `${event.title}:${message}:${culprit}`;
  }

  private enqueue(event: EventIssueInterface): void {
    this.eventQueue.push(event);

    if (this.eventQueue.length >= this.maxQueueSize) {
      this.processQueue().catch(() => { });
    }
  }

  private async processQueue(): Promise<void> {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue[0]; // Peek
        let success = false;
        let lastError: any = null;

        // Try up to maxRetries + 1 (initial try + retries)
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
          try {
            await this.dispatchEvent(event);
            success = true;
            break;
          } catch (err) {
            lastError = err;
            if (attempt < this.maxRetries) {
               // Wait before retry
               await this.delay(this.throttleInterval);
            }
          }
        }

        if (!success) {
          const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
          console.error(`[ErrorTracker] Failed to dispatch event after ${this.maxRetries + 1} attempts. Event: "${event.title}". Reason: ${errorMessage}. This event will be ignored to prevent queue congestion.`);
        }

        // Remove the processed (or failed) event from the queue
        this.eventQueue.shift();

        // Strict wait before next event in queue
        if (this.eventQueue.length > 0) {
          await this.delay(this.throttleInterval);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchEvent(event: EventIssueInterface): Promise<void> {
    try {
      const eventString = this.eventBuilder.stringify(event);
      const compressed = await compressAndEncode(eventString);
      await this.transport.send(compressed);
    } catch (err) {
      throw err;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async forceFlush(): Promise<void> {
    while (this.eventQueue.length > 0) {
      await this.processQueue();
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