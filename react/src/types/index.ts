import type { ClientConfig, EventLevel, AccountService, ErrorTrackerClient } from '@royaltics/tracker';
import type { ReactNode } from 'react';
import type { ErrorBoundary } from '../components/error-boundary';

export interface ErrorTrackerProviderProps {
  readonly config: Omit<ClientConfig, 'platform'>;
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
  readonly account: {
    (account: AccountService): ErrorTrackerClient;
    (entity: string, entity_id: string): ErrorTrackerClient;
  };
  readonly flush: () => Promise<void>;
}

export interface UseErrorBoundaryReturn {
  readonly ErrorBoundary: typeof ErrorBoundary;
  readonly account: {
    (account: AccountService): ErrorTrackerClient;
    (entity: string, entity_id: string): ErrorTrackerClient;
  };
}
