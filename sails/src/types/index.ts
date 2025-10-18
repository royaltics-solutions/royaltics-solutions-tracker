import type { ClientConfig, ErrorTrackerClient, EventLevel } from '@royaltics/tracker';

export interface SailsTrackerClient {
  readonly error: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly fatal: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly debug: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly capture: (
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly info: (
    title: string,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly warn: (
    title: string,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly event: (
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ) => ErrorTrackerClient;
  readonly flush: () => Promise<void>;
  readonly pause: () => ErrorTrackerClient;
  readonly resume: () => ErrorTrackerClient;
  readonly shutdown: () => void;
}

export interface SailsErrorTrackerConfig extends Omit<ClientConfig, 'platform' | 'app'> {
  readonly captureRoutes?: boolean;
  readonly captureQueries?: boolean;
  readonly captureHeaders?: boolean;
  readonly ignoredRoutes?: readonly string[];
  readonly ignoredErrors?: readonly string[];
}

export interface SailsHookContext {
  readonly sails: {
    readonly config: {
      readonly tracker: SailsErrorTrackerConfig;
    };
    readonly log: {
      error: (message: string, ...args: unknown[]) => void;
      warn: (message: string, ...args: unknown[]) => void;
      info: (message: string, ...args: unknown[]) => void;
    };
    on?: (event: string, handler: (...args: any[]) => void) => void;
    tracker?: SailsTrackerClient;
  };
}

export interface RequestContext {
  readonly method: string;
  readonly url: string;
  readonly ip?: string;
  readonly headers?: Record<string, string>;
  readonly query?: Record<string, unknown>;
  readonly body?: Record<string, unknown>;
}
