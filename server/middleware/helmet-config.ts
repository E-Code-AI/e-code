/**
 * Helmet Security Configuration
 * Comprehensive security headers for production
 */

import helmet from 'helmet';

export const helmetConfig = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'development' ? false : {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com",
        "https://code.jquery.com",
        "blob:"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "http://localhost:*"
      ],
      mediaSrc: ["'self'", "blob:", "data:"],
      connectSrc: [
        "'self'",
        "wss:",
        "ws:",
        "https:",
        "http://localhost:*",
        "https://api.anthropic.com",
        "https://api.openai.com",
        "https://*.googleapis.com",
        "https://*.replit.dev",
        "https://*.repl.co"
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://hooks.stripe.com"
      ],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
      blockAllMixedContent: [],
      upgradeInsecureRequests: [],
      reportUri: '/api/security/csp-report'
    },
    reportOnly: false
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? { policy: "require-corp" } : false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

/**
 * Additional security headers not covered by Helmet
 */
export const additionalSecurityHeaders = (req: any, res: any, next: any) => {
  // Permissions Policy (replaces Feature-Policy)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), ' +
    'magnetometer=(), accelerometer=(), gyroscope=(), ambient-light-sensor=(), ' +
    'autoplay=(), encrypted-media=(), picture-in-picture=(), sync-xhr=(), ' +
    'document-domain=(), interest-cohort=()'
  );
  
  // Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  
  // Expect-CT for certificate transparency
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }
  
  // Clear site data on logout
  if (req.path === '/api/logout' || req.path === '/api/auth/logout') {
    res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"');
  }
  
  // API-specific headers
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // CORP headers for cross-origin isolation
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  }
  
  next();
};

/**
 * CSP Report handler
 */
export const cspReportHandler = (req: any, res: any) => {
  // Log CSP violations
  console.warn('[CSP Violation]', {
    documentUri: req.body?.['document-uri'],
    violatedDirective: req.body?.['violated-directive'],
    blockedUri: req.body?.['blocked-uri'],
    lineNumber: req.body?.['line-number'],
    columnNumber: req.body?.['column-number'],
    sourceFile: req.body?.['source-file'],
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  res.status(204).end();
};

/**
 * Security headers for development
 */
export const developmentSecurityHeaders = (req: any, res: any, next: any) => {
  // More relaxed CSP for development
  res.setHeader('Content-Security-Policy-Report-Only',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
    "style-src 'self' 'unsafe-inline' *; " +
    "img-src * data: blob:; " +
    "connect-src *; " +
    "font-src *; " +
    "frame-src *; " +
    "media-src *; " +
    "object-src 'none'; " +
    "report-uri /api/security/csp-report"
  );
  
  next();
};

/**
 * Apply security headers based on environment
 */
export const applySecurityHeaders = () => {
  const middleware: any[] = [];
  
  if (process.env.NODE_ENV === 'production') {
    middleware.push(helmetConfig);
  } else {
    // Use more relaxed settings for development
    middleware.push(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));
    middleware.push(developmentSecurityHeaders);
  }
  
  middleware.push(additionalSecurityHeaders);
  
  return middleware;
};