// src/core/transport-node.ts
import type { TransportPayload, ClientConfig, ITransport } from '../types';
import { DEFAULT_TIMEOUT } from '../constants';

export class NodeTransport implements ITransport {
  private readonly config: ClientConfig;
  private readonly timeout: number;

  constructor(config: ClientConfig) {
    this.config = config;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  async send(compressedEvent: string): Promise<void> {
    const payload: TransportPayload = {
      event: compressedEvent,
    };

    await this.makeRequest(payload);
  }

  private async makeRequest(payload: TransportPayload): Promise<void> {
    const url = new URL(this.config.webhookUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? await import('https') : await import('http');

    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST' as const,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data).toString(),
          'User-Agent': 'Royaltics-ErrorTracker-Node/1.0',
          ...(this.config.headers ?? {}),
        },
        timeout: this.timeout,
      };

      const req = httpModule.request(options, (res) => {
        const statusCode = res.statusCode ?? 0;

        if (statusCode >= 200 && statusCode < 300) {
          res.resume();
          resolve();
        } else {
          res.resume();
          reject(new Error(`HTTP ${statusCode}: ${res.statusMessage ?? 'Unknown error'}`));
        }
      });

      req.on('error', (error: Error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.timeout}ms`));
      });

      req.write(data);
      req.end();
    });
  }
}
