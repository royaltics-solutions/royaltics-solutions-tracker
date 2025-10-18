import { gzipSync } from 'zlib';

export function compressAndEncode(data: string): string {
  const compressed = gzipSync(Buffer.from(data, 'utf-8'));
  return compressed.toString('base64');
}