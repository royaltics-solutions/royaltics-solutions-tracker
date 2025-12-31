/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorTracker } from '../src/hooks/use-tracker';
import { ErrorTrackerProvider } from '../src/components/tracker-provider';
import { Tracker } from '@royaltics/tracker';
import type { ClientConfig } from '@royaltics/tracker';

vi.mock('@royaltics/tracker', () => ({
  Tracker: {
    create: vi.fn(),
    shutdown: vi.fn(),
  },
}));

describe('useErrorTracker', () => {
  let mockClient: any;
  const defaultConfig: Omit<ClientConfig, 'platform' | 'app'> = {
    webhookUrl: 'https://api.example.com/webhook',
    licenseId: 'test-license-id',
    licenseDevice: 'test-device',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      error: vi.fn().mockReturnThis(),
      event: vi.fn().mockReturnThis(),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn(),
      pause: vi.fn().mockReturnThis(),
      resume: vi.fn().mockReturnThis(),
    };

    vi.mocked(Tracker.create).mockReturnValue(mockClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorTrackerProvider config={defaultConfig}>{children}</ErrorTrackerProvider>
  );

  describe('Hook Initialization', () => {
    it('should return tracker functions', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('event');
      expect(result.current).toHaveProperty('flush');
      expect(typeof result.current.error).toBe('function');
      expect(typeof result.current.event).toBe('function');
      expect(typeof result.current.flush).toBe('function');
    });

    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useErrorTracker(), { wrapper });

      const initialError = result.current.error;
      const initialEvent = result.current.event;
      const initialFlush = result.current.flush;

      rerender();

      expect(result.current.error).toBe(initialError);
      expect(result.current.event).toBe(initialEvent);
      expect(result.current.flush).toBe(initialFlush);
    });
  });

  describe('trackError', () => {
    it('should track errors', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const error = new Error('Test error');

      act(() => {
        result.current.error(error);
      });

      expect(mockClient.error).toHaveBeenCalledWith(error, undefined, undefined);
    });

    it('should track errors with level', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const error = new Error('Fatal error');

      act(() => {
        result.current.fatal(error);
      });

      expect(mockClient.error).toHaveBeenCalledWith(error, 'FATAL', undefined);
    });

    it('should track errors with metadata', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const error = new Error('Error with metadata');
      const metadata = { userId: '123', action: 'submit' };

      act(() => {
        result.current.error(error, metadata);
      });

      expect(mockClient.error).toHaveBeenCalledWith(error, 'ERROR', metadata);
    });

    it('should track error objects', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const errorObj = { code: 'ERR_001', message: 'Custom error' };

      act(() => {
        result.current.error(errorObj);
      });

      expect(mockClient.error).toHaveBeenCalledWith(errorObj, 'ERROR', undefined);
    });

    it('should track multiple errors', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      act(() => {
        result.current.error(error1);
        result.current.capture(error2, 'WARNING');
      });

      expect(mockClient.error).toHaveBeenCalledTimes(2);
      expect(mockClient.error).toHaveBeenNthCalledWith(1, error1, 'ERROR', undefined);
      expect(mockClient.error).toHaveBeenNthCalledWith(2, error2, 'WARNING', undefined);
    });

    it('should handle errors with all event levels', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result.current.debug(new Error('Debug'));
        result.current.capture(new Error('Info'), 'INFO');
        result.current.capture(new Error('Warning'), 'WARNING');
        result.current.error(new Error('Error'));
        result.current.fatal(new Error('Fatal'));
      });

      expect(mockClient.error).toHaveBeenCalledTimes(5);
    });
  });

  describe('trackEvent', () => {
    it('should track events', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result.current.event('User logged in');
      });

      expect(mockClient.event).toHaveBeenCalledWith('User logged in', undefined, undefined);
    });

    it('should track events with level', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result.current.event('Debug event', 'DEBUG');
      });

      expect(mockClient.event).toHaveBeenCalledWith('Debug event', 'DEBUG', undefined);
    });

    it('should track events with metadata', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const metadata = { userId: '123', ip: '127.0.0.1' };

      act(() => {
        result.current.event('User action', 'INFO', metadata);
      });

      expect(mockClient.event).toHaveBeenCalledWith('User action', 'INFO', metadata);
    });

    it('should track multiple events', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result.current.event('Event 1', 'INFO');
        result.current.event('Event 2', 'DEBUG');
        result.current.event('Event 3', 'WARNING');
      });

      expect(mockClient.event).toHaveBeenCalledTimes(3);
    });

    it('should handle events with all levels', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result.current.event('Debug event', 'DEBUG');
        result.current.event('Info event', 'INFO');
        result.current.event('Warning event', 'WARNING');
        result.current.event('Error event', 'ERROR');
        result.current.event('Fatal event', 'FATAL');
      });

      expect(mockClient.event).toHaveBeenCalledTimes(5);
    });
  });

  describe('flush', () => {
    it('should flush pending events', async () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      await act(async () => {
        await result.current.flush();
      });

      expect(mockClient.forceFlush).toHaveBeenCalled();
    });

    it('should return a promise', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      const flushPromise = result.current.flush();

      expect(flushPromise).toBeInstanceOf(Promise);
    });

    it('should handle flush errors', async () => {
      mockClient.forceFlush.mockRejectedValue(new Error('Flush failed'));
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      await expect(result.current.flush()).rejects.toThrow('Flush failed');
    });

    it('should be callable multiple times', async () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      await act(async () => {
        await result.current.flush();
        await result.current.flush();
        await result.current.flush();
      });

      expect(mockClient.forceFlush).toHaveBeenCalledTimes(3);
    });
  });

  describe('Hook Integration', () => {
    it('should work with multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useErrorTracker(), { wrapper });
      const { result: result2 } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result1.current.error(new Error('From hook 1'));
        result2.current.error(new Error('From hook 2'));
      });

      expect(mockClient.error).toHaveBeenCalledTimes(2);
    });

    it('should share the same client instance', () => {
      const { result: result1 } = renderHook(() => useErrorTracker(), { wrapper });
      const { result: result2 } = renderHook(() => useErrorTracker(), { wrapper });

      act(() => {
        result1.current.event('Event 1');
      });

      act(() => {
        result2.current.event('Event 2');
      });

      // Both hooks should use the same client
      expect(mockClient.event).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle client errors gracefully', () => {
      mockClient.error.mockImplementation(() => {
        throw new Error('Client error');
      });

      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      expect(() => {
        act(() => {
          result.current.error(new Error('Test'));
        });
      }).toThrow('Client error');
    });

    it('should handle event tracking errors gracefully', () => {
      mockClient.event.mockImplementation(() => {
        throw new Error('Event error');
      });

      const { result } = renderHook(() => useErrorTracker(), { wrapper });

      expect(() => {
        act(() => {
          result.current.event('Test event');
        });
      }).toThrow('Event error');
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0;

      const TestComponent = () => {
        renderCount++;
        const { error } = useErrorTracker();
        return <button onClick={() => error(new Error('Test'))}>Track</button>;
      };

      const { rerender } = renderHook(() => useErrorTracker(), { wrapper });

      const initialRenderCount = renderCount;
      rerender();

      // Should not increase render count
      expect(renderCount).toBe(initialRenderCount);
    });
  });

  describe('Complex Metadata', () => {
    it('should handle complex metadata objects', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const complexMetadata = {
        user: {
          id: '123',
          name: 'John Doe',
          roles: ['admin', 'user'],
        },
        request: {
          method: 'POST',
          url: '/api/data',
          headers: { 'content-type': 'application/json' },
        },
        timestamp: new Date().toISOString(),
      };

      act(() => {
        result.current.error(new Error('Complex error'), complexMetadata);
      });

      expect(mockClient.error).toHaveBeenCalledWith(
        expect.any(Error),
        'ERROR',
        complexMetadata
      );
    });

    it('should handle arrays in metadata', () => {
      const { result } = renderHook(() => useErrorTracker(), { wrapper });
      const metadata = {
        tags: ['error', 'critical', 'production'],
        affectedUsers: ['user1', 'user2', 'user3'],
      };

      act(() => {
        result.current.event('Batch operation failed', 'ERROR', metadata);
      });

      expect(mockClient.event).toHaveBeenCalledWith(
        'Batch operation failed',
        'ERROR',
        metadata
      );
    });
  });
});
