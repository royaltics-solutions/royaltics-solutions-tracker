import { useCallback } from 'react';
import type { EventLevel } from '@royaltics/tracker';
import { useErrorTrackerContext } from '../context/tracker-context';
import type { UseErrorTrackerReturn } from '../types';

export const useErrorTracker = (): UseErrorTrackerReturn => {
  const client = useErrorTrackerContext();

  const error = useCallback(
    (
      error: Error | Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      client.error(error, 'ERROR', metadata);
    },
    [client]
  );

  const fatal = useCallback(
    (
      error: Error | Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      client.error(error, 'FATAL', metadata);
    },
    [client]
  );

  const debug = useCallback(
    (
      error: Error | Record<string, unknown>,
      metadata?: Record<string, unknown>
    ) => {
      client.error(error, 'DEBUG', metadata);
    },
    [client]
  );

  const capture = useCallback(
    (
      error: Error | Record<string, unknown>,
      level?: EventLevel,
      metadata?: Record<string, unknown>
    ) => {
      client.error(error, level, metadata);
    },
    [client]
  );

  const info = useCallback(
    (
      title: string,
      metadata?: Record<string, unknown>
    ) => {
      client.event(title, 'INFO', metadata);
    },
    [client]
  );

  const warn = useCallback(
    (
      title: string,
      metadata?: Record<string, unknown>
    ) => {
      client.event(title, 'WARNING', metadata);
    },
    [client]
  );

  const event = useCallback(
    (
      title: string,
      level?: EventLevel,
      metadata?: Record<string, unknown>
    ) => {
      client.event(title, level, metadata);
    },
    [client]
  );

  const flush = useCallback(async () => {
    await client.forceFlush();
  }, [client]);

  return {
    error,
    fatal,
    debug,
    capture,
    info,
    warn,
    event,
    flush,
  };
};
