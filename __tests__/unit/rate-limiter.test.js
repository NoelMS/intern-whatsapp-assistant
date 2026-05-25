// Tests for rate limiter module
const { checkRateLimit, getRateLimitStatus, clearRateLimit, getStats } = require('../../lib/rate-limiter');

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearRateLimit();
  });

  describe('checkRateLimit', () => {
    test('should allow first request', () => {
      const phone = '+91XXXXXXXXXX';
      const result = checkRateLimit(phone, 5);
      expect(result).toBe(true);
    });

    test('should block rapid requests within limit', () => {
      const phone = '+91XXXXXXXXXX';
      
      // First request should pass
      expect(checkRateLimit(phone, 5)).toBe(true);
      
      // Second request immediately should fail
      expect(checkRateLimit(phone, 5)).toBe(false);
    });

    test('should allow requests after time window expires', (done) => {
      const phone = '+91XXXXXXXXXX';
      
      // First request should pass
      expect(checkRateLimit(phone, 1)).toBe(true);
      
      // Second request immediately should fail
      expect(checkRateLimit(phone, 1)).toBe(false);
      
      // After 1.1 seconds should pass
      setTimeout(() => {
        expect(checkRateLimit(phone, 1)).toBe(true);
        done();
      }, 1100);
    });

    test('should handle multiple users independently', () => {
      const phone1 = '+91XXXXXXXXXX';
      const phone2 = '+91YYYYYYYYYY';
      
      // First user first request
      expect(checkRateLimit(phone1, 5)).toBe(true);
      expect(checkRateLimit(phone1, 5)).toBe(false);
      
      // Second user should not be affected
      expect(checkRateLimit(phone2, 5)).toBe(true);
      expect(checkRateLimit(phone2, 5)).toBe(false);
    });
  });

  describe('getRateLimitStatus', () => {
    test('should return allowed:true for new user', () => {
      const phone = '+91XXXXXXXXXX';
      const status = getRateLimitStatus(phone, 5);
      expect(status.allowed).toBe(true);
      expect(status.secondsUntilNext).toBe('0.0');
    });

    test('should return allowed:false after request', () => {
      const phone = '+91XXXXXXXXXX';
      
      checkRateLimit(phone, 5);
      const status = getRateLimitStatus(phone, 5);
      
      expect(status.allowed).toBe(false);
      expect(parseFloat(status.secondsUntilNext)).toBeGreaterThan(0);
      expect(parseFloat(status.secondsUntilNext)).toBeLessThanOrEqual(5);
    });
  });

  describe('clearRateLimit', () => {
    test('should clear individual user rate limit', () => {
      const phone = '+91XXXXXXXXXX';
      
      checkRateLimit(phone, 5);
      expect(checkRateLimit(phone, 5)).toBe(false);
      
      clearRateLimit(phone);
      expect(checkRateLimit(phone, 5)).toBe(true);
    });

    test('should clear all rate limits when called without phone', () => {
      const phone1 = '+91XXXXXXXXXX';
      const phone2 = '+91YYYYYYYYYY';
      
      checkRateLimit(phone1, 5);
      checkRateLimit(phone2, 5);
      
      expect(checkRateLimit(phone1, 5)).toBe(false);
      expect(checkRateLimit(phone2, 5)).toBe(false);
      
      clearRateLimit();
      
      expect(checkRateLimit(phone1, 5)).toBe(true);
      expect(checkRateLimit(phone2, 5)).toBe(true);
    });
  });

  describe('getStats', () => {
    test('should return empty stats initially', () => {
      const stats = getStats();
      expect(stats.totalLimited).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    test('should track limited users', () => {
      const phone1 = '+91XXXXXXXXXX';
      const phone2 = '+91YYYYYYYYYY';
      
      checkRateLimit(phone1, 5);
      checkRateLimit(phone2, 5);
      
      const stats = getStats();
      expect(stats.totalLimited).toBe(2);
      expect(stats.entries).toHaveLength(2);
    });
  });
});
