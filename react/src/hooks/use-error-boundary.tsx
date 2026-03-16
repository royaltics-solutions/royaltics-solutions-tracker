import { useCallback } from 'react';
import { useErrorTrackerContext } from '../context/tracker-context';
import { ErrorBoundary } from '../components/error-boundary';
import type { UseErrorBoundaryReturn } from '../types';

export const useErrorBoundary = (): UseErrorBoundaryReturn => {
  const client = useErrorTrackerContext();

  const account = useCallback((entity: any, entity_id?: string) => {
    return client.account(entity, entity_id as any);
  }, [client]);

  return {
    ErrorBoundary,
    account,
  };
};
