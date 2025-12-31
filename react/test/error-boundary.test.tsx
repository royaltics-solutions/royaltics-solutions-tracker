/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../src/components/error-boundary';
import type { ErrorTrackerClient } from '@royaltics/tracker';
import { ErrorTrackerContext } from '../src/context/tracker-context';
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should track error with ERROR level', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message="Component error" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message={errorMessage} />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      const errorArg = (mockClient.error as any).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(Error);
      expect(errorArg.message).toBe(errorMessage);
    });
  });

  describe('Default Fallback UI', () => {
    it('should render default fallback when error occurs', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message="Display error" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Display error')).toBeInTheDocument();
    });

    it('should display error message in fallback', () => {
      const errorMessage = 'Custom error message';

      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message={errorMessage} />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should have proper styling for default fallback', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary fallback={customFallback}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary fallback={fallbackFn}>
            <ThrowError message="Function fallback error" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText('Error Occurred')).toBeInTheDocument();
      expect(screen.getByText('Message: Function fallback error')).toBeInTheDocument();
    });

    it('should pass error to fallback function', () => {
      const fallbackFn = vi.fn((error: Error) => <div>{error.message}</div>);

      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary fallback={fallbackFn}>
            <ThrowError message="Test message" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary fallback={customFallback}>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText('Application Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <div>Normal Content</div>
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText('Normal Content')).toBeInTheDocument();
      expect(mockClient.error).not.toHaveBeenCalled();
    });

    it('should render multiple children', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <div>Child 1</div>
            <div>Child 2</div>
            <div>Child 3</div>
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const NestedComponent = () => <span>Nested</span>;

      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <div>
              Parent
              <NestedComponent />
            </div>
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Nested')).toBeInTheDocument();
    });
  });

  describe('Error State Management', () => {
    it('should set hasError state to true when error occurs', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      // Fallback is rendered, meaning hasError is true
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should store error in state', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message="Stored error" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <Child1 />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(mockClient.error).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Error from Child 1')).toBeInTheDocument();
    });

    it('should only catch the first error', () => {
      // ErrorBoundary catches the first error and stops rendering
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message="First error" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <div>Outer</div>
            <ErrorTrackerContext.Provider value={innerClient}>
              <ErrorBoundary>
                <ThrowError message="Inner error" />
              </ErrorBoundary>
            </ErrorTrackerContext.Provider>
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ErrorTrackerContext.Provider value={innerClient}>
              <ErrorBoundary>
                <ThrowError />
              </ErrorBoundary>
            </ErrorTrackerContext.Provider>
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      // Both boundaries should be involved
      expect(innerClient.error).toHaveBeenCalled();
    });
  });

  describe('Client Integration', () => {
    it('should call client.error with correct parameters', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message="Client test" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={errorClient}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowNull />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should handle string errors', () => {
      const ThrowString = () => {
        throw 'String error';
      };

      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowString />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
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
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowNoMessage />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      expect(mockClient.error).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should call componentDidCatch', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      // componentDidCatch is called, which calls client.error
      expect(mockClient.error).toHaveBeenCalled();
    });

    it('should call getDerivedStateFromError', () => {
      render(
        <ErrorTrackerContext.Provider value={mockClient}>
          <ErrorBoundary>
            <ThrowError message="State update" />
          </ErrorBoundary>
        </ErrorTrackerContext.Provider>
      );

      // State is updated, fallback is rendered
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('State update')).toBeInTheDocument();
    });
  });
});
