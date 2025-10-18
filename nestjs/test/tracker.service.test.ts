import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorTrackerService } from '../src/tracker.service';
import { ERROR_TRACKER_OPTIONS } from '../src/constants';
import { Tracker } from '@royaltics/tracker';
import type { ErrorTrackerModuleOptions } from '../src/types';

vi.mock('@royaltics/tracker', () => ({
    Tracker: {
        create: vi.fn(),
    },
}));

describe('ErrorTrackerService', () => {
    let service: ErrorTrackerService;
    let mockClient: any;

    const defaultConfig: ErrorTrackerModuleOptions = {
        webhookUrl: 'https://api.example.com/webhook',
        licenseId: 'test-license-id',
        licenseDevice: 'test-device',
        licenseName: 'Test License',
        app: 'test-app',
        version: '1.0.0',
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        mockClient = {
            error: vi.fn().mockReturnThis(),
            event: vi.fn().mockReturnThis(),
            flush: vi.fn().mockResolvedValue(undefined),
            shutdown: vi.fn(),
            isEnabled: true,
        };

        vi.mocked(Tracker.create).mockReturnValue(mockClient);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ErrorTrackerService,
                {
                    provide: ERROR_TRACKER_OPTIONS,
                    useValue: defaultConfig,
                },
            ],
        }).compile();

        service = module.get<ErrorTrackerService>(ErrorTrackerService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Service Initialization', () => {
        it('should be defined', () => {
            expect(service).toBeDefined();
        });

        it('should create tracker client on initialization', () => {
            expect(Tracker.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    webhookUrl: defaultConfig.webhookUrl,
                    licenseId: defaultConfig.licenseId,
                    licenseDevice: defaultConfig.licenseDevice,
                    platform: 'nestjs',
                })
            );
        });

        it('should set platform to nestjs', () => {
            expect(Tracker.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: 'nestjs',
                })
            );
        });

        it('should merge custom configuration with defaults', async () => {
            const customConfig: ErrorTrackerModuleOptions = {
                ...defaultConfig,
                maxRetries: 5,
                timeout: 15000,
                flushInterval: 3000,
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorTrackerService,
                    {
                        provide: ERROR_TRACKER_OPTIONS,
                        useValue: customConfig,
                    },
                ],
            }).compile();

            const customService = module.get<ErrorTrackerService>(ErrorTrackerService);

            expect(Tracker.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxRetries: 5,
                    timeout: 15000,
                    flushInterval: 3000,
                })
            );
        });
    });

    describe('error()', () => {
        it('should track errors', () => {
            const error = new Error('Test error');
            const metadata = { userId: '123', action: 'test' };

            service.error(error, 'ERROR', metadata);

            expect(mockClient.error).toHaveBeenCalledWith(error, 'ERROR', metadata);
        });

        it('should track errors without metadata', () => {
            const error = new Error('Simple error');

            service.error(error);

            expect(mockClient.error).toHaveBeenCalledWith(error, undefined, undefined);
        });

        it('should track errors with custom level', () => {
            const error = new Error('Fatal error');

            service.error(error, 'FATAL');

            expect(mockClient.error).toHaveBeenCalledWith(error, 'FATAL', undefined);
        });

        it('should handle error objects', () => {
            const errorObj = { code: 'ERR_001', message: 'Custom error' };

            service.error(errorObj, 'ERROR');

            expect(mockClient.error).toHaveBeenCalledWith(errorObj, 'ERROR', undefined);
        });

        it('should return service instance for chaining', () => {
            const error = new Error('Chainable error');
            const result = service.error(error);

            expect(result).toBe(service);
        });

        it('should track multiple errors', () => {
            const error1 = new Error('Error 1');
            const error2 = new Error('Error 2');

            service.error(error1, 'ERROR');
            service.error(error2, 'WARNING');

            expect(mockClient.error).toHaveBeenCalledTimes(2);
            expect(mockClient.error).toHaveBeenNthCalledWith(1, error1, 'ERROR', undefined);
            expect(mockClient.error).toHaveBeenNthCalledWith(2, error2, 'WARNING', undefined);
        });
    });

    describe('event()', () => {
        it('should track events', () => {
            const title = 'User logged in';
            const metadata = { userId: '123', ip: '127.0.0.1' };

            service.event(title, 'INFO', metadata);

            expect(mockClient.event).toHaveBeenCalledWith(title, 'INFO', metadata);
        });

        it('should track events without metadata', () => {
            const title = 'Simple event';

            service.event(title, 'INFO');

            expect(mockClient.event).toHaveBeenCalledWith(title, 'INFO', undefined);
        });

        it('should track events with default INFO level', () => {
            const title = 'Default level event';

            service.event(title);

            expect(mockClient.event).toHaveBeenCalledWith(title, 'INFO', undefined);
        });

        it('should track events with different levels', () => {
            service.event('Debug event', 'DEBUG');
            service.event('Warning event', 'WARNING');
            service.event('Error event', 'ERROR');

            expect(mockClient.event).toHaveBeenCalledTimes(3);
            expect(mockClient.event).toHaveBeenNthCalledWith(1, 'Debug event', 'DEBUG', undefined);
            expect(mockClient.event).toHaveBeenNthCalledWith(2, 'Warning event', 'WARNING', undefined);
            expect(mockClient.event).toHaveBeenNthCalledWith(3, 'Error event', 'ERROR', undefined);
        });

        it('should return service instance for chaining', () => {
            const result = service.event('Chainable event', 'INFO');

            expect(result).toBe(service);
        });

        it('should track multiple events', () => {
            service.event('Event 1', 'INFO');
            service.event('Event 2', 'DEBUG');

            expect(mockClient.event).toHaveBeenCalledTimes(2);
        });
    });

    describe('flush()', () => {
        it('should flush pending events', async () => {
            await service.flush();

            expect(mockClient.flush).toHaveBeenCalled();
        });

        it('should return a promise', async () => {
            const result = service.flush();

            expect(result).toBeInstanceOf(Promise);
            await result;
        });

        it('should handle flush errors gracefully', async () => {
            mockClient.flush.mockRejectedValue(new Error('Flush failed'));

            await expect(service.flush()).rejects.toThrow('Flush failed');
        });

        it('should be callable multiple times', async () => {
            await service.flush();
            await service.flush();
            await service.flush();

            expect(mockClient.flush).toHaveBeenCalledTimes(3);
        });
    });

    describe('onModuleDestroy()', () => {
        it('should shutdown tracker client on module destroy', () => {
            service.onModuleDestroy();

            expect(Tracker.shutdown).toHaveBeenCalled();
        });

        it('should be safe to call multiple times', () => {
            service.onModuleDestroy();
            service.onModuleDestroy();

            expect(Tracker.shutdown).toHaveBeenCalledTimes(2);
        });
    });

    describe('Method Chaining', () => {
        it('should support chaining error and event calls', () => {
            const error = new Error('Chained error');

            const result = service
                .error(error, 'ERROR')
                .event('After error', 'INFO')
                .error(new Error('Another error'), 'WARNING');

            expect(result).toBe(service);
            expect(mockClient.error).toHaveBeenCalledTimes(2);
            expect(mockClient.event).toHaveBeenCalledTimes(1);
        });
    });

    describe('Integration with NestJS Lifecycle', () => {
        it('should initialize on module init', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorTrackerService,
                    {
                        provide: ERROR_TRACKER_OPTIONS,
                        useValue: defaultConfig,
                    },
                ],
            }).compile();

            await module.init();

            expect(Tracker.create).toHaveBeenCalled();
        });

        it('should cleanup on module destroy', async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorTrackerService,
                    {
                        provide: ERROR_TRACKER_OPTIONS,
                        useValue: defaultConfig,
                    },
                ],
            }).compile();

            await module.init();
            const trackerService = module.get<ErrorTrackerService>(ErrorTrackerService);
            await module.close();

            // Shutdown is called via onModuleDestroy
            expect(mockClient.shutdown).toHaveBeenCalled();
        });
    });

    describe('Configuration Options', () => {
        it('should respect enabled flag', async () => {
            const disabledConfig: ErrorTrackerModuleOptions = {
                ...defaultConfig,
                enabled: false,
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorTrackerService,
                    {
                        provide: ERROR_TRACKER_OPTIONS,
                        useValue: disabledConfig,
                    },
                ],
            }).compile();

            expect(Tracker.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabled: false,
                })
            );
        });

        it('should pass custom headers', async () => {
            const configWithHeaders: ErrorTrackerModuleOptions = {
                ...defaultConfig,
                headers: {
                    'X-Custom-Header': 'custom-value',
                    'Authorization': 'Bearer token',
                },
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorTrackerService,
                    {
                        provide: ERROR_TRACKER_OPTIONS,
                        useValue: configWithHeaders,
                    },
                ],
            }).compile();

            expect(Tracker.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    headers: {
                        'X-Custom-Header': 'custom-value',
                        'Authorization': 'Bearer token',
                    },
                })
            );
        });

        it('should configure queue settings', async () => {
            const queueConfig: ErrorTrackerModuleOptions = {
                ...defaultConfig,
                maxQueueSize: 200,
                flushInterval: 5000,
            };

            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    ErrorTrackerService,
                    {
                        provide: ERROR_TRACKER_OPTIONS,
                        useValue: queueConfig,
                    },
                ],
            }).compile();

            expect(Tracker.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    maxQueueSize: 200,
                    flushInterval: 5000,
                })
            );
        });
    });

    describe('Error Scenarios', () => {
        it('should handle client creation errors', async () => {
            vi.mocked(Tracker.create).mockImplementation(() => {
                throw new Error('Client creation failed');
            });

            await expect(async () => {
                await Test.createTestingModule({
                    providers: [
                        ErrorTrackerService,
                        {
                            provide: ERROR_TRACKER_OPTIONS,
                            useValue: defaultConfig,
                        },
                    ],
                }).compile();
            }).rejects.toThrow('Client creation failed');
        });

        it('should handle invalid configuration gracefully', async () => {
            const invalidConfig = {
                webhookUrl: '',
                licenseId: '',
                licenseDevice: '',
            } as ErrorTrackerModuleOptions;

            vi.mocked(Tracker.create).mockImplementation(() => {
                throw new Error('Invalid configuration');
            });

            await expect(async () => {
                await Test.createTestingModule({
                    providers: [
                        ErrorTrackerService,
                        {
                            provide: ERROR_TRACKER_OPTIONS,
                            useValue: invalidConfig,
                        },
                    ],
                }).compile();
            }).rejects.toThrow();
        });
    });
});
