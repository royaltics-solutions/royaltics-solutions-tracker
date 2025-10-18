// src/utils/json.ts
import { CIRCULAR_REFERENCE_PLACEHOLDER } from '../constants';

export const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet<object>();
  
  return JSON.stringify(obj, (key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return CIRCULAR_REFERENCE_PLACEHOLDER;
      }
      seen.add(value);
    }
    
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }

    if (typeof value === 'function') {
      return '[Function]';
    }

    if (typeof value === 'symbol') {
      return value.toString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }
    
    return value;
  });
};