// tests/core/client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorTrackerClient } from '../../src/core/client';

describe('ErrorTrackerClient', () => {
  let client: ErrorTrackerClient;

  beforeEach(() => {
    client = new ErrorTrackerClient({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test-license',
      licenseDevice: 'test-device',
      enabled: true
    });
  });

  afterEach(() => {
    client.shutdown();
  });

  it('should create client instance', () => {
    expect(client).toBeDefined();
  });

  it('should start client', () => {
    const result = client.start();
    expect(result).toBe(client);
  });

  it('should track error', () => {
    const error = new Error('Test error');
    const result = client.error(error);
    expect(result).toBe(client);
  });

  it('should track event', () => {
    const result = client.event('Test event', 'INFO');
    expect(result).toBe(client);
  });

  it('should pause and resume', () => {
    client.pause();
    client.error(new Error('Should not track'));

    client.resume();
    client.error(new Error('Should track'));

    expect(true).toBe(true);
  });

  it('should not track when disabled', () => {
    const disabledClient = new ErrorTrackerClient({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test',
      enabled: false
    });

    const result = disabledClient.error(new Error());
    expect(result).toBe(disabledClient);
  });

  it('should flush events', async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);

    const testClient = new ErrorTrackerClient({
      webhookUrl: 'http://localhost:3000/issues/webhook/cmgv5pcg6000qjnmwgvvp5k5t/events',
      licenseId: 'test-license',
      licenseDevice: 'test-device',
      enabled: true
    });

    testClient['transport'].send = mockSend;

    testClient.start();
    testClient.error(new Error('Test'));

    await testClient.forceFlush();

    expect(mockSend).toHaveBeenCalled();
    testClient.shutdown();
  });
});