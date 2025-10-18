import type { ClientConfig, EventLevel } from '@royaltics/tracker';
import type { ReactNode } from 'react';

export interface ErrorTrackerProviderProps {
  readonly config: Omit<ClientConfig, 'platform' | 'app'>;
  readonly children: ReactNode;
  readonly fallback?: ReactNode | ((error: Error) => ReactNode);
}

export interface UseErrorTrackerReturn {
  readonly error: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => void;
  readonly fatal: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => void;
  readonly debug: (
    error: Error | Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => void;
  readonly capture: (
    error: Error | Record<string, unknown>,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ) => void;
  readonly info: (
    title: string,
    metadata?: Record<string, unknown>
  ) => void;
  readonly warn: (
    title: string,
    metadata?: Record<string, unknown>
  ) => void;
  readonly event: (
    title: string,
    level?: EventLevel,
    metadata?: Record<string, unknown>
  ) => void;
  readonly flush: () => Promise<void>;
}
