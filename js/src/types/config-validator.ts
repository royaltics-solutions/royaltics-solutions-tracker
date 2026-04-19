import { ClientConfig } from './index';

const URL_REGEX = /^https?:\/\/.+/;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 60000;
const MIN_RETRIES = 0;
const MAX_RETRIES = 10;

export class ConfigValidator {
  static validate(config: Partial<ClientConfig>): asserts config is ClientConfig {
    if (!config.webhookUrl) {
      throw new Error('webhookUrl is required');
    }

    if (!URL_REGEX.test(config.webhookUrl)) {
      throw new Error('webhookUrl must be a valid HTTP/HTTPS URL');
    }

    if (config.timeout !== undefined) {
      if (config.timeout < MIN_TIMEOUT || config.timeout > MAX_TIMEOUT) {
        throw new Error(`timeout must be between ${MIN_TIMEOUT} and ${MAX_TIMEOUT}ms`);
      }
    }

    if (config.maxRetries !== undefined) {
      if (config.maxRetries < MIN_RETRIES || config.maxRetries > MAX_RETRIES) {
        throw new Error(`maxRetries must be between ${MIN_RETRIES} and ${MAX_RETRIES}`);
      }
    }

    if (config.maxQueueSize !== undefined && config.maxQueueSize < 1) {
      throw new Error('maxQueueSize must be at least 1');
    }

    if (config.flushInterval !== undefined && config.flushInterval < 100) {
      throw new Error('flushInterval must be at least 100ms');
    }

    if (config.throttleInterval !== undefined && config.throttleInterval < 0) {
      throw new Error('throttleInterval cannot be negative');
    }

    if (config.deduplicationInterval !== undefined && config.deduplicationInterval < 0) {
      throw new Error('deduplicationInterval cannot be negative');
    }
  }

  static sanitize(config: ClientConfig): ClientConfig {
    return {
      ...config,
      app_name: config.app_name?.trim(),
      app_version: config.app_version?.trim(),
      platform: config.platform?.trim(),
    };
  }
}
