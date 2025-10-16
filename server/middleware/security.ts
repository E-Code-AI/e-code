// @ts-nocheck
/**
 * Security Middleware
 * Fortune 500-grade security implementation
 */

import helmet from 'helmet';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';

const logger = createLogger('security');

// Content Security Policy configuration
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for React dev
      "'unsafe-eval'", // Required for some build tools
      "https://cdn.jsdelivr.net",
      "https://cdnjs.cloudflare.com",
      "https://unpkg.com"
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://cdn.jsdelivr.net"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "data:"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "http://localhost:*"
    ],
    connectSrc: [
      "'self'",
      "ws://localhost:*",
      "wss://localhost:*",
      "http://localhost:*",
      "https://api.anthropic.com",
      "https://*.googleapis.com"
    ],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'self'", "https://js.stripe.com"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
  }
};

// Main security middleware
export const securityMiddleware = (): RequestHandler[] => {
  const middlewares: RequestHandler[] = [];

  // Helmet base configuration
  middlewares.push(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? contentSecurityPolicy : false,
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Additional security headers
  middlewares.push((req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Custom headers for API security
    if (req.path.startsWith('/api')) {
      res.setHeader('X-API-Version', '1.0');
      res.setHeader('X-RateLimit-Policy', 'https://docs.example.com/rate-limits');
    }
    
    next();
  });

  return middlewares;
};

// CSRF protection
export const csrfProtection = () => {
  const tokens = new Map<string, { token: string; expires: number }>();

  return {
    generate: (sessionId: string): string => {
      const token = crypto.randomBytes(32).toString('hex');
      tokens.set(sessionId, {
        token,
        expires: Date.now() + 3600000 // 1 hour
      });
      return token;
    },

    verify: (sessionId: string, token: string): boolean => {
      const stored = tokens.get(sessionId);
      if (!stored || stored.expires < Date.now()) {
        tokens.delete(sessionId);
        return false;
      }
      return crypto.timingSafeEqual(
        Buffer.from(stored.token),
        Buffer.from(token)
      );
    },

    middleware: (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF for GET requests and API endpoints that use JWT
      if (req.method === 'GET' || req.path.startsWith('/api/public')) {
        return next();
      }

      const sessionId = req.session?.id;
      if (!sessionId) {
        return res.status(403).json({ error: 'No session found' });
      }

      const token = req.headers['x-csrf-token'] as string;
      if (!token || !csrfProtection().verify(sessionId, token)) {
        logger.warn('CSRF token validation failed', {
          ip: req.ip,
          path: req.path,
          sessionId
        });
        return res.status(403).json({ error: 'Invalid CSRF token' });
      }

      next();
    }
  };
};

// Input sanitization
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize common XSS vectors
  const sanitize = (value: any): any => {
    if (typeof value === 'string') {
      let sanitized = value
        .replace(/<\s*\/??\s*script.*?>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/[<>]/g, ''); // Remove remaining angle brackets

      sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitize(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

// SQL injection prevention (for raw queries)
export const preventSQLInjection = (query: string): string => {
  // Basic SQL injection patterns
  const dangerousPatterns = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|\*|;|'|"|`|\\)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi
  ];

  let sanitized = query;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
};

// File upload security
export const fileUploadSecurity = {
  // Allowed file types
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json'
  ],

  // Max file size (10MB)
  maxFileSize: 10 * 1024 * 1024,

  // Validate file
  validateFile: (file: Express.Multer.File): { valid: boolean; error?: string } => {
    // Check MIME type
    if (!fileUploadSecurity.allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type' };
    }

    // Check file size
    if (file.size > fileUploadSecurity.maxFileSize) {
      return { valid: false, error: 'File too large' };
    }

    // Check file extension matches MIME type
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const mimeExtMap: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/gif': ['gif'],
      'image/webp': ['webp'],
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'application/json': ['json']
    };

    const allowedExts = mimeExtMap[file.mimetype];
    if (!allowedExts || !ext || !allowedExts.includes(ext)) {
      return { valid: false, error: 'File extension mismatch' };
    }

    return { valid: true };
  },

  // Generate secure filename
  generateSecureFilename: (originalName: string): string => {
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const randomName = crypto.randomBytes(16).toString('hex');
    return `${randomName}.${ext}`;
  }
};

// API key validation
export const apiKeyValidation = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // In production, validate against database
  // For now, basic validation
  if (apiKey.length < 32) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

// Security monitoring
export const securityMonitoring = (req: Request, res: Response, next: NextFunction) => {
  // Log security-relevant events
  const securityEvent = {
    timestamp: new Date(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    suspicious: false
  };

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempt
    /union.*select/i, // SQL injection
    /eval\(/i, // Code injection
    /\${.*}/  // Template injection
  ];

  const checkString = `${req.path}${JSON.stringify(req.query)}${JSON.stringify(req.body)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      securityEvent.suspicious = true;
      logger.warn('Suspicious request detected', securityEvent);
      break;
    }
  }

  next();
};

// IP-based security
export const ipSecurity = {
  // Whitelist for admin access
  adminWhitelist: process.env.ADMIN_IP_WHITELIST?.split(',') || [],

  // Blacklist for blocked IPs
  blacklist: new Set<string>(),

  // Check if IP is allowed for admin
  isAdminIpAllowed: (ip: string): boolean => {
    if (process.env.NODE_ENV !== 'production') {
      return true; // Allow all in development
    }
    return ipSecurity.adminWhitelist.includes(ip);
  },

  // Block IP
  blockIp: (ip: string, duration: number = 3600000) => {
    ipSecurity.blacklist.add(ip);
    setTimeout(() => {
      ipSecurity.blacklist.delete(ip);
    }, duration);
  },

  // Middleware
  middleware: (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;

    if (ipSecurity.blacklist.has(clientIp)) {
      logger.warn('Blocked IP attempted access', { ip: clientIp });
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check admin routes
    if (req.path.startsWith('/admin') && !ipSecurity.isAdminIpAllowed(clientIp)) {
      logger.warn('Unauthorized admin access attempt', { ip: clientIp });
      return res.status(403).json({ error: 'Admin access restricted' });
    }

    next();
  }
};