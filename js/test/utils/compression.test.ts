// tests/utils/compression.test.ts
import { describe, it, expect } from 'vitest';
import { compressAndEncode } from '../../src/utils/compression';
import { gunzipSync } from 'zlib';

describe('compressAndEncode', () => {
  it('should compress and encode data', async () => {
    const data = 'Hello World';
    const result = await compressAndEncode(data);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('should be decompressible', async () => {
    const data = 'Test data for compression';
    const compressed = await compressAndEncode(data);
    const buffer = Buffer.from(compressed, 'base64');
    const decompressed = gunzipSync(buffer).toString('utf-8');
    expect(decompressed).toBe(data);
  });

  it('should handle large data', async () => {
    const largeData = 'x'.repeat(10000);
    const compressed = await compressAndEncode(largeData);
    expect(compressed.length).toBeLessThan(largeData.length);
  });
});