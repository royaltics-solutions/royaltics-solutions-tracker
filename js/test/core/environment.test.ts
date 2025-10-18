import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorTrackerClient } from '../../src/core/client';

describe('ErrorTrackerClient - Environment Detection', () => {
    let originalProcess: typeof process;

    beforeEach(() => {
        originalProcess = global.process;
    });

    afterEach(() => {
        global.process = originalProcess;
    });

    it('should detect Node.js environment correctly', () => {
        const client = new ErrorTrackerClient({
            webhookUrl: 'http://localhost:3000/webhook',
            licenseId: 'test-license',
            licenseDevice: 'test-device',
            enabled: true
        });

        expect(client).toBeDefined();
        expect(typeof process !== 'undefined').toBe(true);
        expect(process.versions?.node).toBeDefined();
    });

    it('should handle browser environment (simulated)', () => {
        const mockProcess = {
            versions: {},
            on: vi.fn(),
            exit: vi.fn(),
        } as unknown as typeof process;

        global.process = mockProcess;

        const client = new ErrorTrackerClient({
            webhookUrl: 'http://localhost:3000/webhook',
            licenseId: 'test-license',
            licenseDevice: 'test-device',
            enabled: true
        });

        expect(client).toBeDefined();
    });

    it('should start without errors in Node.js environment', () => {
        const client = new ErrorTrackerClient({
            webhookUrl: 'http://localhost:3000/webhook',
            licenseId: 'test-license',
            licenseDevice: 'test-device',
            enabled: true
        });

        expect(() => client.start()).not.toThrow();
        client.shutdown();
    });
});
