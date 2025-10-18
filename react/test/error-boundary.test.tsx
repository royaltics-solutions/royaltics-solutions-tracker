import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/error-boundary';
import type { ErrorTrackerClient } from '@royaltics/tracker';
import { afterEach } from 'node:test';

describe('ErrorBoundary', () => {
  let mockClient: ErrorTrackerClient;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      error: vi.fn().mockReturnThis(),
      event: vi.fn().mockReturnThis(),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn(),
      pause: vi.fn().mockReturnThis(),
      resume: vi.fn().mockReturnThis(),
    } as any;

    // Suppress console.error for cleaner test output
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  const ThrowError = ({ message = 'Test error' }: { message?: string }) => {
    throw new Error(message);
  };

  describe('Error Catching', () => {
    it('should catch errors from children', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should track error with ERROR level', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message="Component error" />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalledWith(
        expect.any(Error),
        'ERROR',
        expect.objectContaining({
          source: 'ErrorBoundary',
        })
      );
    });

    it('should include component stack in metadata', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalledWith(
        expect.any(Error),
        'ERROR',
        expect.objectContaining({
          componentStack: expect.any(String),
          source: 'ErrorBoundary',
        })
      );
    });

    it('should track the actual error object', () => {
      const errorMessage = 'Specific error message';

      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message={errorMessage} />
        </ErrorBoundary>
      );

      const errorArg = (mockClient.error as any).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe(errorMessage);
    });
  });

  describe('Default Fallback UI', () => {
    it('should render default fallback when error occurs', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message="Display error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Display error')).toBeInTheDocument();
    });

    it('should display error message in fallback', () => {
      const errorMessage = 'Custom error message';

      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message={errorMessage} />
        </ErrorBoundary>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should have proper styling for default fallback', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError />
        </ErrorBoundary>
      );

      const fallbackDiv = screen.getByText('Something went wrong').parentElement;
      expect(fallbackDiv).toHaveStyle({
        padding: '20px',
        textAlign: 'center',
      });
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback element', () => {
      const customFallback = <div>Custom Error UI</div>;

      render(
        <ErrorBoundary client={mockClient} fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should render custom fallback function', () => {
      const fallbackFn = (error: Error) => (
        <div>
          <h2>Error Occurred</h2>
          <p>Message: {error.message}</p>
        </div>
      );

      render(
        <ErrorBoundary client={mockClient} fallback={fallbackFn}>
          <ThrowError message="Function fallback error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Occurred')).toBeInTheDocument();
      expect(screen.getByText('Message: Function fallback error')).toBeInTheDocument();
    });

    it('should pass error to fallback function', () => {
      const fallbackFn = vi.fn((error: Error) => <div>{error.message}</div>);

      render(
        <ErrorBoundary client={mockClient} fallback={fallbackFn}>
          <ThrowError message="Test message" />
        </ErrorBoundary>
      );

      expect(fallbackFn).toHaveBeenCalledWith(expect.any(Error));
      expect(fallbackFn.mock.calls[0][0].message).toBe('Test message');
    });

    it('should render complex custom fallback', () => {
      const customFallback = (
        <div>
          <h1>Application Error</h1>
          <button>Retry</button>
          <button>Go Home</button>
        </div>
      );

      render(
        <ErrorBoundary client={mockClient} fallback={customFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <div>Normal Content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal Content')).toBeInTheDocument();
      expect(mockClient.error).not.toHaveBeenCalled();
    });

    it('should render multiple children', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const NestedComponent = () => <span>Nested</span>;

      render(
        <ErrorBoundary client={mockClient}>
          <div>
            Parent
            <NestedComponent />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Nested')).toBeInTheDocument();
    });
  });

  describe('Error State Management', () => {
    it('should set hasError state to true when error occurs', () => {
      const { container } = render(
        <ErrorBoundary client={mockClient}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Fallback is rendered, meaning hasError is true
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should store error in state', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message="Stored error" />
        </ErrorBoundary>
      );

      // Error message is displayed, meaning error is stored
      expect(screen.getByText('Stored error')).toBeInTheDocument();
    });
  });

  describe('Multiple Errors', () => {
    it('should handle errors from different children', () => {
      const Child1 = () => {
        throw new Error('Error from Child 1');
      };

      render(
        <ErrorBoundary client={mockClient}>
          <Child1 />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Error from Child 1')).toBeInTheDocument();
    });

    it('should only catch the first error', () => {
      // ErrorBoundary catches the first error and stops rendering
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message="First error" />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Nested ErrorBoundaries', () => {
    it('should support nested error boundaries', () => {
      const innerClient = {
        ...mockClient,
        error: vi.fn().mockReturnThis(),
      } as any;

      render(
        <ErrorBoundary client={mockClient}>
          <div>Outer</div>
          <ErrorBoundary client={innerClient}>
            <ThrowError message="Inner error" />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(innerClient.error).toHaveBeenCalled();
      expect(mockClient.error).not.toHaveBeenCalled();
      expect(screen.getByText('Outer')).toBeInTheDocument();
    });

    it('should propagate to outer boundary if inner fails', () => {
      const innerClient = {
        ...mockClient,
        error: vi.fn().mockImplementation(() => {
          throw new Error('Inner boundary failed');
        }),
      } as any;

      render(
        <ErrorBoundary client={mockClient}>
          <ErrorBoundary client={innerClient}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Both boundaries should be involved
      expect(innerClient.error).toHaveBeenCalled();
    });
  });

  describe('Client Integration', () => {
    it('should call client.error with correct parameters', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message="Client test" />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Client test',
        }),
        'ERROR',
        expect.objectContaining({
          source: 'ErrorBoundary',
          componentStack: expect.any(String),
        })
      );
    });

    it('should handle client errors gracefully', () => {
      const errorClient = {
        ...mockClient,
        error: vi.fn().mockImplementation(() => {
          throw new Error('Client failed');
        }),
      } as any;

      // Should not crash even if client throws
      render(
        <ErrorBoundary client={errorClient}>
          <ThrowError />
        </ErrorBoundary>
      );

      // Verify the fallback is rendered despite client error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(errorClient.error).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null error', () => {
      const ThrowNull = () => {
        throw null;
      };

      render(
        <ErrorBoundary client={mockClient}>
          <ThrowNull />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should handle string errors', () => {
      const ThrowString = () => {
        throw 'String error';
      };

      render(
        <ErrorBoundary client={mockClient}>
          <ThrowString />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should handle errors without message', () => {
      const ThrowNoMessage = () => {
        const error = new Error();
        error.message = '';
        throw error;
      };

      render(
        <ErrorBoundary client={mockClient}>
          <ThrowNoMessage />
        </ErrorBoundary>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should call componentDidCatch', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError />
        </ErrorBoundary>
      );

      // componentDidCatch is called, which calls client.error
      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should call getDerivedStateFromError', () => {
      render(
        <ErrorBoundary client={mockClient}>
          <ThrowError message="State update" />
        </ErrorBoundary>
      );

      // State is updated, fallback is rendered
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('State update')).toBeInTheDocument();
    });
  });
});
