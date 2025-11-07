/**
 * Error Tracking Service
 * Production-ready error tracking with Sentry integration
 */

import * as Sentry from '@sentry/node';
import { createLogger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

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
  private stats: ErrorStats = {
    totalErrors: 0,
    errorsByType: new Map(),
    errorsByEndpoint: new Map(),
    recentErrors: [],
  };
  private maxRecentErrors = 100;

  initialize() {
    if (this.initialized) {
      logger.warn('Error tracking already initialized');
      return;
    }

    const dsn = process.env.SENTRY_DSN;
    const environment = process.env.NODE_ENV || 'development';

    if (environment === 'production' && dsn) {
      try {
        Sentry.init({
          dsn,
          environment,
          release: process.env.RELEASE_VERSION || 'unknown',
          tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
          profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
          
          // Performance monitoring
          integrations: [
            // HTTP integration for Express
            new Sentry.Integrations.Http({ tracing: true }),
            // Request data integration
            new Sentry.Integrations.RequestData({
              include: {
                data: true,
                headers: true,
                query_string: true,
                url: true,
                user: true,
              },
            }),
            // Console integration
            new Sentry.Integrations.Console(),
          ],
          
          // Before send hook for filtering
          beforeSend: (event, hint) => {
            // Filter out certain errors
            if (this.shouldIgnoreError(event, hint)) {
              return null;
            }
            
            // Add additional context
            if (event.extra) {
              event.extra.errorStats = this.getStats();
            }
            
            return event;
          },
          
          // Before breadcrumb hook
          beforeBreadcrumb: (breadcrumb) => {
            // Filter sensitive data from breadcrumbs
            if (breadcrumb.category === 'console' && breadcrumb.data) {
              breadcrumb.data = this.sanitizeData(breadcrumb.data);
            }
            return breadcrumb;
          },
        });

        this.initialized = true;
        logger.info('Sentry error tracking initialized', { environment });
      } catch (error) {
        logger.error('Failed to initialize Sentry:', error);
      }
    } else if (environment === 'production' && !dsn) {
      logger.warn('SENTRY_DSN not configured in production environment');
    } else {
      logger.info('Error tracking disabled in development environment');
    }

    // Set up global error handlers
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.captureException(error, { type: 'uncaughtException' });
      
      // Give Sentry time to send the error before crashing
      if (this.initialized) {
        Sentry.flush(2000).then(() => {
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
      this.captureException(new Error(`Unhandled Rejection: ${reason}`), {
        type: 'unhandledRejection',
        promise: String(promise),
      });
    });

    // Handle warnings
    process.on('warning', (warning) => {
      logger.warn('Process Warning:', warning);
      this.captureMessage(`Process Warning: ${warning.message}`, 'warning', {
        stack: warning.stack,
      });
    });
  }

  private shouldIgnoreError(event: Sentry.Event, hint?: Sentry.EventHint): boolean {
    const error = hint?.originalException;
    
    // Ignore certain error types
    const ignoredErrors = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
      'Failed to fetch',
    ];
    
    const errorMessage = error?.message || event.message || '';
    
    return ignoredErrors.some((ignored) => 
      errorMessage.includes(ignored)
    );
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'apiKey'];
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  captureException(error: Error | unknown, context?: ErrorContext) {
    // Update statistics
    this.updateStats(error, context);

    // Log the error
    logger.error('Captured exception:', error, context);

    // Send to Sentry if initialized
    if (this.initialized && process.env.NODE_ENV === 'production') {
      const sentryContext = this.sanitizeData(context || {});
      
      Sentry.withScope((scope) => {
        // Set context
        if (sentryContext) {
          scope.setContext('custom', sentryContext);
        }
        
        // Set user if available
        if (sentryContext.userId) {
          scope.setUser({ id: sentryContext.userId });
        }
        
        // Set tags
        if (sentryContext.endpoint) {
          scope.setTag('endpoint', sentryContext.endpoint);
        }
        if (sentryContext.method) {
          scope.setTag('method', sentryContext.method);
        }
        
        // Capture the exception
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureException(new Error(String(error)));
        }
      });
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    // Log the message
    const logMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info';
    logger[logMethod](`Captured message: ${message}`, context);

    // Send to Sentry if initialized
    if (this.initialized && process.env.NODE_ENV === 'production') {
      const sentryLevel = level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info';
      
      Sentry.withScope((scope) => {
        if (context) {
          scope.setContext('custom', this.sanitizeData(context));
        }
        
        Sentry.captureMessage(message, sentryLevel);
      });
    }
  }

  private updateStats(error: Error | unknown, context?: ErrorContext) {
    this.stats.totalErrors++;

    // Update error type stats
    const errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    const typeCount = this.stats.errorsByType.get(errorType) || 0;
    this.stats.errorsByType.set(errorType, typeCount + 1);

    // Update endpoint stats
    if (context?.endpoint) {
      const endpointCount = this.stats.errorsByEndpoint.get(context.endpoint) || 0;
      this.stats.errorsByEndpoint.set(context.endpoint, endpointCount + 1);
    }

    // Add to recent errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.stats.recentErrors.unshift({
      timestamp: new Date(),
      message: errorMessage.substring(0, 200),
      type: errorType,
    });

    // Keep only recent errors
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

  // Express error handler middleware
  errorHandler() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
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

      // Determine status code
      const statusCode = (error as any).statusCode || (error as any).status || 500;

      // Send error response
      res.status(statusCode).json({
        error: {
          message: process.env.NODE_ENV === 'production' 
            ? 'An error occurred processing your request' 
            : error.message,
          statusCode,
          ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
        },
      });
    };
  }

  // Request handler for adding Sentry tracing
  requestHandler() {
    if (this.initialized) {
      return Sentry.Handlers.requestHandler();
    }
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  // Tracing handler
  tracingHandler() {
    if (this.initialized) {
      return Sentry.Handlers.tracingHandler();
    }
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  async flush(timeout: number = 2000): Promise<boolean> {
    if (this.initialized) {
      return Sentry.flush(timeout);
    }
    return true;
  }

  close(timeout: number = 2000): Promise<boolean> {
    if (this.initialized) {
      return Sentry.close(timeout);
    }
    return Promise.resolve(true);
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();