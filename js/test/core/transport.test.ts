// tests/core/transport.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transport } from '../../src/core/transport';
import * as http from 'http';

vi.mock('http');
vi.mock('https');

describe('Transport', () => {
  let transport: Transport;

  beforeEach(() => {
    transport = new Transport({
      webhookUrl: 'http://localhost:3000/webhook',
      licenseId: 'test-license',
      licenseDevice: 'test-device',
      maxRetries: 2,
      timeout: 5000
    });
  });

  it('should send compressed event', async () => {
    const mockRequest: any = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    };

    vi.spyOn(http, 'request').mockImplementation((options, callback: any) => {
      callback({ statusCode: 200 });
      return mockRequest;
    });

    await transport.send('base64data');

    expect(mockRequest.write).toHaveBeenCalled();
    expect(mockRequest.end).toHaveBeenCalled();
  });

  it('should retry on failure', async () => {
    let attempts = 0;
    const mockRequest: any = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    };

    vi.spyOn(http, 'request').mockImplementation((options, callback: any) => {
      attempts++;
      if (attempts < 2) {
        callback({ statusCode: 500 });
      } else {
        callback({ statusCode: 200 });
      }
      return mockRequest;
    });

    await transport.send('base64data');
    expect(attempts).toBe(2);
  });

  it('should throw after max retries', async () => {
    const mockRequest: any = {
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    };

    vi.spyOn(http, 'request').mockImplementation((options, callback: any) => {
      callback({ statusCode: 500 });
      return mockRequest;
    });

    await expect(transport.send('base64data')).rejects.toThrow();
  });
});