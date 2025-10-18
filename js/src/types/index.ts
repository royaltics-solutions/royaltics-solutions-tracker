// src/types/index.ts
export type EventLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'FATAL';

export interface EventContext {
  readonly culprit: string;
  readonly extra?: Record<string, unknown>;
  readonly platform?: string;
  readonly app?: string;
  readonly version?: string;
  readonly device?: string;
  readonly tags?: readonly string[];
}

export interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly [key: string]: unknown;
}

export interface EventIssueInterface {
  readonly event_id: string;
  readonly title: string;
  readonly level: EventLevel;
  readonly event: SerializedError | Record<string, unknown>;
  readonly context: EventContext;
  readonly timestamp: string;
}

export interface ClientConfig {
  readonly debug?: boolean;
  readonly webhookUrl: string;
  readonly licenseId: string;
  readonly licenseName?: string;
  readonly licenseDevice: string;
  readonly app?: string;
  readonly version?: string;
  readonly platform?: string;
  readonly enabled?: boolean;
  readonly maxRetries?: number;
  readonly timeout?: number;
  readonly flushInterval?: number;
  readonly maxQueueSize?: number;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface TransportPayload {
  readonly event: string;
  readonly license_id: string;
  readonly license_name?: string;
  readonly license_device: string;
}

export interface ITransport {
  send(compressedEvent: string): Promise<void>;
}

export interface IEventBuilder {
  build(
    title: string,
    error: Error | Record<string, unknown>,
    level: EventLevel,
    extra?: Record<string, unknown>
  ): EventIssueInterface;
  stringify(event: EventIssueInterface): string;
}

export interface IErrorTrackerClient {
  start(): this;
  error(
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): this;
  event(
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): this;
  forceFlush(): Promise<void>;
  pause(): this;
  resume(): this;
  shutdown(): void;
}