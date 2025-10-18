// src/index.ts
export { ErrorTrackerClient } from './core/client';
export type {
  EventIssueInterface,
  ClientConfig,
  TransportPayload,
  EventLevel,
  EventContext,
  SerializedError,
  ITransport,
  IEventBuilder,
  IErrorTrackerClient,
} from './types';
import { ErrorTrackerClient } from './core/client';
import type { ClientConfig, EventLevel } from './types';

class TrackerRegistry {
  private readonly instances: Map<string, ErrorTrackerClient> = new Map();
  private defaultInstance?: ErrorTrackerClient;

  create(config: Partial<ClientConfig>, name?: string): ErrorTrackerClient {
    const client = new ErrorTrackerClient(config);

    if (name) {
      this.instances.set(name, client);
    } else if (!this.defaultInstance) {
      this.defaultInstance = client;
    }

    return client.start();
  }

  get(name?: string): ErrorTrackerClient {
    if (name) {
      const instance = this.instances.get(name);
      if (!instance) {
        throw new Error(`Tracker instance "${name}" not found`);
      }
      return instance;
    }

    if (!this.defaultInstance) {
      throw new Error('No default tracker initialized. Call Tracker.create() first.');
    }

    return this.defaultInstance;
  }

  has(name?: string): boolean {
    return name ? this.instances.has(name) : !!this.defaultInstance;
  }

  shutdownAll(): void {
    this.defaultInstance?.shutdown();
    this.instances.forEach((instance) => {
      instance.shutdown();
    });
    this.instances.clear();
    this.defaultInstance = undefined;
  }
}

const registry = new TrackerRegistry();

export const Tracker = {
  create: (config: Partial<ClientConfig>, name?: string): ErrorTrackerClient =>
    registry.create(config, name),

  get: (name?: string): ErrorTrackerClient => registry.get(name),

  error: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().error(error, 'ERROR', metadata),


  fatal: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().error(error, 'FATAL', metadata),

  debug: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().error(error, 'DEBUG', metadata),

  capture: (
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().error(error, level, metadata),

  info: (
    title: string,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().event(title, 'INFO', metadata),


  warn: (
    title: string,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().event(title, 'WARNING', metadata),


  event: (
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ): ErrorTrackerClient => registry.get().event(title, level, metadata),



  flush: async (): Promise<void> => {
    await registry.get().forceFlush();
  },

  pause: (): ErrorTrackerClient => registry.get().pause(),

  resume: (): ErrorTrackerClient => registry.get().resume(),

  shutdown: (): void => {
    registry.shutdownAll();
  },

  has: (name?: string): boolean => registry.has(name),
};

export default Tracker;