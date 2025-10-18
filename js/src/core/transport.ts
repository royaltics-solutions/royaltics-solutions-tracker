import type { ClientConfig, ITransport } from '../types';
import { isBrowser } from '../utils/environment';
import { BrowserTransport } from './transport-browser';
import { NodeTransport } from './transport-node';

export class Transport implements ITransport {
  private readonly implementation: ITransport;

  constructor(config: ClientConfig) {
    this.implementation = isBrowser() 
      ? new BrowserTransport(config)
      : new NodeTransport(config);
  }

  async send(compressedEvent: string): Promise<void> {
    return this.implementation.send(compressedEvent);
  }
}