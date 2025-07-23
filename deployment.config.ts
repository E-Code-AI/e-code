// Production Deployment Configuration for Replit Clone

export const deploymentConfig = {
  production: {
    // Server configuration
    server: {
      port: process.env.PORT || 5000,
      host: '0.0.0.0',
      trustProxy: true,
      compression: true,
      rateLimiting: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
      }
    },

    // Database configuration
    database: {
      connectionPool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        keepaliveIntervalMillis: 10000
      },
      ssl: {
        rejectUnauthorized: true
      }
    },

    // Security configuration
    security: {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://plot.replit.app'],
        credentials: true,
        maxAge: 86400
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "wss:", "https:"],
            frameSrc: ["'self'", "https:"],
            workerSrc: ["'self'", "blob:"],
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      },
      session: {
        secret: process.env.SESSION_SECRET || 'change-this-in-production',
        cookie: {
          secure: true,
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
      }
    },

    // Monitoring configuration
    monitoring: {
      sentry: {
        dsn: process.env.SENTRY_DSN,
        environment: 'production',
        tracesSampleRate: 0.1,
        integrations: ['Http', 'Express', 'Postgres']
      },
      logging: {
        level: 'info',
        format: 'json',
        transports: ['console', 'file'],
        maxFiles: 5,
        maxSize: '20m'
      },
      metrics: {
        enabled: true,
        port: 9090,
        path: '/metrics',
        defaultLabels: {
          app: 'replit-clone',
          environment: 'production'
        }
      }
    },

    // Performance optimization
    performance: {
      caching: {
        redis: {
          url: process.env.REDIS_URL,
          ttl: 3600, // 1 hour default
          keyPrefix: 'plot:'
        },
        staticAssets: {
          maxAge: 31536000, // 1 year for static assets with hash
          immutable: true
        }
      },
      cdn: {
        enabled: true,
        url: process.env.CDN_URL || 'https://cdn.plot.replit.app'
      },
      compression: {
        level: 6,
        threshold: 1024,
        filter: (req: any) => {
          return req.headers['x-no-compression'] ? false : true;
        }
      }
    },

    // Resource limits
    limits: {
      fileUpload: {
        maxSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 100,
        allowedExtensions: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rb', '.php', '.html', '.css', '.json', '.xml', '.yaml', '.yml', '.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf']
      },
      projectSize: {
        maxSizeMB: 500,
        maxFiles: 10000
      },
      execution: {
        timeout: 30000, // 30 seconds
        memory: '512m',
        cpu: '0.5'
      }
    },

    // External services
    services: {
      email: {
        provider: 'sendgrid',
        apiKey: process.env.SENDGRID_API_KEY,
        from: 'noreply@plot.replit.app'
      },
      storage: {
        provider: 's3',
        bucket: process.env.S3_BUCKET,
        region: process.env.AWS_REGION || 'us-west-2'
      },
      queue: {
        provider: 'bull',
        redis: process.env.REDIS_URL
      }
    },

    // Feature flags
    features: {
      collaboration: true,
      ai: true,
      deployments: true,
      extensions: true,
      billing: process.env.STRIPE_SECRET_KEY ? true : false,
      analytics: true,
      search: true,
      templates: true
    }
  }
};

// Environment-specific overrides
export function getConfig(env: string = process.env.NODE_ENV || 'development') {
  if (env === 'production') {
    return deploymentConfig.production;
  }
  
  // Development overrides
  return {
    ...deploymentConfig.production,
    server: {
      ...deploymentConfig.production.server,
      trustProxy: false,
      rateLimiting: {
        ...deploymentConfig.production.server.rateLimiting,
        max: 1000 // More lenient in development
      }
    },
    security: {
      ...deploymentConfig.production.security,
      cors: {
        origin: true, // Allow all origins in development
        credentials: true
      },
      helmet: {
        contentSecurityPolicy: false // Disable CSP in development
      },
      session: {
        ...deploymentConfig.production.security.session,
        cookie: {
          ...deploymentConfig.production.security.session.cookie,
          secure: false // Allow non-HTTPS in development
        }
      }
    },
    monitoring: {
      ...deploymentConfig.production.monitoring,
      sentry: {
        ...deploymentConfig.production.monitoring.sentry,
        enabled: false
      },
      metrics: {
        ...deploymentConfig.production.monitoring.metrics,
        enabled: false
      }
    }
  };
}