// tests/utils/compression.test.ts
import { describe, it, expect } from 'vitest';
import { compressAndEncode } from '../../src/utils/compression';
import { gunzipSync } from 'zlib';

describe('compressAndEncode', () => {
  it('should compress and encode data', () => {
    const data = 'Hello World';
    const result = compressAndEncode(data);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should be decompressible', () => {
    const data = 'Test data for compression';
    const compressed = compressAndEncode(data);
    const buffer = Buffer.from(compressed, 'base64');
    const decompressed = gunzipSync(buffer).toString('utf-8');
    expect(decompressed).toBe(data);
  });

  it('should handle large data', () => {
    const largeData = 'x'.repeat(10000);
    const compressed = compressAndEncode(largeData);
    expect(compressed.length).toBeLessThan(largeData.length);
  });
});