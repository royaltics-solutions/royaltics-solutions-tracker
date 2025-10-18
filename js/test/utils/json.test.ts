// tests/utils/json.test.ts
import { describe, it, expect } from 'vitest';
import { safeStringify } from '../../src/utils/json';

describe('safeStringify', () => {
  it('should stringify simple objects', () => {
    const obj = { name: 'test', value: 123 };
    const result = safeStringify(obj);
    expect(result).toBe('{"name":"test","value":123}');
  });

  it('should handle circular references', () => {
    const obj: any = { name: 'test' };
    obj.self = obj;
    const result = safeStringify(obj);
    expect(result).toContain('[Circular]');
  });

  it('should serialize Error objects', () => {
    const error = new Error('Test error');
    const result = safeStringify({ error });
    const parsed = JSON.parse(result);
    expect(parsed.error.name).toBe('Error');
    expect(parsed.error.message).toBe('Test error');
    expect(parsed.error.stack).toBeDefined();
  });

  it('should handle nested circular references', () => {
    const parent: any = { name: 'parent' };
    const child: any = { name: 'child', parent };
    parent.child = child;
    const result = safeStringify(parent);
    expect(result).toContain('[Circular]');
  });
});