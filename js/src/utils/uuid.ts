import { isBrowser } from './environment';

export function generateUUID(): string {
  if (isBrowser() && typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  if (typeof require !== 'undefined') {
    try {
      const { randomUUID } = require('crypto');
      return randomUUID();
    } catch {
      // Fallback si crypto no está disponible
    }
  }
  
  // Fallback: generar UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
