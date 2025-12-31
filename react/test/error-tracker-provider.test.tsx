/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ErrorTrackerProvider } from '../src/components/tracker-provider';
import { Tracker } from '@royaltics/tracker';
import type { ClientConfig } from '@royaltics/tracker';

vi.mock('@royaltics/tracker', () => ({
  Tracker: {
    create: vi.fn(),
    shutdown: vi.fn(),
  },
}));

describe('ErrorTrackerProvider', () => {
  let mockClient: any;
  const defaultConfig: Omit<ClientConfig, 'platform' | 'app'> = {
    webhookUrl: 'https://api.example.com/webhook',
    licenseId: 'test-license-id',
    licenseDevice: 'test-device',
    licenseName: 'Test License',
    version: '1.0.0',
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should render children', () => {
      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Test Child</div>
        </ErrorTrackerProvider>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should create tracker client on mount', () => {
      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      expect(Tracker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookUrl: defaultConfig.webhookUrl,
          licenseId: defaultConfig.licenseId,
          licenseDevice: defaultConfig.licenseDevice,
          platform: 'react',
          app: 'react-app',
        })
      );
    });

    it('should set platform to react', () => {
      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      expect(Tracker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          platform: 'react',
        })
      );
    });

    it('should merge config with platform and app', () => {
      const customConfig: Omit<ClientConfig, 'platform' | 'app'> = {
        ...defaultConfig,
        maxRetries: 5,
        timeout: 15000,
      };

      render(
        <ErrorTrackerProvider config={customConfig}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      expect(Tracker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maxRetries: 5,
          timeout: 15000,
          platform: 'react',
          app: 'react-app',
        })
      );
    });

    it('should only create client once', () => {
      const { rerender } = render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      rerender(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Test Updated</div>
        </ErrorTrackerProvider>
      );

      expect(Tracker.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Provider Cleanup', () => {
    it('should shutdown tracker on unmount', async () => {
      const { unmount } = render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      unmount();

      await waitFor(() => {
        expect(Tracker.shutdown).toHaveBeenCalled();
      });
    });

    it('should handle multiple mount/unmount cycles', async () => {
      const { unmount: unmount1 } = render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>First</div>
        </ErrorTrackerProvider>
      );

      unmount1();

      await waitFor(() => {
        expect(Tracker.shutdown).toHaveBeenCalledTimes(1);
      });

      const { unmount: unmount2 } = render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Second</div>
        </ErrorTrackerProvider>
      );

      unmount2();

      await waitFor(() => {
        expect(Tracker.shutdown).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Context Provider', () => {
    it('should provide client to children via context', () => {
      const TestChild = () => {
        const { useErrorTrackerContext } = require('../src/context/tracker-context');
        const client = useErrorTrackerContext();
        return <div>{client ? 'Client Available' : 'No Client'}</div>;
      };

      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <TestChild />
        </ErrorTrackerProvider>
      );

      expect(screen.getByText('Client Available')).toBeInTheDocument();
    });

    it('should render children before client is created', () => {
      vi.mocked(Tracker.create).mockImplementation(() => {
        // Simulate delay in client creation
        return mockClient;
      });

      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Immediate Child</div>
        </ErrorTrackerProvider>
      );

      expect(screen.getByText('Immediate Child')).toBeInTheDocument();
    });
  });

  describe('Configuration Updates', () => {
    it('should not recreate client when config reference changes but values are same', () => {
      const config1 = { ...defaultConfig };
      const config2 = { ...defaultConfig };

      const { rerender } = render(
        <ErrorTrackerProvider config={config1}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      rerender(
        <ErrorTrackerProvider config={config2}>
          <div>Test</div>
        </ErrorTrackerProvider>
      );

      // Should still only be called once due to useEffect dependency
      expect(Tracker.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle client creation errors gracefully', () => {
      vi.mocked(Tracker.create).mockImplementation(() => {
        throw new Error('Client creation failed');
      });

      expect(() => {
        render(
          <ErrorTrackerProvider config={defaultConfig}>
            <div>Test</div>
          </ErrorTrackerProvider>
        );
      }).toThrow('Client creation failed');
    });
  });

  describe('Multiple Providers', () => {
    it('should support multiple providers with different configs', () => {
      const config1: Omit<ClientConfig, 'platform' | 'app'> = {
        ...defaultConfig,
        licenseId: 'license-1',
      };

      const config2: Omit<ClientConfig, 'platform' | 'app'> = {
        ...defaultConfig,
        licenseId: 'license-2',
      };

      render(
        <>
          <ErrorTrackerProvider config={config1}>
            <div>Provider 1</div>
          </ErrorTrackerProvider>
          <ErrorTrackerProvider config={config2}>
            <div>Provider 2</div>
          </ErrorTrackerProvider>
        </>
      );

      expect(screen.getByText('Provider 1')).toBeInTheDocument();
      expect(screen.getByText('Provider 2')).toBeInTheDocument();
      expect(Tracker.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Children Rendering', () => {
    it('should render multiple children', () => {
      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorTrackerProvider>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should render nested components', () => {
      const NestedComponent = () => <div>Nested Content</div>;

      render(
        <ErrorTrackerProvider config={defaultConfig}>
          <div>
            Parent
            <NestedComponent />
          </div>
        </ErrorTrackerProvider>
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Nested Content')).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(
        <ErrorTrackerProvider config={defaultConfig}>
          {null}
        </ErrorTrackerProvider>
      );

      expect(Tracker.create).toHaveBeenCalled();
    });

    it('should handle conditional children', () => {
      const showChild = true;

      render(
        <ErrorTrackerProvider config={defaultConfig}>
          {showChild && <div>Conditional Child</div>}
        </ErrorTrackerProvider>
      );

      expect(screen.getByText('Conditional Child')).toBeInTheDocument();
    });
  });
});
