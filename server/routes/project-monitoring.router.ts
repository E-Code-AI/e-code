// @ts-nocheck
import { Router, Request, Response } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { createLogger } from '../utils/logger';

const router = Router({ mergeParams: true });
const logger = createLogger('project-monitoring');

// Per-project metrics store (in-memory; replace with DB for persistence)
const metricsStore = new Map<string, any[]>();
const alertsStore = new Map<string, any[]>();

router.use(ensureAuthenticated);

router.get('/:projectId/monitoring/metrics', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const metrics = metricsStore.get(projectId) || [];
  res.json(metrics.slice(-100));
});

router.get('/:projectId/monitoring/summary', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const metrics = metricsStore.get(projectId) || [];
  const recent = metrics.slice(-50);
  const errorCount = recent.filter(m => m.type === 'error').length;
  const requestCount = recent.filter(m => m.type === 'request').length;
  const avgResponseTime = recent.filter(m => m.responseTime)
    .reduce((sum, m, _, arr) => sum + m.responseTime / arr.length, 0);
  res.json({
    totalRequests: requestCount,
    errorCount,
    avgResponseTime: Math.round(avgResponseTime),
    uptime: process.uptime(),
    lastUpdated: new Date().toISOString(),
  });
});

router.get('/:projectId/monitoring/alerts', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  res.json(alertsStore.get(projectId) || []);
});

router.post('/:projectId/monitoring/record', csrfProtection, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const metric = {
    id: `m-${Date.now()}`,
    type: req.body.type || 'heartbeat',
    value: req.body.value,
    responseTime: req.body.responseTime,
    timestamp: new Date().toISOString(),
  };
  const existing = metricsStore.get(projectId) || [];
  // Keep last 500 metrics
  metricsStore.set(projectId, [...existing.slice(-499), metric]);
  logger.debug(`[Monitoring] Recorded metric for project ${projectId}: ${metric.type}`);
  res.json({ success: true });
});

router.post('/:projectId/monitoring/alerts', csrfProtection, async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const alert = {
    id: `a-${Date.now()}`,
    name: req.body.name,
    metricType: req.body.metricType,
    threshold: req.body.threshold,
    createdAt: new Date().toISOString(),
    active: true,
  };
  const existing = alertsStore.get(projectId) || [];
  alertsStore.set(projectId, [...existing, alert]);
  res.status(201).json(alert);
});

router.delete('/:projectId/monitoring/alerts/:alertId', csrfProtection, async (req: Request, res: Response) => {
  const { projectId, alertId } = req.params;
  const existing = alertsStore.get(projectId) || [];
  alertsStore.set(projectId, existing.filter(a => a.id !== alertId));
  res.json({ success: true });
});

export default router;
