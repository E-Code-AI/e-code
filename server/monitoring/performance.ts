import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Performance metrics storage
interface PerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  userAgent?: string;
  ip?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics in memory
  private metricsBuffer: Map<string, PerformanceMetric[]> = new Map();
  private flushInterval = 60000; // Flush every minute

  constructor() {
    // Start the flush interval
    setInterval(() => this.flushMetrics(), this.flushInterval);
  }

  // Middleware to track performance
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = performance.now();
      const startCpu = process.cpuUsage();
      const startMem = process.memoryUsage();

      // Store original end function
      const originalEnd = res.end;
      
      // Override end function to capture metrics
      (res as any).end = function(chunk?: any, encoding?: any, callback?: any) {
        // Calculate metrics
        const duration = performance.now() - start;
        const endCpu = process.cpuUsage(startCpu);
        const endMem = process.memoryUsage();

        // Create metric object
        const metric: PerformanceMetric = {
          endpoint: req.path,
          method: req.method,
          responseTime: duration,
          statusCode: res.statusCode,
          timestamp: new Date(),
          memoryUsage: endMem,
          cpuUsage: endCpu,
          userAgent: req.get('user-agent'),
          ip: req.ip
        };

        // Store metric
        performanceMonitor.recordMetric(metric);

        // Call original end with proper arguments
        if (callback) {
          return originalEnd.call(res, chunk, encoding, callback);
        } else if (encoding && typeof encoding !== 'function') {
          return originalEnd.call(res, chunk, encoding);
        } else if (encoding && typeof encoding === 'function') {
          return originalEnd.call(res, chunk, encoding);
        } else if (chunk) {
          return originalEnd.call(res, chunk);
        } else {
          return originalEnd.call(res);
        }
      };

      next();
    };
  }

  // Record a performance metric
  recordMetric(metric: PerformanceMetric) {
    // Add to in-memory storage
    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Add to buffer for batch processing
    const key = `${metric.method}:${metric.endpoint}`;
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }
    this.metricsBuffer.get(key)!.push(metric);
  }

  // Get performance statistics
  getStats(endpoint?: string, timeRange?: { start: Date; end: Date }) {
    let filteredMetrics = this.metrics;

    // Filter by endpoint if provided
    if (endpoint) {
      filteredMetrics = filteredMetrics.filter(m => m.endpoint === endpoint);
    }

    // Filter by time range if provided
    if (timeRange) {
      filteredMetrics = filteredMetrics.filter(m => 
        m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    // Calculate statistics
    const responseTimes = filteredMetrics.map(m => m.responseTime);
    const sortedTimes = responseTimes.sort((a, b) => a - b);

    return {
      count: filteredMetrics.length,
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      p50: sortedTimes[Math.floor(sortedTimes.length * 0.5)],
      p90: sortedTimes[Math.floor(sortedTimes.length * 0.9)],
      p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)],
      p99: sortedTimes[Math.floor(sortedTimes.length * 0.99)],
      statusCodes: this.getStatusCodeDistribution(filteredMetrics),
      errorRate: filteredMetrics.filter(m => m.statusCode >= 400).length / filteredMetrics.length,
      avgMemoryUsage: this.getAvgMemoryUsage(filteredMetrics),
      avgCpuUsage: this.getAvgCpuUsage(filteredMetrics)
    };
  }

  // Get endpoint performance ranking
  getEndpointRanking() {
    const endpointStats = new Map<string, any>();

    // Group metrics by endpoint
    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointStats.has(key)) {
        endpointStats.set(key, []);
      }
      endpointStats.get(key).push(metric);
    });

    // Calculate stats for each endpoint
    const rankings = Array.from(endpointStats.entries()).map(([endpoint, metrics]) => {
      const responseTimes = metrics.map((m: PerformanceMetric) => m.responseTime);
      return {
        endpoint,
        avgResponseTime: responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length,
        callCount: metrics.length,
        errorCount: metrics.filter((m: PerformanceMetric) => m.statusCode >= 400).length
      };
    });

    // Sort by average response time (slowest first)
    return rankings.sort((a, b) => b.avgResponseTime - a.avgResponseTime);
  }

  // Get real-time metrics
  getRealTimeMetrics() {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneMinuteAgo);
    
    return {
      requestsPerMinute: recentMetrics.length,
      avgResponseTime: recentMetrics.length > 0 
        ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length 
        : 0,
      errorRate: recentMetrics.length > 0
        ? recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length
        : 0,
      currentMemoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Identify performance bottlenecks
  identifyBottlenecks() {
    const endpointStats = this.getEndpointRanking();
    const bottlenecks = [];

    // Find slow endpoints (avg response time > 1000ms)
    const slowEndpoints = endpointStats.filter(e => e.avgResponseTime > 1000);
    if (slowEndpoints.length > 0) {
      bottlenecks.push({
        type: 'slow_endpoints',
        severity: 'high',
        endpoints: slowEndpoints.slice(0, 5), // Top 5 slowest
        recommendation: 'Consider optimizing database queries, adding caching, or improving algorithm efficiency'
      });
    }

    // Find high-traffic endpoints
    const highTrafficEndpoints = endpointStats.filter(e => e.callCount > 1000);
    if (highTrafficEndpoints.length > 0) {
      bottlenecks.push({
        type: 'high_traffic',
        severity: 'medium',
        endpoints: highTrafficEndpoints.slice(0, 5),
        recommendation: 'Consider implementing rate limiting, caching, or horizontal scaling'
      });
    }

    // Find error-prone endpoints
    const errorProneEndpoints = endpointStats.filter(e => e.errorCount > 10);
    if (errorProneEndpoints.length > 0) {
      bottlenecks.push({
        type: 'high_error_rate',
        severity: 'high',
        endpoints: errorProneEndpoints.slice(0, 5),
        recommendation: 'Review error logs and implement better error handling'
      });
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapUsedPercent > 80) {
      bottlenecks.push({
        type: 'high_memory_usage',
        severity: 'critical',
        usage: memUsage,
        percentage: heapUsedPercent,
        recommendation: 'Memory usage is critically high. Check for memory leaks or increase available memory'
      });
    }

    return bottlenecks;
  }

  // Export metrics for external monitoring systems
  exportMetrics(format: 'prometheus' | 'json' = 'json') {
    if (format === 'prometheus') {
      return this.exportPrometheusMetrics();
    }
    
    return {
      timestamp: new Date(),
      metrics: this.getStats(),
      endpoints: this.getEndpointRanking(),
      realtime: this.getRealTimeMetrics(),
      bottlenecks: this.identifyBottlenecks()
    };
  }

  // Private helper methods
  private getStatusCodeDistribution(metrics: PerformanceMetric[]) {
    const distribution: { [key: string]: number } = {};
    metrics.forEach(m => {
      const category = `${Math.floor(m.statusCode / 100)}xx`;
      distribution[category] = (distribution[category] || 0) + 1;
    });
    return distribution;
  }

  private getAvgMemoryUsage(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) return 0;
    const totalHeap = metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0);
    return totalHeap / metrics.length;
  }

  private getAvgCpuUsage(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) return 0;
    const totalCpu = metrics.reduce((sum, m) => sum + (m.cpuUsage.user + m.cpuUsage.system), 0);
    return totalCpu / metrics.length;
  }

  private exportPrometheusMetrics() {
    const lines: string[] = [];
    
    // Request duration histogram
    lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
    lines.push('# TYPE http_request_duration_seconds histogram');
    
    // Group metrics by endpoint
    const grouped = new Map<string, PerformanceMetric[]>();
    this.metrics.forEach(m => {
      const key = `${m.method}_${m.endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(m);
    });

    // Generate histogram data
    grouped.forEach((metrics, key) => {
      const durations = metrics.map(m => m.responseTime / 1000); // Convert to seconds
      const sorted = durations.sort((a, b) => a - b);
      
      lines.push(`http_request_duration_seconds_count{endpoint="${key}"} ${metrics.length}`);
      lines.push(`http_request_duration_seconds_sum{endpoint="${key}"} ${durations.reduce((a, b) => a + b, 0)}`);
      
      // Buckets
      const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
      buckets.forEach(bucket => {
        const count = sorted.filter(d => d <= bucket).length;
        lines.push(`http_request_duration_seconds_bucket{endpoint="${key}",le="${bucket}"} ${count}`);
      });
      lines.push(`http_request_duration_seconds_bucket{endpoint="${key}",le="+Inf"} ${metrics.length}`);
    });

    // Memory usage gauge
    const memUsage = process.memoryUsage();
    lines.push('# HELP nodejs_heap_size_used_bytes Process heap size used in bytes');
    lines.push('# TYPE nodejs_heap_size_used_bytes gauge');
    lines.push(`nodejs_heap_size_used_bytes ${memUsage.heapUsed}`);

    return lines.join('\n');
  }

  private flushMetrics() {
    // Here you would typically send metrics to an external monitoring service
    // For now, we'll just clear the buffer
    if (this.metricsBuffer.size > 0) {
      console.log(`Flushing ${this.metricsBuffer.size} endpoint metrics`);
      this.metricsBuffer.clear();
    }
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Health check endpoint data
export function getHealthCheck() {
  const metrics = performanceMonitor.getRealTimeMetrics();
  const bottlenecks = performanceMonitor.identifyBottlenecks();
  
  return {
    status: bottlenecks.some(b => b.severity === 'critical') ? 'unhealthy' : 'healthy',
    timestamp: new Date(),
    uptime: metrics.uptime,
    memory: metrics.currentMemoryUsage,
    performance: {
      requestsPerMinute: metrics.requestsPerMinute,
      avgResponseTime: metrics.avgResponseTime,
      errorRate: metrics.errorRate
    },
    issues: bottlenecks
  };
}