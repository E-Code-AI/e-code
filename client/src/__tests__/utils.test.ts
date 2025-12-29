import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Utility Functions', () => {
  describe('Performance Utilities', () => {
    it('should throttle function calls', async () => {
      const fn = vi.fn();
      let callCount = 0;
      const throttle = (func: () => void, limit: number) => {
        let inThrottle: boolean;
        return function() {
          if (!inThrottle) {
            func();
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      };
      
      const throttled = throttle(() => {
        callCount++;
        fn();
      }, 100);
      
      throttled();
      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(1);
    });

    it('should debounce function calls', async () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      
      const debounce = (func: () => void, wait: number) => {
        let timeout: ReturnType<typeof setTimeout>;
        return function() {
          clearTimeout(timeout);
          timeout = setTimeout(func, wait);
        };
      };
      
      const debounced = debounce(fn, 100);
      
      debounced();
      debounced();
      debounced();
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      
      expect(fn).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });
  });

  describe('String Utilities', () => {
    it('should truncate strings correctly', () => {
      const truncate = (str: string, maxLen: number) => {
        if (str.length <= maxLen) return str;
        return str.slice(0, maxLen - 3) + '...';
      };
      
      expect(truncate('Hello World', 20)).toBe('Hello World');
      expect(truncate('Hello World', 8)).toBe('Hello...');
      expect(truncate('Hi', 5)).toBe('Hi');
    });

    it('should format file sizes', () => {
      const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
      };
      
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('Array Utilities', () => {
    it('should remove duplicates from array', () => {
      const unique = <T>(arr: T[]): T[] => [...new Set(arr)];
      
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a'])).toEqual(['a', 'b']);
    });

    it('should chunk arrays correctly', () => {
      const chunk = <T>(arr: T[], size: number): T[][] => {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          chunks.push(arr.slice(i, i + size));
        }
        return chunks;
      };
      
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });
  });

  describe('Validation Utilities', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
      };
      
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
      expect(isValidEmail('user@sub.domain.com')).toBe(true);
    });

    it('should validate URL format', () => {
      const isValidUrl = (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };
      
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
    });
  });

  describe('Date Utilities', () => {
    it('should format relative time', () => {
      const formatRelativeTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        return `${diffDay}d ago`;
      };
      
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
      
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
      
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });
  });
});
