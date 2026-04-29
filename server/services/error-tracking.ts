/**
 * Error Tracking Service
 * Local stats are always enabled. Sentry is enabled opportunistically when
 * SENTRY_DSN is configured and the package is available in the runtime bundle.
 */

import { createLogger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import type { Application } from 'express';

const logger = createLogger('error-tracking');

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  [key: string]: any;
}

interface ErrorStats {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByEndpoint: Map<string, number>;
  recentErrors: Array<{ timestamp: Date; message: string; type: string }>;
}

export class ErrorTrackingService {
  private initialized = false;
  private sentry: any = null;
  private sentryInitPromise: Promise<void> | null = null;
  private pendingExpressApp: Application | null = null;
  private stats: ErrorStats = {
    totalErrors: 0,
    errorsByType: new Map(),
    errorsByEndpoint: new Map(),
    recentErrors: [],
  };
  private maxRecentErrors = 100;

  initialize() {
    if (this.initialized) return;
    this.initialized = true;

    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      this.sentryInitPromise = this.initializeSentry(dsn);
    } else {
      logger.info('Error tracking initialized (local stats only)');
    }

    this.setupGlobalHandlers();
  }

  private async initializeSentry(dsn: string): Promise<void> {
    try {
      const Sentry = await import('@sentry/node');
      this.sentry = Sentry;
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        sendDefaultPii: false,
        // Sentry v8 auto-instrumentation requires loading before express via
        // node --import. We only use Sentry for error capture (not OTEL
        // performance traces), so disable the OTEL setup to silence the
        // "express is not instrumented" boot warning. Error reporting via
        // captureException continues to work without it.
        skipOpenTelemetrySetup: true,
      });
      logger.info('Sentry error tracking initialized');

      if (this.pendingExpressApp) {
        this.attachSentryExpressHandler(this.pendingExpressApp);
      }
    } catch (error: any) {
      logger.warn(`Failed to initialize Sentry, continuing with local error tracking only: ${error?.message || error}`);
    }
  }

  private attachSentryExpressHandler(app: Application) {
    if (!this.sentry) {
      return;
    }

    try {
      // Sentry v8's setupExpressErrorHandler relies on OTEL auto-instrumentation
      // loaded before express via `node --import`. We don't run with --import,
      // so calling setupExpressErrorHandler emits the noisy "express is not
      // instrumented" warning on every boot. Register a plain Express
      // error-handling middleware instead — it covers the only thing we
      // actually use Sentry for (error capture).
      const sentry = this.sentry;
      app.use((err: any, _req: any, _res: any, next: any) => {
        try {
          sentry.captureException(err);
        } catch {
          // Sentry capture must never break the request pipeline.
        }
        return next(err);
      });
      logger.info('Sentry Express error handler registered');
    } catch (error: any) {
      logger.warn(`Failed to register Sentry Express error handler: ${error?.message || error}`);
    }
  }

  private setupGlobalHandlers() {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.captureException(error, { type: 'uncaughtException' });
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
      this.captureException(new Error(`Unhandled Rejection: ${reason}`), {
        type: 'unhandledRejection',
      });
    });

    process.on('warning', (warning) => {
      logger.warn('Process Warning:', warning);
    });
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'apiKey'];
    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    return sanitized;
  }

  captureException(error: Error | unknown, context?: ErrorContext) {
    this.updateStats(error, context);
    if (this.sentry) {
      this.sentry.withScope((scope: any) => {
        if (context?.userId) scope.setUser({ id: context.userId });
        if (context) {
          Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
        }
        this.sentry.captureException(error);
      });
    }
    logger.error('Captured exception:', error, context);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    const logMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info';
    if (this.sentry) {
      this.sentry.captureMessage(message, level === 'warning' ? 'warning' : level);
    }
    logger[logMethod](`Captured message: ${message}`, context);
  }

  private updateStats(error: Error | unknown, context?: ErrorContext) {
    this.stats.totalErrors++;
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    const typeCount = this.stats.errorsByType.get(errorType) || 0;
    this.stats.errorsByType.set(errorType, typeCount + 1);

    if (context?.endpoint) {
      const endpointCount = this.stats.errorsByEndpoint.get(context.endpoint) || 0;
      this.stats.errorsByEndpoint.set(context.endpoint, endpointCount + 1);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.stats.recentErrors.unshift({
      timestamp: new Date(),
      message: errorMessage.substring(0, 200),
      type: errorType,
    });

    if (this.stats.recentErrors.length > this.maxRecentErrors) {
      this.stats.recentErrors = this.stats.recentErrors.slice(0, this.maxRecentErrors);
    }
  }

  getStats(): ErrorStats {
    return {
      ...this.stats,
      errorsByType: new Map(this.stats.errorsByType),
      errorsByEndpoint: new Map(this.stats.errorsByEndpoint),
      recentErrors: [...this.stats.recentErrors],
    };
  }

  errorHandler() {
    return (error: Error, req: Request, res: Response, _next: NextFunction) => {
      const context: ErrorContext = {
        endpoint: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        sessionId: (req as any).sessionID,
        userId: (req as any).user?.id,
        query: req.query,
        body: this.sanitizeData(req.body),
      };
      this.captureException(error, context);

      const statusCode = (error as any).statusCode || (error as any).status || 500;
      res.status(statusCode).json({
        error: {
          message:
            process.env.NODE_ENV === 'production'
              ? 'An error occurred processing your request'
              : error.message,
          statusCode,
          ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
        },
      });
    };
  }

  setupExpressErrorHandler(app: Application) {
    this.pendingExpressApp = app;
    if (this.sentry) {
      this.attachSentryExpressHandler(app);
      return;
    }

    if (this.sentryInitPromise) {
      this.sentryInitPromise.catch(() => {});
    }

    logger.info('Express error handler registered (local stats only)');
  }

  userContextMiddleware() {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  async flush(_timeout: number = 2000): Promise<boolean> {
    return true;
  }

  close(_timeout: number = 2000): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export const errorTracking = new ErrorTrackingService();
