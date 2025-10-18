import { isBrowser } from './environment';

async function compressBrowser(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const compressionStream = new CompressionStream('gzip');
  const writer = compressionStream.writable.getWriter();
  writer.write(dataBuffer);
  writer.close();

  const compressedData = await new Response(compressionStream.readable).arrayBuffer();
  const uint8Array = new Uint8Array(compressedData);

  // Convertir a base64
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

async function compressNode(data: string): Promise<string> {
  const { gzipSync } = await import('zlib');
  const compressed = gzipSync(Buffer.from(data, 'utf-8'));
  return compressed.toString('base64');
}

export async function compressAndEncode(data: string): Promise<string> {
  if (isBrowser()) {
    return compressBrowser(data);
  }
  return compressNode(data);
}
