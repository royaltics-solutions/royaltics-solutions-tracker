import { type ReactNode } from 'react';
import { useErrorTrackerContext } from '../context/tracker-context';
import { ErrorBoundary } from '../components/error-boundary';

interface UseErrorBoundaryReturn {
  readonly ErrorBoundary: (props: {
    readonly children: ReactNode;
    readonly fallback?: ReactNode | ((error: Error) => ReactNode);
  }) => JSX.Element;
}

export const useErrorBoundary = (): UseErrorBoundaryReturn => {
  const client = useErrorTrackerContext();

  const BoundaryComponent = ({
    children,
    fallback,
  }: {
    readonly children: ReactNode;
    readonly fallback?: ReactNode | ((error: Error) => ReactNode);
  }): JSX.Element => (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );

  return {
    ErrorBoundary: BoundaryComponent,
  };
};
