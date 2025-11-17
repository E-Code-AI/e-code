import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '../utils/logger';
import { db } from '../db';
import { deployments, deploymentSnapshots } from '@shared/schema';
import { eq, desc, and, gte, lte, sql, like } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();
const logger = createLogger('logs-viewer');

const logsQuerySchema = z.object({
  deploymentId: z.string().optional(),
  projectId: z.number().optional(),
  level: z.enum(['info', 'warn', 'error', 'debug', 'all']).optional().default('all'),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(100),
  offset: z.number().min(0).optional().default(0)
});

const exportLogsSchema = z.object({
  deploymentId: z.string().optional(),
  projectId: z.number().optional(),
  format: z.enum(['json', 'csv', 'txt']).default('json'),
  level: z.enum(['info', 'warn', 'error', 'debug', 'all']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  deploymentId?: string;
  projectId?: number;
  metadata?: Record<string, any>;
}

/**
 * Get deployment logs with search and filtering
 * GET /api/logs
 */
router.get('/', async (req, res) => {
  try {
    const {
      deploymentId,
      projectId,
      level,
      search,
      startDate,
      endDate,
      limit,
      offset
    } = logsQuerySchema.parse(req.query);

    // Parse logs from deployment records
    let logs: LogEntry[] = [];

    if (deploymentId) {
      const deployment = await db.query.deployments.findFirst({
        where: eq(deployments.id, deploymentId)
      });

      if (deployment && deployment.deploymentLog) {
        logs = parseDeploymentLogs(deployment.deploymentLog, deploymentId);
      }
    } else if (projectId) {
      const projectDeployments = await db.query.deployments.findMany({
        where: eq(deployments.projectId, projectId),
        orderBy: [desc(deployments.createdAt)],
        limit: 10
      });

      for (const deployment of projectDeployments) {
        if (deployment.deploymentLog) {
          logs.push(...parseDeploymentLogs(deployment.deploymentLog, deployment.id, projectId));
        }
      }
    }

    // Filter by level
    if (level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }

    // Pagination
    const total = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);

    res.json({
      logs: paginatedLogs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (error: any) {
    logger.error('Failed to fetch logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export logs to file
 * POST /api/logs/export
 */
router.post('/export', async (req, res) => {
  try {
    const {
      deploymentId,
      projectId,
      format,
      level,
      startDate,
      endDate
    } = exportLogsSchema.parse(req.body);

    // Get logs
    let logs: LogEntry[] = [];

    if (deploymentId) {
      const deployment = await db.query.deployments.findFirst({
        where: eq(deployments.id, deploymentId)
      });

      if (deployment && deployment.deploymentLog) {
        logs = parseDeploymentLogs(deployment.deploymentLog, deploymentId);
      }
    } else if (projectId) {
      const projectDeployments = await db.query.deployments.findMany({
        where: eq(deployments.projectId, projectId),
        orderBy: [desc(deployments.createdAt)]
      });

      for (const deployment of projectDeployments) {
        if (deployment.deploymentLog) {
          logs.push(...parseDeploymentLogs(deployment.deploymentLog, deployment.id, projectId));
        }
      }
    }

    // Apply filters
    if (level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }
    if (startDate) {
      const start = new Date(startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= end);
    }

    // Format output
    let output: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        output = JSON.stringify(logs, null, 2);
        contentType = 'application/json';
        filename = `logs-${Date.now()}.json`;
        break;

      case 'csv':
        output = logsToCSV(logs);
        contentType = 'text/csv';
        filename = `logs-${Date.now()}.csv`;
        break;

      case 'txt':
        output = logsToText(logs);
        contentType = 'text/plain';
        filename = `logs-${Date.now()}.txt`;
        break;

      default:
        throw new Error('Invalid format');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(output);
  } catch (error: any) {
    logger.error('Failed to export logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get log statistics
 * GET /api/logs/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { deploymentId, projectId } = req.query;

    let logs: LogEntry[] = [];

    if (deploymentId) {
      const deployment = await db.query.deployments.findFirst({
        where: eq(deployments.id, deploymentId as string)
      });

      if (deployment && deployment.deploymentLog) {
        logs = parseDeploymentLogs(deployment.deploymentLog, deploymentId as string);
      }
    } else if (projectId) {
      const projectDeployments = await db.query.deployments.findMany({
        where: eq(deployments.projectId, Number(projectId)),
        orderBy: [desc(deployments.createdAt)]
      });

      for (const deployment of projectDeployments) {
        if (deployment.deploymentLog) {
          logs.push(...parseDeploymentLogs(deployment.deploymentLog, deployment.id, Number(projectId)));
        }
      }
    }

    const stats = {
      total: logs.length,
      byLevel: {
        info: logs.filter(l => l.level === 'info').length,
        warn: logs.filter(l => l.level === 'warn').length,
        error: logs.filter(l => l.level === 'error').length,
        debug: logs.filter(l => l.level === 'debug').length
      },
      timeRange: {
        start: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
        end: logs.length > 0 ? logs[0].timestamp : null
      }
    };

    res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get log stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Parse deployment logs
 */
function parseDeploymentLogs(logMessages: string[], deploymentId: string, projectId?: number): LogEntry[] {
  return logMessages.map((message, index) => {
    let level: 'info' | 'warn' | 'error' | 'debug' = 'info';
    
    if (message.includes('❌') || message.includes('ERROR') || message.includes('Failed')) {
      level = 'error';
    } else if (message.includes('⚠️') || message.includes('WARN')) {
      level = 'warn';
    } else if (message.includes('🔍') || message.includes('DEBUG')) {
      level = 'debug';
    }

    return {
      timestamp: new Date(Date.now() - (logMessages.length - index) * 1000).toISOString(),
      level,
      message,
      deploymentId,
      projectId
    };
  });
}

/**
 * Helper: Convert logs to CSV
 */
function logsToCSV(logs: LogEntry[]): string {
  const headers = 'Timestamp,Level,Message,DeploymentID,ProjectID\n';
  const rows = logs.map(log =>
    `"${log.timestamp}","${log.level}","${log.message.replace(/"/g, '""')}","${log.deploymentId || ''}","${log.projectId || ''}"`
  ).join('\n');
  return headers + rows;
}

/**
 * Helper: Convert logs to text
 */
function logsToText(logs: LogEntry[]): string {
  return logs.map(log =>
    `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
  ).join('\n');
}

export default router;
