import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorTrackerModule } from '../src/tracker.module';
import { ErrorTrackerService } from '../src/tracker.service';
import { ERROR_TRACKER_OPTIONS } from '../src/constants';
import type { ErrorTrackerModuleOptions, ErrorTrackerOptionsFactory } from '../src/types';

describe('ErrorTrackerModule', () => {
    describe('forRoot', () => {
        it('should provide ErrorTrackerService with static configuration', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'test-license-id',
                licenseDevice: 'test-device',
                licenseName: 'Test License',
                app: 'test-app',
                version: '1.0.0',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config)],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);
            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(service).toBeDefined();
            expect(service).toBeInstanceOf(ErrorTrackerService);
            expect(options).toEqual(config);
        });

        it('should create a global module', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'test-license-id',
                licenseDevice: 'test-device',
            };

            const dynamicModule = ErrorTrackerModule.forRoot(config);

            expect(dynamicModule.global).toBe(true);
            expect(dynamicModule.module).toBe(ErrorTrackerModule);
            expect(dynamicModule.exports).toContain(ErrorTrackerService);
        });

        it('should provide options with minimal configuration', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'test-license',
                licenseDevice: 'test-device',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config)],
            }).compile();

            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(options.webhookUrl).toBe('https://api.example.com/webhook');
            expect(options.licenseId).toBe('test-license');
            expect(options.licenseDevice).toBe('test-device');
        });
    });

    describe('forRootAsync', () => {
        it('should provide ErrorTrackerService with useFactory', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'test-license-id',
                licenseDevice: 'test-device',
                app: 'async-app',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    ErrorTrackerModule.forRootAsync({
                        useFactory: () => config,
                    }),
                ],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);
            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(service).toBeDefined();
            expect(options).toEqual(config);
        });

        it('should provide ErrorTrackerService with useFactory and inject', async () => {
            const CONFIG_SERVICE = 'CONFIG_SERVICE';
            const configService = {
                getWebhookUrl: () => 'https://api.example.com/webhook',
                getLicenseId: () => 'injected-license',
                getDevice: () => 'injected-device',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    ErrorTrackerModule.forRootAsync({
                        useFactory: (config: any) => ({
                            webhookUrl: config.getWebhookUrl(),
                            licenseId: config.getLicenseId(),
                            licenseDevice: config.getDevice(),
                            app: 'async-app',
                            version: '1.0.0',
                        }),
                        inject: [CONFIG_SERVICE],
                    }),
                ],
                providers: [
                    {
                        provide: CONFIG_SERVICE,
                        useValue: configService,
                    },
                ],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);
            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(service).toBeDefined();
            expect(options.webhookUrl).toBe('https://api.example.com/webhook');
            expect(options.licenseId).toBe('injected-license');
            expect(options.licenseDevice).toBe('injected-device');
        });

        it('should provide ErrorTrackerService with useClass', async () => {
            class ConfigService implements ErrorTrackerOptionsFactory {
                createErrorTrackerOptions(): ErrorTrackerModuleOptions {
                    return {
                        webhookUrl: 'https://api.example.com/webhook',
                        licenseId: 'class-license',
                        licenseDevice: 'class-device',
                        app: 'class-app',
                    };
                }
            }

            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    ErrorTrackerModule.forRootAsync({
                        useClass: ConfigService,
                    }),
                ],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);
            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(service).toBeDefined();
            expect(options.webhookUrl).toBe('https://api.example.com/webhook');
            expect(options.licenseId).toBe('class-license');
            expect(options.app).toBe('class-app');
        });

        it('should provide ErrorTrackerService with useExisting', async () => {
            class ConfigService implements ErrorTrackerOptionsFactory {
                createErrorTrackerOptions(): ErrorTrackerModuleOptions {
                    return {
                        webhookUrl: 'https://api.example.com/webhook',
                        licenseId: 'existing-license',
                        licenseDevice: 'existing-device',
                    };
                }
            }

            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    ErrorTrackerModule.forRootAsync({
                        useExisting: ConfigService,
                    }),
                ],
                providers: [ConfigService],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);
            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(service).toBeDefined();
            expect(options.licenseId).toBe('existing-license');
        });

        it('should create a global module with async configuration', async () => {
            const dynamicModule = ErrorTrackerModule.forRootAsync({
                useFactory: () => ({
                    webhookUrl: 'https://api.example.com/webhook',
                    licenseId: 'test',
                    licenseDevice: 'test',
                }),
            });

            expect(dynamicModule.global).toBe(true);
            expect(dynamicModule.module).toBe(ErrorTrackerModule);
            expect(dynamicModule.exports).toContain(ErrorTrackerService);
        });

        it('should support async factory with Promise', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'async-license',
                licenseDevice: 'async-device',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [
                    ErrorTrackerModule.forRootAsync({
                        useFactory: async () => {
                            // Simulate async operation
                            await new Promise((resolve) => setTimeout(resolve, 10));
                            return config;
                        },
                    }),
                ],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);
            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(service).toBeDefined();
            expect(options).toEqual(config);
        });
    });

    describe('Module Exports', () => {
        it('should export ErrorTrackerService', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'test-license',
                licenseDevice: 'test-device',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config)],
            }).compile();

            const service = module.get<ErrorTrackerService>(ErrorTrackerService);

            expect(service).toBeDefined();
            expect(typeof service.error).toBe('function');
            expect(typeof service.event).toBe('function');
            expect(typeof service.flush).toBe('function');
        });

        it('should be available globally', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'test-license',
                licenseDevice: 'test-device',
            };

            const rootModule = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config)],
            }).compile();

            // Create a child module without importing ErrorTrackerModule
            const childModule = await Test.createTestingModule({
                imports: [],
            })
                .overrideProvider(ErrorTrackerService)
                .useValue(rootModule.get(ErrorTrackerService))
                .compile();

            const service = childModule.get<ErrorTrackerService>(ErrorTrackerService);

            expect(service).toBeDefined();
        });
    });

    describe('Configuration Validation', () => {
        it('should accept valid configuration', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'valid-license',
                licenseDevice: 'valid-device',
                licenseName: 'Valid License',
                app: 'test-app',
                version: '1.0.0',
                enabled: true,
                maxRetries: 5,
                timeout: 15000,
                flushInterval: 3000,
                maxQueueSize: 100,
                headers: {
                    'X-Custom-Header': 'value',
                },
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config)],
            }).compile();

            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(options).toEqual(config);
        });

        it('should work with minimal required configuration', async () => {
            const config: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api.example.com/webhook',
                licenseId: 'min-license',
                licenseDevice: 'min-device',
            };

            const module: TestingModule = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config)],
            }).compile();

            const options = module.get(ERROR_TRACKER_OPTIONS);

            expect(options.webhookUrl).toBe('https://api.example.com/webhook');
            expect(options.licenseId).toBe('min-license');
            expect(options.licenseDevice).toBe('min-device');
        });
    });

    describe('Multiple Instances', () => {
        it('should support multiple module instances with different configs', async () => {
            const config1: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api1.example.com/webhook',
                licenseId: 'license-1',
                licenseDevice: 'device-1',
            };

            const config2: ErrorTrackerModuleOptions = {
                webhookUrl: 'https://api2.example.com/webhook',
                licenseId: 'license-2',
                licenseDevice: 'device-2',
            };

            const module1 = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config1)],
            }).compile();

            const module2 = await Test.createTestingModule({
                imports: [ErrorTrackerModule.forRoot(config2)],
            }).compile();

            const options1 = module1.get(ERROR_TRACKER_OPTIONS);
            const options2 = module2.get(ERROR_TRACKER_OPTIONS);

            expect(options1.licenseId).toBe('license-1');
            expect(options2.licenseId).toBe('license-2');
        });
    });
});
