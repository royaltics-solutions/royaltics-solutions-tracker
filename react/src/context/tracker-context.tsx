import { createContext, useContext } from 'react';
import type { ErrorTrackerClient } from '@royaltics/tracker';

export const ErrorTrackerContext = createContext<ErrorTrackerClient | null>(null);

export const useErrorTrackerContext = (): ErrorTrackerClient => {
  const context = useContext(ErrorTrackerContext);

  if (!context) {
    throw new Error('useErrorTrackerContext must be used within ErrorTrackerProvider');
  }

  return context;
};
