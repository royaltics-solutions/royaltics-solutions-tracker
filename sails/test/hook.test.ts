import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Tracker } from '@royaltics/tracker';
import type { SailsErrorTrackerConfig } from '../src/types';

vi.mock('@royaltics/tracker', () => ({
    Tracker: {
        create: vi.fn(),
        shutdown: vi.fn(),
    },
    default: {
        create: vi.fn(),
        shutdown: vi.fn(),
    },
}));

describe('Sails.js Tracker Hook', () => {
    let mockSails: any;
    let hook: any;
    let mockClient: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockClient = {
            error: vi.fn(),
            event: vi.fn(),
            flush: vi.fn(),
            shutdown: vi.fn(),
        };

        mockSails = {
            config: {
                tracker: {
                    enabled: true,
                    webhookUrl: 'https://api.example.com/webhook',
                    licenseId: 'test-license-id',
                    licenseDevice: 'test-device',
                    licenseName: 'Test License',
                    app: 'test-app',
                    version: '1.0.0',
                    debug: false,
                    captureRoutes: true,
                    captureHeaders: true,
                    captureQueries: true,
                } as SailsErrorTrackerConfig,
            },
            log: {
                error: vi.fn(),
                warn: vi.fn(),
                info: vi.fn(),
            },
            on: vi.fn(),
        };

        // Mock Tracker.create to return mockClient
        vi.mocked(Tracker.create).mockReturnValue(mockClient);
        const TrackerDefault = require('@royaltics/tracker').default;
        if (TrackerDefault) {
            vi.mocked(TrackerDefault.create).mockReturnValue(mockClient);
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Hook Initialization', () => {
        it('should initialize successfully with valid config', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.tracker).toBeDefined();
                expect(mockSails.log.info).toHaveBeenCalledWith('@royaltics/tracker-sails initialized successfully');

            });
        });

        it('should not initialize when disabled', () => {
            mockSails.config.tracker.enabled = false;
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.log.warn).toHaveBeenCalledWith('@royaltics/tracker-sails hook deactivated');
            });
        });

        it('should fail when webhookUrl is missing', () => {
            mockSails.config.tracker.webhookUrl = '';
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.log.error).toHaveBeenCalledWith(
                    'DSN for @royaltics/tracker-sails is required in config/tracker.js'
                );

            });
        });

        it('should handle initialization errors gracefully', (done) => {
            vi.mocked(Tracker.create).mockImplementation(() => {
                throw new Error('Initialization failed');
            });

            mockSails.config.tracker.debug = true;
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.log.error).toHaveBeenCalledWith(
                    'Failed to initialize @royaltics/tracker-sails:',
                    expect.any(Error)
                );

            });
        });
    });

    describe('Middleware Attachment', () => {
        it('should attach router middleware when captureRoutes is enabled', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.on).toHaveBeenCalledWith('router:request', expect.any(Function));
                expect(mockSails.on).toHaveBeenCalledWith('router:request:error', expect.any(Function));

            });
        });

        it('should not attach middleware when captureRoutes is disabled', (done) => {
            mockSails.config.tracker.captureRoutes = false;
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.on).not.toHaveBeenCalled();

            });
        });

        it('should not attach middleware when sails.on is not available', (done) => {
            delete mockSails.on;
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                expect(mockSails.log.info).toHaveBeenCalledWith('@royaltics/tracker-sails initialized successfully');

            });
        });
    });

    describe('Request Tracking', () => {
        it('should track incoming requests', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const requestHandler = mockSails.on.mock.calls.find(
                    (call: any) => call[0] === 'router:request'
                )?.[1];

                const mockReq = {
                    method: 'GET',
                    url: '/api/users',
                    ip: '127.0.0.1',
                    headers: { 'user-agent': 'test' },
                    query: { page: '1' },
                    body: {},
                };

                const mockRes = {};

                requestHandler(mockReq, mockRes);

                expect(mockSails.tracker.event).toHaveBeenCalledWith(
                    'Request received',
                    'INFO',
                    expect.objectContaining({
                        request: expect.objectContaining({
                            method: 'GET',
                            url: '/api/users',
                            ip: '127.0.0.1',
                        }),
                    })
                );

            });
        });

        it('should ignore specified routes', (done) => {
            mockSails.config.tracker.ignoredRoutes = ['/health', '/metrics'];
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const requestHandler = mockSails.on.mock.calls.find(
                    (call: any) => call[0] === 'router:request'
                )?.[1];

                const mockReq = {
                    method: 'GET',
                    url: '/health',
                    ip: '127.0.0.1',
                };

                requestHandler(mockReq, {});

                expect(mockSails.tracker.event).not.toHaveBeenCalled();

            });
        });

        it('should capture headers when enabled', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const requestHandler = mockSails.on.mock.calls.find(
                    (call: any) => call[0] === 'router:request'
                )?.[1];

                const mockReq = {
                    method: 'POST',
                    url: '/api/data',
                    ip: '127.0.0.1',
                    headers: { 'content-type': 'application/json' },
                    query: {},
                    body: { data: 'test' },
                };

                requestHandler(mockReq, {});

                expect(mockSails.tracker.event).toHaveBeenCalledWith(
                    'Request received',
                    'INFO',
                    expect.objectContaining({
                        request: expect.objectContaining({
                            headers: { 'content-type': 'application/json' },
                        }),
                    })
                );

            });
        });

        it('should not capture headers when disabled', (done) => {
            mockSails.config.tracker.captureHeaders = false;
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const requestHandler = mockSails.on.mock.calls.find(
                    (call: any) => call[0] === 'router:request'
                )?.[1];

                const mockReq = {
                    method: 'POST',
                    url: '/api/data',
                    ip: '127.0.0.1',
                    headers: { 'content-type': 'application/json' },
                };

                requestHandler(mockReq, {});

                expect(mockSails.tracker.event).toHaveBeenCalledWith(
                    'Request received',
                    'INFO',
                    expect.objectContaining({
                        request: expect.not.objectContaining({
                            headers: expect.anything(),
                        }),
                    })
                );

            });
        });
    });

    describe('Error Tracking', () => {
        it('should track request errors', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const errorHandler = mockSails.on.mock.calls.find(
                    (call: any) => call[0] === 'router:request:error'
                )?.[1];

                const mockError = new Error('Test error');
                const mockReq = {
                    method: 'GET',
                    url: '/api/fail',
                    ip: '127.0.0.1',
                };

                errorHandler(mockError, mockReq);

                expect(mockSails.tracker.error).toHaveBeenCalledWith(
                    mockError,
                    'ERROR',
                    expect.objectContaining({
                        request: expect.objectContaining({
                            method: 'GET',
                            url: '/api/fail',
                        }),
                    })
                );

            });
        });

        it('should ignore specified errors', (done) => {
            mockSails.config.tracker.ignoredErrors = ['ValidationError', 'NotFoundError'];
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const errorHandler = mockSails.on.mock.calls.find(
                    (call: any) => call[0] === 'router:request:error'
                )?.[1];

                const mockError = new Error('Validation failed');
                mockError.name = 'ValidationError';
                const mockReq = {
                    method: 'POST',
                    url: '/api/create',
                    ip: '127.0.0.1',
                };

                errorHandler(mockError, mockReq);

                expect(mockSails.tracker.error).not.toHaveBeenCalled();

            });
        });

        it('should track unhandled rejections', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                const unhandledRejectionHandler = process.listeners('unhandledRejection').pop();
                expect(unhandledRejectionHandler).toBeDefined();

                const mockReason = new Error('Unhandled promise rejection');
                unhandledRejectionHandler?.(mockReason, Promise.reject(mockReason));

                expect(mockSails.tracker.error).toHaveBeenCalledWith(mockReason);

            });
        });
    });

    describe('Hook Shutdown', () => {
        it('should shutdown gracefully', (done) => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                hook.shutdown(() => {
                    expect(Tracker.shutdown).toHaveBeenCalled();

                });
            });
        });

        it('should handle shutdown when client is not initialized', (done) => {
            mockSails.config.tracker.enabled = false;
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            hook.initialize(() => {
                hook.shutdown(() => {
                    expect(Tracker.shutdown).toHaveBeenCalled();

                });
            });
        });
    });

    describe('Default Configuration', () => {
        it('should provide default configuration', () => {
            const TrackerHook = require('../src/index');
            hook = TrackerHook(mockSails);

            expect(hook.defaults).toBeDefined();
            expect(hook.defaults.__configKey__).toMatchObject({
                enabled: true,
                webhookUrl: 'N/A',
                licenseId: '',
                licenseDevice: '',
                app: 'sails-app',
                platform: 'sails',
                maxRetries: 3,
                timeout: 10000,
                flushInterval: 10000,
                maxQueueSize: 100,
            });
        });
    });
});
