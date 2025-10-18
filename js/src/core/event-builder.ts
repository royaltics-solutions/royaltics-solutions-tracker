import { randomUUID } from 'crypto';
import type {
  EventIssueInterface,
  EventLevel,
  SerializedError,
  IEventBuilder,
} from '../types';
import { safeStringify } from '../utils/json';

interface EventBuilderConfig {
  readonly app?: string;
  readonly version?: string;
  readonly platform?: string;
  readonly device?: string;
}

export class EventBuilder implements IEventBuilder {
  private readonly config: EventBuilderConfig;

  constructor(config: EventBuilderConfig) {
    this.config = config;
  }

  build(
    title: string,
    error: Error | Record<string, unknown>,
    level: EventLevel = 'ERROR',
    extra?: Record<string, unknown>
  ): EventIssueInterface {
    const culprit = this.extractCulprit(error);

    return {
      event_id: randomUUID(),
      title,
      level,
      event: this.serializeError(error),
      timestamp: new Date().toISOString(),
      context: {
        culprit,
        extra,
        platform: this.config.platform ?? process.platform,
        app: this.config.app,
        version: this.config.version,
        device: this.config.device ?? process.env.HOSTNAME ?? 'unknown',
        tags: this.extractTags(error),
      },
    };
  }

  private extractCulprit(error: Error | Record<string, unknown>): string {
    if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split('\n');
      const callerLine = stackLines[1]?.trim();

      if (callerLine) {
        const match = callerLine.match(/at\s+(.+?)\s+\(/);
        if (match?.[1]) {
          return match[1];
        }
      }
    }

    if (error instanceof Error) {
      return error.constructor.name;
    }

    return 'Unknown';
  }

  private serializeError(
    error: Error | Record<string, unknown>
  ): SerializedError | Record<string, unknown> {
    if (error instanceof Error) {
      const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      Object.getOwnPropertyNames(error).forEach((key) => {
        if (!['name', 'message', 'stack'].includes(key)) {
          serialized[key] = (error as unknown as Record<string, unknown>)[key];
        }
      });

      return serialized as SerializedError;
    }

    return error;
  }

  private extractTags(error: Error | Record<string, unknown>): readonly string[] {
    const tags: string[] = [];

    if (error instanceof Error) {
      tags.push(`error:${error.name}`);
      const errorWithCode = error as Error & { code?: string };
      if (errorWithCode.code) {
        tags.push(`code:${errorWithCode.code}`);
      }
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      if (typeof errorObj.name === 'string') {
        tags.push(`error:${errorObj.name}`);
      }
      if (typeof errorObj.code === 'string') {
        tags.push(`code:${errorObj.code}`);
      }
    }

    return tags;
  }

  stringify(event: EventIssueInterface): string {
    return safeStringify(event);
  }
}