import { ErrorTrackerClient } from '@royaltics/tracker';
import TrackerClient from '@royaltics/tracker';

import type { SailsHookContext, SailsErrorTrackerConfig, RequestContext, SailsTrackerClient } from './types';

export type { SailsTrackerClient, SailsErrorTrackerConfig, RequestContext };

module.exports = function Tracker(sails: SailsHookContext['sails']) {
    let client: ErrorTrackerClient | undefined;

    return {
        defaults: {
            __configKey__: {
                enabled: true,
                webhookUrl: "N/A",
                licenseId: "",
                licenseDevice: "",
                licenseName: "",
                app: "sails-app",
                version: "",
                platform: "sails",
                maxRetries: 3,
                timeout: 10000,
                flushInterval: 10000,
                maxQueueSize: 100,
                headers: {},
            } as SailsErrorTrackerConfig,
        },

        initialize: function (cb: () => void) {
            const settings = sails.config.tracker || {};

            if (!settings.enabled) {
                sails.log.warn('@royaltics/tracker-sails hook deactivated');
                return cb();
            }

            if (!settings.webhookUrl) {
                sails.log.error('DSN for @royaltics/tracker-sails is required in config/tracker.js');
                return cb();
            }

            try {
                if (settings.debug) sails.log.info('Initializing @royaltics/tracker-sails...');
                client = TrackerClient.create(settings);
                
                sails.tracker = {
                    error: (error: Error | Record<string, unknown>, metadata?: Record<string, unknown>) => 
                        client!.error(error, 'ERROR', metadata),
                    fatal: (error: Error | Record<string, unknown>, metadata?: Record<string, unknown>) => 
                        client!.error(error, 'FATAL', metadata),
                    debug: (error: Error | Record<string, unknown>, metadata?: Record<string, unknown>) => 
                        client!.error(error, 'DEBUG', metadata),
                    capture: (error: Error | Record<string, unknown>, level?: any, metadata?: Record<string, unknown>) => 
                        client!.error(error, level, metadata),
                    info: (title: string, metadata?: Record<string, unknown>) => 
                        client!.event(title, 'INFO', metadata),
                    warn: (title: string, metadata?: Record<string, unknown>) => 
                        client!.event(title, 'WARNING', metadata),
                    event: (title: string, level?: any, metadata?: Record<string, unknown>) => 
                        client!.event(title, level, metadata),
                    flush: async () => await client!.forceFlush(),
                    pause: () => client!.pause(),
                    resume: () => client!.resume(),
                    shutdown: () => client!.shutdown(),
                };
                
                if (settings.debug) sails.log.info('@royaltics/tracker-sails initialized successfully');

                process.on('unhandledRejection', function (reason: any) {
                    if (settings.debug) sails.log.info('Unhandled rejection:', reason);
                    client?.error(reason instanceof Error ? reason : new Error(String(reason)));
                });

                if (settings.captureRoutes) {
                    attachMiddleware(sails, client, settings);
                }

                if (settings.debug) sails.log.info('@royaltics/tracker-sails initialized successfully');
            } catch (error) {
                if (settings.debug) sails.log.error('Failed to initialize @royaltics/tracker-sails:', error);
            }

            return cb();
        },

        shutdown: function (done: () => void) {
            if (client) TrackerClient.shutdown();
            done();
        },
    };
};

function attachMiddleware(
    sails: SailsHookContext['sails'],
    client: ErrorTrackerClient,
    config: SailsErrorTrackerConfig
): void {
    if (!sails.on) return;

    sails.on('router:request', (req: any, res: any) => {
        if (shouldIgnoreRoute(req.url, ["https://sailsjs.com", "https://api.royaltics.com"])) return;
        const context = extractRequestContext(req, config);
        client.event('Request received', 'INFO', { request: context });
    });

    sails.on('router:request:error', (error: Error, req: any) => {
        if (config.ignoredErrors || shouldIgnoreError(error, ["SailsError", "RoyalticsError"])) return;
        const context = extractRequestContext(req, config);
        client.error(error, 'ERROR', { request: context });
    });
}

function extractRequestContext(req: any, config: SailsErrorTrackerConfig): RequestContext {
    return {
        method: req.method ?? 'UNKNOWN',
        url: req.url ?? 'UNKNOWN',
        ip: req.ip,
        headers: config.captureHeaders ? req.headers : undefined,
        query: config.captureQueries ? req.query : undefined,
        body: config.captureQueries ? req.body : undefined,
    };
}

function shouldIgnoreRoute(url: string, patterns?: string[]): boolean {
    if (!patterns) return false;
    return patterns.some((pattern) => new RegExp(pattern).test(url));
}

function shouldIgnoreError(error: Error, patterns?: string[]): boolean {
    if (!patterns) return false;
    return patterns.some((pattern) => {
        const regex = new RegExp(pattern);
        return regex.test(error.name) || regex.test(error.message);
    });
}