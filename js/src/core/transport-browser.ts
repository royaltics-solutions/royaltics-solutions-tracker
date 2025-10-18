import type { TransportPayload, ClientConfig, ITransport } from '../types';
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT } from '../constants';

export class BrowserTransport implements ITransport {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Royaltics-ErrorTracker/1.0',
          ...(this.config.headers ?? {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw new Error(`Network error: ${error.message}`);
      }
      
      throw error;
    }
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
