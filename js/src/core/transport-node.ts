// src/core/transport-node.ts
import type { TransportPayload, ClientConfig, ITransport } from '../types';
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT } from '../constants';

export class NodeTransport implements ITransport {
  private readonly config: ClientConfig;
  private readonly maxRetries: number;
  private readonly timeout: number;

  constructor(config: ClientConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  async send(compressedEvent: string): Promise<void> {
    const payload: TransportPayload = {
      event: compressedEvent,
      license_id: this.config.licenseId,
      license_name: this.config.licenseName,
      license_device: this.config.licenseDevice,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.makeRequest(payload);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          await this.delay(this.calculateBackoff(attempt));
        }
      }
    }

    throw lastError ?? new Error('Transport failed with unknown error');
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
          'User-Agent': 'Royaltics-ErrorTracker/1.0',
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

  private calculateBackoff(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
