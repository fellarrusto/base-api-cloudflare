import { describe, it, expect } from 'vitest';
import { check } from './health.service';

describe('health.service', () => {
  describe('check', () => {
    it('returns status healthy', () => {
      const result = check('1.0.0', 'my-secret');
      expect(result.status).toBe('healthy');
    });

    it('includes the version and secret passed in', () => {
      const result = check('2.3.4', 'super-secret');
      expect(result.version).toBe('2.3.4');
      expect(result.example_secret).toBe('super-secret');
    });

    it('returns a valid ISO timestamp', () => {
      const result = check('1.0.0', 's');
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('returns a non-negative uptime_ms', () => {
      const result = check('1.0.0', 's');
      expect(result.uptime_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
