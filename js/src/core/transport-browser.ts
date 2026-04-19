import type { TransportPayload, ClientConfig, ITransport } from '../types';
import { DEFAULT_TIMEOUT } from '../constants';

export class BrowserTransport implements ITransport {
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Royaltics-ErrorTracker-Browser/1.0',
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
}
