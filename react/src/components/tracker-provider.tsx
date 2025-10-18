import { useEffect, useRef } from 'react';
import { Tracker, type ErrorTrackerClient } from '@royaltics/tracker';
import { ErrorTrackerContext } from '../context/tracker-context';
import type { ErrorTrackerProviderProps } from '../types';

export const ErrorTrackerProvider = ({
  config,
  children,
}: ErrorTrackerProviderProps): JSX.Element => {
  const clientRef = useRef<ErrorTrackerClient | null>(null);

  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = Tracker.create({
        ...config,
        platform: 'react',
        app: 'react-app',
      });
    }

    return () => {
      if (clientRef.current) {
        Tracker.shutdown();
        clientRef.current = null;
      }
    };
  }, [config]);

  if (!clientRef.current) {
    return <>{children}</>;
  }

  return (
    <ErrorTrackerContext.Provider value={clientRef.current}>
      {children}
    </ErrorTrackerContext.Provider>
  );
};
