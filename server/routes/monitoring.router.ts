/**
 * Monitoring API Routes
 * Provides real-time metrics dashboard endpoints
 * SECURITY: All privileged endpoints require admin authentication
 */

import { Router, Request, Response } from 'express';
import { monitoringService } from '../services/monitoring.service';
import { redisCache } from '../services/redis-cache.service';
import { ensureAdmin } from '../middleware/admin-auth';

const router = Router();

/**
 * Get all metrics for dashboard
 */
router.get('/api/monitoring/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = monitoringService.getAllMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
});

/**
 * Get specific metric history
 */
router.get('/api/monitoring/metrics/:name/history', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const history = monitoringService.getMetricHistory(name, limit);
    res.json({ name, history });
  } catch (error) {
    console.error('Error fetching metric history:', error);
    res.status(500).json({ message: 'Failed to fetch metric history' });
  }
});

/**
 * Get system health check
 * Returns 503 if unhealthy (for K8s readiness probes)
 */
router.get('/api/monitoring/health', async (req: Request, res: Response) => {
  try {
    const health = monitoringService.getHealthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Health check failed' 
    });
  }
});

/**
 * Get system health summary
 * ALWAYS returns 200 with status field for frontend consumption
 * Frontend can display degraded state without throwing errors
 */
router.get('/api/monitoring/health/summary', async (req: Request, res: Response) => {
  try {
    const health = monitoringService.getHealthCheck();
    
    // Always return 200, include status in response body
    res.status(200).json({
      ...health,
      ok: health.status === 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    // Even on error, return 200 with degraded status
    res.status(200).json({ 
      status: 'degraded',
      ok: false,
      message: 'Health check partially failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Redis cache statistics
 */
router.get('/api/monitoring/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await redisCache.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ message: 'Failed to fetch cache stats' });
  }
});

/**
 * Flush Redis cache (admin only)
 * SECURITY: Critical operation - requires admin authentication
 */
router.post('/api/monitoring/cache/flush', ensureAdmin, async (req: Request, res: Response) => {
  try {
    const success = await redisCache.flushAll();
    
    // Log this critical action for audit trail
    console.warn('[SECURITY] Cache flush requested by admin:', {
      userId: req.user?.id,
      username: req.user?.username,
      ip: req.ip,
      success
    });
    
    res.json({ 
      success,
      message: success ? 'Cache flushed successfully' : 'Failed to flush cache'
    });
  } catch (error) {
    console.error('Error flushing cache:', error);
    res.status(500).json({ message: 'Failed to flush cache' });
  }
});

export default router;
