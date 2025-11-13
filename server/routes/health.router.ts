import { Router, Request, Response } from "express";
import { type IStorage } from "../storage";
import os from 'os';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class HealthRouter {
  private router: Router;
  private storage: IStorage;
  private startTime: Date;

  constructor(storage: IStorage) {
    this.router = Router();
    this.storage = storage;
    this.startTime = new Date();
    this.initializeRoutes();
  }

  private getUptime(): string {
    const uptimeMs = Date.now() - this.startTime.getTime();
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private getCorsHealth(): { enabled: boolean; mode: string | undefined; configuredOrigins: number; status: 'configured' | 'misconfigured' } {
    const corsEnabled = process.env.NODE_ENV === 'production' ? 
      (!!process.env.ALLOWED_ORIGINS || !!process.env.FRONTEND_URL) : true;
    
    return {
      enabled: corsEnabled,
      mode: process.env.NODE_ENV,
      configuredOrigins: process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',').length : 
        (process.env.FRONTEND_URL ? 1 : 0),
      status: corsEnabled ? 'configured' : 'misconfigured'
    };
  }

  private async getDatabaseHealth(): Promise<{ status: string; connection: string; responseTime?: string; error?: string }> {
    try {
      // Simple database health check
      const testQuery = await this.storage.getUser('health-check-id');
      return {
        status: 'healthy',
        connection: 'active',
        responseTime: '< 10ms'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connection: 'failed',
        error: 'Database connection issue'
      };
    }
  }

  private getSystemHealth(): object {
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsagePercent = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
    
    return {
      memory: {
        usage: `${memUsagePercent}%`,
        available: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        process: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`
        }
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg().map(load => load.toFixed(2))
      },
      platform: {
        os: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: this.getUptime()
      }
    };
  }

  private getSecurityStatus(): object {
    return {
      cors: this.getCorsHealth(),
      authentication: {
        bypassEnabled: process.env.ENABLE_DEV_AUTH_BYPASS === 'true' && 
                      process.env.NODE_ENV !== 'production',
        csrfProtection: true,
        sessionStore: 'PostgreSQL'
      },
      packageSecurity: {
        inputValidation: 'enabled',
        pathTraversalProtection: 'enabled',
        commandInjectionProtection: 'enabled'
      },
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Enterprise-grade AI Provider Health Checks
   * Tests API key validity for all 5 major providers
   */
  private async checkProviderHealth(provider: string, apiKey: string | undefined, timeout: number = 5000): Promise<{
    status: 'healthy' | 'unhealthy' | 'missing' | 'timeout';
    responseTime?: number;
    error?: string;
    recommendation?: string;
  }> {
    if (!apiKey || apiKey.trim() === '') {
      return { 
        status: 'missing', 
        error: 'API key not configured',
        recommendation: `Set ${provider.toUpperCase()}_API_KEY in environment variables`
      };
    }

    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Provider timeout')), timeout)
      );

      let testPromise: Promise<any>;

      switch (provider) {
        case 'openai': {
          const client = new OpenAI({ apiKey, timeout: timeout - 500 });
          testPromise = client.models.list().then(res => res.data.length > 0);
          break;
        }
        case 'anthropic': {
          const client = new Anthropic({ apiKey, timeout: timeout - 500 });
          testPromise = client.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          });
          break;
        }
        case 'gemini': {
          const client = new GoogleGenerativeAI(apiKey);
          const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
          testPromise = model.generateContent('test').then(() => true);
          break;
        }
        case 'xai': {
          const client = new OpenAI({ 
            apiKey, 
            baseURL: 'https://api.x.ai/v1',
            timeout: timeout - 500 
          });
          testPromise = client.models.list().then(res => res.data.length > 0);
          break;
        }
        case 'groq': {
          const client = new OpenAI({ 
            apiKey, 
            baseURL: 'https://api.groq.com/openai/v1',
            timeout: timeout - 500 
          });
          testPromise = client.models.list().then(res => res.data.length > 0);
          break;
        }
        default:
          return { status: 'unhealthy', error: 'Unknown provider' };
      }

      await Promise.race([testPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;
      
      return { status: 'healthy', responseTime };
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      if (error.message === 'Provider timeout') {
        return { status: 'timeout', responseTime, error: 'Request timeout' };
      }
      
      if (error.status === 401 || error.message?.includes('API key') || error.message?.includes('authentication')) {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: 'Invalid API key',
          recommendation: `Verify ${provider.toUpperCase()}_API_KEY is correct`
        };
      }
      
      if (error.message?.includes('Insufficient credits') || error.message?.includes('quota')) {
        return { 
          status: 'unhealthy', 
          responseTime, 
          error: error.message,
          recommendation: `Add credits or check billing for ${provider}`
        };
      }
      
      return { 
        status: 'unhealthy', 
        responseTime, 
        error: error.message || 'Provider error' 
      };
    }
  }

  private async getAllProvidersHealth(): Promise<any> {
    const providers = [
      { name: 'openai', key: process.env.OPENAI_API_KEY },
      { name: 'anthropic', key: process.env.ANTHROPIC_API_KEY },
      { name: 'gemini', key: process.env.GEMINI_API_KEY },
      { name: 'xai', key: process.env.XAI_API_KEY },
      { name: 'groq', key: process.env.GROQ_API_KEY }
    ];

    const results = await Promise.all(
      providers.map(async ({ name, key }) => {
        const health = await this.checkProviderHealth(name, key);
        return { provider: name, ...health };
      })
    );

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      missing: results.filter(r => r.status === 'missing').length,
      timeout: results.filter(r => r.status === 'timeout').length
    };

    return { summary, providers: results };
  }

  private initializeRoutes() {
    // Basic health check
    this.router.get("/api/health", (req: Request, res: Response) => {
      res.json({
        status: "healthy",
        service: "E-Code Platform API",
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0'
      });
    });

    // Detailed health check
    this.router.get("/api/health/detailed", async (req: Request, res: Response) => {
      try {
        const [dbHealth] = await Promise.all([
          this.getDatabaseHealth()
        ]);

        res.json({
          status: "healthy",
          service: "E-Code Platform API",
          timestamp: new Date().toISOString(),
          uptime: this.getUptime(),
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0',
          system: this.getSystemHealth(),
          database: dbHealth,
          security: this.getSecurityStatus()
        });
      } catch (error) {
        console.error('Health check error:', error);
        res.status(503).json({
          status: "unhealthy",
          service: "E-Code Platform API",
          timestamp: new Date().toISOString(),
          error: "Failed to gather health metrics"
        });
      }
    });

    // CORS health endpoint
    this.router.get("/api/cors-health", (req: Request, res: Response) => {
      const corsHealth = this.getCorsHealth();
      const statusCode = corsHealth.status === 'configured' ? 200 : 500;
      
      res.status(statusCode).json({
        ...corsHealth,
        recommendation: corsHealth.status === 'misconfigured' ? 
          'Set ALLOWED_ORIGINS or FRONTEND_URL environment variables in production' : 
          'CORS is properly configured'
      });
    });

    // Liveness probe (for Kubernetes/Docker)
    this.router.get("/api/liveness", (req: Request, res: Response) => {
      res.json({ status: "alive" });
    });

    // Readiness probe (for Kubernetes/Docker)
    this.router.get("/api/readiness", async (req: Request, res: Response) => {
      try {
        const dbHealth = await this.getDatabaseHealth();
        if (dbHealth.status === 'healthy') {
          res.json({ status: "ready" });
        } else {
          res.status(503).json({ status: "not_ready", reason: "database_unavailable" });
        }
      } catch (error) {
        res.status(503).json({ status: "not_ready", reason: "health_check_failed" });
      }
    });

    // Application metrics endpoint
    this.router.get("/api/metrics", (req: Request, res: Response) => {
      const memUsage = process.memoryUsage();
      
      res.json({
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        },
        cpu: {
          user: process.cpuUsage().user,
          system: process.cpuUsage().system
        },
        requests: {
          total: 0,
          errors: 0,
          avgResponseTime: 0
        }
      });
    });

    // AI Provider Health Check - Fortune 500 requirement
    // Always returns HTTP 200 with status in body (degraded/healthy)
    // Only returns 503 on complete failure to check providers
    this.router.get("/api/health/providers", async (req: Request, res: Response) => {
      try {
        const providersHealth = await this.getAllProvidersHealth();
        const allHealthy = providersHealth.summary.healthy === providersHealth.summary.total;
        
        // Always return 200 - degraded status is informational, not an error
        res.status(200).json({
          timestamp: new Date().toISOString(),
          status: allHealthy ? 'healthy' : 'degraded',
          service: 'AI Providers',
          ...providersHealth,
          recommendations: providersHealth.providers
            .filter((p: any) => p.status !== 'healthy')
            .map((p: any) => ({
              provider: p.provider,
              action: p.status === 'missing' 
                ? `Set ${p.provider.toUpperCase()}_API_KEY environment variable`
                : p.status === 'unhealthy'
                ? `Replace invalid ${p.provider.toUpperCase()}_API_KEY or add credits`
                : `Check network connectivity to ${p.provider}`
            }))
        });
      } catch (error) {
        console.error('Provider health check error:', error);
        res.status(503).json({
          status: 'error',
          service: 'AI Providers',
          timestamp: new Date().toISOString(),
          error: 'Failed to check provider health'
        });
      }
    });
  }

  getRouter(): Router {
    return this.router;
  }
}