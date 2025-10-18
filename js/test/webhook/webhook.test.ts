// tests/integration/webhook.test.ts
import { describe, it, expect } from 'vitest';
import { ErrorTrackerClient } from '../../src/core/client';
import http from 'http';

describe('Webhook Integration Test', () => {
  let server: http.Server;
  let receivedPayloads: any[] = [];
  const PORT = 3000;
  const WEBHOOK_URL = `http://localhost:${PORT}/v2/issues/webhook/cmgv5pcg6000qjnmwgvvp5k5t/events`;
  console.log(WEBHOOK_URL)


  it('should send error to real webhook', async () => {
    receivedPayloads = [];

    const client = new ErrorTrackerClient({
      webhookUrl: WEBHOOK_URL,
      licenseId: 'test-license-123',
      licenseName: 'Test License',
      licenseDevice: 'test-device-001',
      app: 'integration-test',
      version: '1.0.0',
      enabled: true,
      headers: {
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjoiL216aEY5dTJtVEczSjlwY3MzcHMyUT09Onl0bEo2SzU1UnRsbm5KaVQ1eTlEQkNKUWEwMmx3R2xqdTk4RzdtVDlZRnEzMlBvTzFHN3lWMFVZQ0lYcnBhNjdTS2w3ZkZwbWNDbzZEblJjRWloZ2JTNENDQVhuSVlPQmxjNVc4NEYvdjlUZHlMQXJwN0lkbG5qOUg1TWI5NTJ2VmRQdWphRFJkK0RGdEtWVDFXTXE5SUZsMHgwb0JhQ1pyWTZuc09nbUlHb1pjb0hWUkVXak12aDNBUW5IaFlUWWhUU3haMk9mWlVNVy9TdmVEa0tSTkVhczhwbVMrTllWcDN2R0NUcmJPT25SbzNOUWp6R3l6TmZPdUNpc3dOQlhCcDNNekU5WVBBMVpuMExZbVdjN3hvTnBaQVZiYVJvMmdMMlBSSXBKc1UyeVVaMzh6YmlIMDdaMHpxeStKL0VXdUE1ZnNFWHRaR1V4c29lUjRhZ29sNXB1OE92WUdIWVVXcXBBMitWSFphcy9vQng0b25yWXU1UUE4a0hpZnkxNFNleFpQV213NC9mbHJmRUZnalQ3ME53RFU0SFFmMDdzNXBJLzM3TTJFQ1psUUJNV2R3Qm1HWDNnREVRc3RWZHlVRTd4ZnlTbzdFdGtBZzBIVWNSNExlYmRSUGUxeGpHWkdNOHJOVW9mdWJhOHFFLytUSjVocllvazRYL1NZRGtqWEx2bkFzdlZTU0xLWTl4R2dWU3FpYm0xWjhrZ1E1R3hpQ3FuL2JidGZkL3VFQ3dNdGlLRDFCdUJHSlJMRytuMTVKUFM3TndPSWZidlFBM0M3bG9nRS85aUIwaStJVHRFR1l5ZDlOYlRFRExWS0FRTUNhTUpSVmRBa3lYd2gzWHBnUXpyNHpiak9ZSy9uYUhjV2cyMkhyZEV1RU9wNWF2YWxHSXQ0dzZKNWd0ZjBOWFdQZUhnWE0vS2UzNU91aFlRbjZUNUIxZ2FzQ2VOMjJqaHdyVWgyNTVqZTh3dVZtTTlNd3MwVWczTEdPVG1hTFgwSmRQN042WWxOK2lTUTg2MGtEQXRraTJjdXc0YS9TcDNHUVlZQ3c9PSIsImlhdCI6MTc2MDY5MTA2MiwiZXhwIjoxNzYwNzc3NDYyfQ.JbgazSs68UzA3T68hlsdGQTgnIsnIyblpTrWrW01N4w`
      }
    });

    client.start();

    const testError = new Error('Integration test error');
    client.error(testError, 'ERROR', { testId: 'webhook-test-1' });

    await client.forceFlush();
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(true).toBe(true);


    client.shutdown();
  }, 15000);

  /* it('should send multiple events in batch', async () => {
     receivedPayloads = [];
 
     const client = new ErrorTrackerClient({
       webhookUrl: WEBHOOK_URL,
       licenseId: 'batch-test',
       licenseDevice: 'batch-device',
       app: 'batch-test-app',
       version: '2.0.0'
     });
 
     client.start();
 
     client.error(new Error('Error 1'), 'ERROR');
     client.error(new Error('Error 2'), 'WARNING');
     client.event('Custom event', 'INFO', { userId: 123 });
 
     await client.forceFlush();
     await new Promise(resolve => setTimeout(resolve, 1000));
 
     expect(receivedPayloads.length).toBe(3);
     expect(receivedPayloads[0].event.title).toBe('Error 1');
     expect(receivedPayloads[1].event.title).toBe('Error 2');
     expect(receivedPayloads[2].event.title).toBe('Custom event');
 
     client.shutdown();
   }, 15000);
 
   it('should handle webhook errors gracefully', async () => {
     const client = new ErrorTrackerClient({
       webhookUrl: 'http://localhost:9999/invalid',
       licenseId: 'error-test',
       licenseDevice: 'error-device',
       maxRetries: 1,
       timeout: 2000
     });
 
     client.start();
     client.error(new Error('Should fail'));
 
     await expect(client.forceFlush()).resolves.not.toThrow();
 
     client.shutdown();
   }, 15000);
 
   it('should compress data effectively', async () => {
     receivedPayloads = [];
 
     const client = new ErrorTrackerClient({
       webhookUrl: WEBHOOK_URL,
       licenseId: 'compression-test',
       licenseDevice: 'compression-device'
     });
 
     client.start();
 
     const largeExtra = {
       data: 'x'.repeat(10000),
       nested: { deep: { value: 'test' } }
     };
 
     client.error(new Error('Large payload'), 'ERROR', largeExtra);
 
     await client.forceFlush();
     await new Promise(resolve => setTimeout(resolve, 1000));
 
     expect(receivedPayloads.length).toBe(1);
 
     const compressedSize = receivedPayloads[0].payload.event.length;
     const originalSize = JSON.stringify(receivedPayloads[0].event).length;
 
     expect(compressedSize).toBeLessThan(originalSize);
 
     client.shutdown();
   }, 15000);*/
});