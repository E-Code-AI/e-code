/**
 * Enterprise Analytics System
 * Fortune 500-grade analytics and monitoring
 */

import { useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  endpoint?: string;
  batchSize: number;
  batchInterval: number;
  sampling: number; // 0-1, percentage of events to track
}

// ============================================================================
// ANALYTICS MANAGER
// ============================================================================

class AnalyticsManager {
  private config: AnalyticsConfig;
  private queue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private batchTimer?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      debug: process.env.NODE_ENV === 'development',
      batchSize: 10,
      batchInterval: 5000, // 5 seconds
      sampling: 1.0, // Track 100% of events by default
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializePerformanceMonitoring();
    this.startBatchProcessing();

    if (this.config.debug) {
      console.log('[Analytics] Initialized', {
        sessionId: this.sessionId,
        config: this.config,
      });
    }
  }

  /**
   * Track a custom event
   */
  track(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled || !this.shouldSample()) {
      return;
    }

    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.queue.push(event);

    if (this.config.debug) {
      console.log('[Analytics] Event tracked', event);
    }

    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track page view
   */
  trackPageView(page: string, metadata?: Record<string, any>): void {
    this.track('Navigation', 'PageView', page, undefined, metadata);
  }

  /**
   * Track user interaction
   */
  trackInteraction(element: string, metadata?: Record<string, any>): void {
    this.track('Interaction', 'Click', element, undefined, metadata);
  }

  /**
   * Track error
   */
  trackError(
    error: Error,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): void {
    this.track('Error', severity, error.message, undefined, {
      ...metadata,
      stack: error.stack,
      name: error.name,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: PerformanceMetric): void {
    if (!this.config.enabled) return;

    this.track('Performance', metric.name, undefined, metric.value, {
      unit: metric.unit,
      ...metric.metadata,
    });
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
    if (this.config.debug) {
      console.log('[Analytics] User ID set', userId);
    }
  }

  /**
   * Flush events immediately
   */
  flush(): void {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    if (this.config.endpoint) {
      this.sendToBackend(events);
    }

    // Also send to console in debug mode
    if (this.config.debug) {
      console.log('[Analytics] Batch sent', {
        count: events.length,
        events,
      });
    }

    // Send to analytics providers (Google Analytics, Mixpanel, etc.)
    this.sendToProviders(events);
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor Web Vitals
    this.monitorWebVitals();

    // Monitor Long Tasks
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'longtask') {
              this.trackPerformance({
                name: 'LongTask',
                value: entry.duration,
                unit: 'ms',
                timestamp: Date.now(),
                metadata: {
                  startTime: entry.startTime,
                },
              });
            }
          }
        });

        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // PerformanceObserver not supported
      }
    }

    // Monitor memory usage
    if ('memory' in performance && (performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.trackPerformance({
          name: 'MemoryUsage',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now(),
          metadata: {
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
          },
        });
      }, 60000); // Every minute
    }
  }

  /**
   * Monitor Web Vitals (CLS, FID, LCP)
   */
  private monitorWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.trackPerformance({
            name: 'LCP',
            value: lastEntry.startTime,
            unit: 'ms',
            timestamp: Date.now(),
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {}
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackPerformance({
              name: 'FID',
              value: (entry as any).processingStart - entry.startTime,
              unit: 'ms',
              timestamp: Date.now(),
            });
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {}
    }

    // Cumulative Layout Shift (CLS)
    let clsScore = 0;
    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsScore += (entry as any).value;
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // Report CLS on page unload
        window.addEventListener('beforeunload', () => {
          this.trackPerformance({
            name: 'CLS',
            value: clsScore,
            unit: 'count',
            timestamp: Date.now(),
          });
        });
      } catch (e) {}
    }
  }

  /**
   * Send events to backend
   */
  private async sendToBackend(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.endpoint) return;

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      if (this.config.debug) {
        console.error('[Analytics] Failed to send events', error);
      }
    }
  }

  /**
   * Send to analytics providers
   */
  private sendToProviders(events: AnalyticsEvent[]): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      events.forEach((event) => {
        (window as any).gtag('event', event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
          ...event.metadata,
        });
      });
    }

    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      events.forEach((event) => {
        (window as any).mixpanel.track(`${event.category}_${event.action}`, {
          label: event.label,
          value: event.value,
          ...event.metadata,
        });
      });
    }

    // Custom providers can be added here
  }

  /**
   * Start batch processing
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.flush();
    }, this.config.batchInterval);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if event should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampling;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.flush();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const analytics = new AnalyticsManager({
  enabled: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT,
  batchSize: 10,
  batchInterval: 5000,
  sampling: 1.0,
});

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to track page views
 */
export function usePageView(page: string, metadata?: Record<string, any>) {
  useEffect(() => {
    analytics.trackPageView(page, metadata);
  }, [page, JSON.stringify(metadata)]);
}

/**
 * Hook to track interactions
 */
export function useTrackInteraction() {
  return useCallback((element: string, metadata?: Record<string, any>) => {
    analytics.trackInteraction(element, metadata);
  }, []);
}

/**
 * Hook for performance tracking
 */
export function usePerformanceTracking(componentName: string) {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    // Track component mount time
    const renderTime = Date.now() - mountTime.current;
    analytics.trackPerformance({
      name: `Component_${componentName}_Mount`,
      value: renderTime,
      unit: 'ms',
      timestamp: Date.now(),
    });

    return () => {
      // Track component lifetime
      const lifetime = Date.now() - mountTime.current;
      analytics.trackPerformance({
        name: `Component_${componentName}_Lifetime`,
        value: lifetime,
        unit: 'ms',
        timestamp: Date.now(),
      });
    };
  }, [componentName]);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Track function execution time
 */
export function trackExecution<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);

    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        analytics.trackPerformance({
          name: `Function_${name}`,
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
        });
      });
    } else {
      const duration = performance.now() - start;
      analytics.trackPerformance({
        name: `Function_${name}`,
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
      });
      return result;
    }
  }) as T;
}

export default analytics;
