import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { deploymentManager } from '../services/deployment-manager.js';
import { storage } from '../storage';

const router = Router();

// Deployment configuration schema
const deploymentConfigSchema = z.object({
  type: z.enum(['static', 'autoscale', 'reserved-vm', 'scheduled', 'serverless']),
  domain: z.string().optional(),
  customDomain: z.string().optional(),
  sslEnabled: z.boolean().default(true),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
  regions: z.array(z.string()).min(1),
  scaling: z.object({
    minInstances: z.number().min(1),
    maxInstances: z.number().min(1),
    targetCPU: z.number().min(10).max(90),
    targetMemory: z.number().min(10).max(90)
  }).optional(),
  scheduling: z.object({
    enabled: z.boolean(),
    cron: z.string(),
    timezone: z.string()
  }).optional(),
  resources: z.object({
    cpu: z.string(),
    memory: z.string(),
    disk: z.string()
  }).optional(),
  buildCommand: z.string().optional(),
  startCommand: z.string().optional(),
  environmentVars: z.record(z.string()).default({}),
  healthCheck: z.object({
    path: z.string(),
    port: z.number(),
    intervalSeconds: z.number().min(10),
    timeoutSeconds: z.number().min(1).max(30)
  }).optional()
});

// Create deployment
router.post('/api/projects/:projectId/deploy', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.user!.id;

    // Validate deployment configuration
    const config = deploymentConfigSchema.parse(req.body);

    // Create deployment with project ID
    const deploymentConfig = {
      id: '', // Will be generated
      projectId,
      ...config
    };

    const deploymentId = await deploymentManager.createDeployment(deploymentConfig);

    res.json({
      success: true,
      deploymentId,
      message: 'Deployment started successfully'
    });
  } catch (error) {
    console.error('Deployment creation error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create deployment'
    });
  }
});

// Get deployment status
router.get('/api/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const deployment = await deploymentManager.getDeployment(deploymentId);

    if (!deployment) {
      return res.status(404).json({
        success: false,
        message: 'Deployment not found'
      });
    }

    res.json({
      success: true,
      deployment
    });
  } catch (error) {
    console.error('Get deployment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deployment status'
    });
  }
});

// List project deployments
router.get('/api/projects/:projectId/deployments', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const deployments = await deploymentManager.listDeployments(projectId);

    res.json({
      success: true,
      deployments
    });
  } catch (error) {
    console.error('List deployments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list deployments'
    });
  }
});

// Update deployment
router.put('/api/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const updateConfig = deploymentConfigSchema.partial().parse(req.body);

    await deploymentManager.updateDeployment(deploymentId, updateConfig);

    res.json({
      success: true,
      message: 'Deployment updated successfully'
    });
  } catch (error) {
    console.error('Update deployment error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update deployment'
    });
  }
});

// Delete deployment
router.delete('/api/deployments/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    await deploymentManager.deleteDeployment(deploymentId);

    res.json({
      success: true,
      message: 'Deployment deleted successfully'
    });
  } catch (error) {
    console.error('Delete deployment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete deployment'
    });
  }
});

// Get deployment metrics
router.get('/api/deployments/:deploymentId/metrics', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const metrics = await deploymentManager.getDeploymentMetrics(deploymentId);

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deployment metrics'
    });
  }
});

// Domain management endpoints
router.post('/api/deployments/:deploymentId/domain', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { domain } = z.object({ domain: z.string() }).parse(req.body);

    await deploymentManager.addCustomDomain(deploymentId, domain);

    res.json({
      success: true,
      message: 'Custom domain added successfully'
    });
  } catch (error) {
    console.error('Add domain error:', error);
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to add custom domain'
    });
  }
});

router.delete('/api/deployments/:deploymentId/domain', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    await deploymentManager.removeCustomDomain(deploymentId);

    res.json({
      success: true,
      message: 'Custom domain removed successfully'
    });
  } catch (error) {
    console.error('Remove domain error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove custom domain'
    });
  }
});

// SSL certificate management
router.post('/api/deployments/:deploymentId/ssl/renew', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    await deploymentManager.renewSSLCertificate(deploymentId);

    res.json({
      success: true,
      message: 'SSL certificate renewed successfully'
    });
  } catch (error) {
    console.error('SSL renewal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to renew SSL certificate'
    });
  }
});

// Get available regions
router.get('/api/deployment/regions', async (req, res) => {
  const regions = [
    { id: 'us-east-1', name: 'US East (Virginia)', flag: '🇺🇸', latency: '12ms' },
    { id: 'us-west-2', name: 'US West (Oregon)', flag: '🇺🇸', latency: '45ms' },
    { id: 'eu-west-1', name: 'Europe (Ireland)', flag: '🇪🇺', latency: '78ms' },
    { id: 'eu-central-1', name: 'Europe (Frankfurt)', flag: '🇩🇪', latency: '82ms' },
    { id: 'ap-southeast-1', name: 'Asia Pacific (Singapore)', flag: '🇸🇬', latency: '155ms' },
    { id: 'ap-northeast-1', name: 'Asia Pacific (Tokyo)', flag: '🇯🇵', latency: '145ms' },
    { id: 'ap-south-1', name: 'Asia Pacific (Mumbai)', flag: '🇮🇳', latency: '178ms' },
    { id: 'sa-east-1', name: 'South America (São Paulo)', flag: '🇧🇷', latency: '195ms' }
  ];

  res.json({
    success: true,
    regions
  });
});

// Get deployment types and pricing
router.get('/api/deployment/types', async (req, res) => {
  const deploymentTypes = [
    {
      id: 'static',
      name: 'Static Hosting',
      description: 'Perfect for static websites, SPAs, and frontend applications',
      features: ['CDN Distribution', 'Instant SSL', 'Custom Domains', 'Global Edge Network'],
      pricing: {
        free: true,
        bandwidth: '100 GB/month',
        requests: '1M/month',
        price: '$0/month'
      },
      limits: {
        sites: 'Unlimited',
        buildTime: '15 minutes',
        fileSize: '25 MB'
      }
    },
    {
      id: 'autoscale',
      name: 'Autoscale',
      description: 'Automatically scales based on traffic with zero configuration',
      features: ['Auto Scaling', 'Load Balancing', 'Health Monitoring', 'Zero Downtime'],
      pricing: {
        free: false,
        compute: '$0.05/hour per instance',
        bandwidth: '$0.01/GB',
        price: 'Pay per use'
      },
      limits: {
        instances: '100 max',
        memory: '8 GB per instance',
        timeout: '15 minutes'
      }
    },
    {
      id: 'reserved-vm',
      name: 'Reserved VM',
      description: 'Dedicated virtual machine with guaranteed resources',
      features: ['Dedicated Resources', 'Full Root Access', 'Custom Configuration', 'SLA Guarantee'],
      pricing: {
        free: false,
        small: '$15/month (1 vCPU, 2GB RAM)',
        medium: '$30/month (2 vCPU, 4GB RAM)',
        large: '$60/month (4 vCPU, 8GB RAM)'
      },
      limits: {
        uptime: '99.9% SLA',
        support: '24/7',
        backup: 'Daily snapshots'
      }
    },
    {
      id: 'serverless',
      name: 'Serverless Functions',
      description: 'Event-driven functions that scale automatically',
      features: ['Zero Cold Start', 'Event Triggers', 'Auto Scaling', 'Pay per Execution'],
      pricing: {
        free: true,
        requests: '1M free/month',
        execution: '$0.0000002 per request',
        price: 'Pay per execution'
      },
      limits: {
        memory: '512 MB max',
        timeout: '30 seconds',
        payload: '6 MB'
      }
    },
    {
      id: 'scheduled',
      name: 'Scheduled Jobs',
      description: 'Run tasks on a schedule with cron-like functionality',
      features: ['Cron Scheduling', 'Timezone Support', 'Retry Logic', 'Monitoring'],
      pricing: {
        free: true,
        jobs: '100 free/month',
        execution: '$0.001 per job',
        price: 'Pay per execution'
      },
      limits: {
        frequency: '1 minute minimum',
        timeout: '15 minutes',
        concurrent: '10 jobs'
      }
    }
  ];

  res.json({
    success: true,
    deploymentTypes
  });
});

export default router;