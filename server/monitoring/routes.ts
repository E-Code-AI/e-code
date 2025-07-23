import { Router } from 'express';
import { performanceMonitor, getHealthCheck } from './performance';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  const health = getHealthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Performance metrics endpoint
router.get('/metrics', (req, res) => {
  const format = req.query.format as string || 'json';
  
  if (format === 'prometheus') {
    res.set('Content-Type', 'text/plain');
    res.send(performanceMonitor.exportMetrics('prometheus'));
  } else {
    res.json(performanceMonitor.exportMetrics('json'));
  }
});

// Performance statistics endpoint
router.get('/stats', (req, res) => {
  const { endpoint, start, end } = req.query;
  
  let timeRange;
  if (start && end) {
    timeRange = {
      start: new Date(start as string),
      end: new Date(end as string)
    };
  }
  
  const stats = performanceMonitor.getStats(endpoint as string, timeRange);
  res.json(stats);
});

// Endpoint performance ranking
router.get('/endpoints', (req, res) => {
  const rankings = performanceMonitor.getEndpointRanking();
  res.json(rankings);
});

// Real-time metrics
router.get('/realtime', (req, res) => {
  const metrics = performanceMonitor.getRealTimeMetrics();
  res.json(metrics);
});

// Performance bottlenecks
router.get('/bottlenecks', (req, res) => {
  const bottlenecks = performanceMonitor.identifyBottlenecks();
  res.json(bottlenecks);
});

// Server-sent events for real-time monitoring
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial data
  res.write(`data: ${JSON.stringify(performanceMonitor.getRealTimeMetrics())}\n\n`);
  
  // Send updates every 5 seconds
  const interval = setInterval(() => {
    const metrics = performanceMonitor.getRealTimeMetrics();
    res.write(`data: ${JSON.stringify(metrics)}\n\n`);
  }, 5000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;