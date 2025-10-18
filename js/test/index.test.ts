// tests/index.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Tracker from '../src/index';

describe('Tracker', () => {
  afterEach(() => {
    Tracker.shutdown();
  });

  it('should create default instance', () => {
    const client = Tracker.create({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test'
    });

    expect(client).toBeDefined();
    expect(Tracker.has()).toBe(true);
  });

  it('should create named instances', () => {
    Tracker.create({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test'
    }, 'prod');

    expect(Tracker.has('prod')).toBe(true);
    expect(Tracker.get('prod')).toBeDefined();
  });

  it('should track error via static method', () => {
    Tracker.create({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test'
    });

    expect(() => Tracker.error(new Error('Test'))).not.toThrow();
  });

  it('should track event via static method', () => {
    Tracker.create({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test'
    });

    expect(() => Tracker.event('Test event')).not.toThrow();
  });

  it('should throw when accessing non-existent instance', () => {
    expect(() => Tracker.get()).toThrow();
    expect(() => Tracker.get('nonexistent')).toThrow();
  });

  it('should pause and resume', () => {
    Tracker.create({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test'
    });

    expect(() => {
      Tracker.pause();
      Tracker.resume();
    }).not.toThrow();
  });

  it('should flush events', async () => {
    Tracker.create({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test',
      licenseDevice: 'test'
    });

    await expect(Tracker.flush()).resolves.not.toThrow();
  });
});