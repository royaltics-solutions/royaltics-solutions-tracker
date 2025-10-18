// tests/core/event-builder.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { EventBuilder } from '../../src/core/event-builder';

describe('EventBuilder', () => {
  let builder: EventBuilder;

  beforeEach(() => {
    builder = new EventBuilder({
      app: 'test-app',
      version: '1.0.0',
      platform: 'test',
      device: 'test-device'
    });
  });

  it('should build event from Error', () => {
    const error = new Error('Test error');
    const event = builder.build('Test title', error);

    expect(event.title).toBe('Test title');
    expect(event.level).toBe('ERROR');
    expect(event.event_id).toBeDefined();
    expect(event.context.app).toBe('test-app');
    expect(event.context.version).toBe('1.0.0');
    expect(event.event.message).toBe('Test error');
  });

  it('should extract culprit from error stack', () => {
    const error = new Error('Test');
    const event = builder.build('Title', error);
    expect(event.context.culprit).toBeTruthy();
  });

  it('should handle custom level', () => {
    const event = builder.build('Title', new Error(), 'FATAL');
    expect(event.level).toBe('FATAL');
  });

  it('should include extra metadata', () => {
    const extra = { userId: 123, action: 'login' };
    const event = builder.build('Title', new Error(), 'INFO', extra);
    expect(event.context.extra).toEqual(extra);
  });

  it('should stringify event without errors', () => {
    const event = builder.build('Title', new Error());
    const stringified = builder.stringify(event);
    expect(() => JSON.parse(stringified)).not.toThrow();
  });

  it('should extract tags from error', () => {
    const error: any = new Error('Test');
    error.code = 'ERR_TEST';
    const event = builder.build('Title', error);
    expect(event.context.tags).toContain('code:ERR_TEST');
  });
});