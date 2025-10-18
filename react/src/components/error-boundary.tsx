import { Component, type ReactNode, type ErrorInfo } from 'react';
import type { ErrorTrackerClient } from '@royaltics/tracker';

interface ErrorBoundaryProps {
  readonly client: ErrorTrackerClient;
  readonly fallback?: ReactNode | ((error: Error) => ReactNode);
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const normalizedError = error instanceof Error
      ? error
      : new Error(String(error ?? 'Unknown error'));
    return { hasError: true, error: normalizedError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    try {
      const normalizedError = error instanceof Error
        ? error
        : new Error(String(error ?? 'Unknown error'));
      this.props.client.error(normalizedError, 'ERROR', {
        componentStack: errorInfo.componentStack,
        source: 'ErrorBoundary',
      });
    } catch (clientError) {
      console.error('Failed to track error:', clientError);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error)
          : this.props.fallback;
      }

      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <p>{this.state.error.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
