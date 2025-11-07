/**
 * WebSocket Rate Limiter Unit Tests
 * Tests for rate limiting functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WebSocketRateLimiter } from '../middleware/websocket-rate-limiter';

describe('WebSocketRateLimiter', () => {
  let rateLimiter: WebSocketRateLimiter;

  beforeEach(() => {
    // Create a new rate limiter for each test with 5 max connections per 1 second
    rateLimiter = new WebSocketRateLimiter(5, 1000);
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow connections under the limit', () => {
      const identifier = 'user-1';

      expect(rateLimiter.checkLimit(identifier)).toBe(true);
      expect(rateLimiter.checkLimit(identifier)).toBe(true);
      expect(rateLimiter.checkLimit(identifier)).toBe(true);
      expect(rateLimiter.getCount(identifier)).toBe(3);
    });

    it('should block connections over the limit', () => {
      const identifier = 'user-2';

      // Allow 5 connections
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit(identifier)).toBe(true);
      }

      // 6th connection should be blocked
      expect(rateLimiter.checkLimit(identifier)).toBe(false);
      expect(rateLimiter.getCount(identifier)).toBe(5);
    });

    it('should track different identifiers separately', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 makes 5 connections
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit(user1)).toBe(true);
      }

      // User 2 should still be able to connect
      expect(rateLimiter.checkLimit(user2)).toBe(true);
      expect(rateLimiter.getCount(user1)).toBe(5);
      expect(rateLimiter.getCount(user2)).toBe(1);
    });
  });

  describe('Time Window Reset', () => {
    it('should reset limit after time window expires', async () => {
      const identifier = 'user-3';

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit(identifier)).toBe(true);
      }

      // Should be blocked
      expect(rateLimiter.checkLimit(identifier)).toBe(false);

      // Wait for window to expire (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be allowed again
      expect(rateLimiter.checkLimit(identifier)).toBe(true);
      expect(rateLimiter.getCount(identifier)).toBe(1);
    });

    it('should provide correct time until reset', () => {
      const identifier = 'user-4';

      rateLimiter.checkLimit(identifier);
      
      const timeUntilReset = rateLimiter.getTimeUntilReset(identifier);
      expect(timeUntilReset).toBeGreaterThan(0);
      expect(timeUntilReset).toBeLessThanOrEqual(1000);
    });

    it('should return 0 for time until reset when not limited', () => {
      const identifier = 'user-5';
      expect(rateLimiter.getTimeUntilReset(identifier)).toBe(0);
    });
  });

  describe('Manual Reset', () => {
    it('should reset limit when manually reset', () => {
      const identifier = 'user-6';

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit(identifier);
      }

      expect(rateLimiter.checkLimit(identifier)).toBe(false);

      // Manual reset
      rateLimiter.reset(identifier);

      // Should be allowed again
      expect(rateLimiter.checkLimit(identifier)).toBe(true);
      expect(rateLimiter.getCount(identifier)).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      rateLimiter.checkLimit('user-1');
      rateLimiter.checkLimit('user-1');
      rateLimiter.checkLimit('user-2');

      const stats = rateLimiter.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.averageConnections).toBe(1.5); // (2 + 1) / 2
    });

    it('should track actively limited users', () => {
      const user = 'user-heavy';

      // Max out the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit(user);
      }

      const stats = rateLimiter.getStats();
      expect(stats.activelyLimited).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup expired entries', async () => {
      rateLimiter.checkLimit('user-temp-1');
      rateLimiter.checkLimit('user-temp-2');

      // Wait for entries to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Trigger cleanup by checking stats
      const stats = rateLimiter.getStats();
      
      // Counts should be 0 for expired entries
      expect(rateLimiter.getCount('user-temp-1')).toBe(0);
      expect(rateLimiter.getCount('user-temp-2')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid connection attempts', () => {
      const identifier = 'user-rapid';
      let allowed = 0;
      let blocked = 0;

      // Simulate 10 rapid connection attempts
      for (let i = 0; i < 10; i++) {
        if (rateLimiter.checkLimit(identifier)) {
          allowed++;
        } else {
          blocked++;
        }
      }

      expect(allowed).toBe(5); // Max connections
      expect(blocked).toBe(5); // Blocked attempts
    });

    it('should handle concurrent identifiers', () => {
      const identifiers = Array.from({ length: 10 }, (_, i) => `user-${i}`);

      // All different users should be able to connect
      identifiers.forEach(id => {
        expect(rateLimiter.checkLimit(id)).toBe(true);
      });

      const stats = rateLimiter.getStats();
      expect(stats.totalEntries).toBe(10);
    });

    it('should handle empty identifier gracefully', () => {
      expect(rateLimiter.checkLimit('')).toBe(true);
      expect(rateLimiter.getCount('')).toBe(1);
    });
  });
});

describe('Rate Limiter Configuration', () => {
  it('should respect custom max connections', () => {
    const limiter = new WebSocketRateLimiter(3, 1000);

    // Allow 3 connections
    expect(limiter.checkLimit('user')).toBe(true);
    expect(limiter.checkLimit('user')).toBe(true);
    expect(limiter.checkLimit('user')).toBe(true);

    // 4th should be blocked
    expect(limiter.checkLimit('user')).toBe(false);

    limiter.destroy();
  });

  it('should respect custom time window', async () => {
    const limiter = new WebSocketRateLimiter(2, 500); // 500ms window

    limiter.checkLimit('user');
    limiter.checkLimit('user');
    
    // Should be blocked
    expect(limiter.checkLimit('user')).toBe(false);

    // Wait for shorter window
    await new Promise(resolve => setTimeout(resolve, 600));

    // Should be allowed again
    expect(limiter.checkLimit('user')).toBe(true);

    limiter.destroy();
  });
});
