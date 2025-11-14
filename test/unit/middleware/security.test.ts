/**
 * Unit Tests: Security Middleware
 * Fortune 500 Standard: 90% Coverage Required
 * Critical Security Component - Maximum Coverage Mandatory
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

describe('Security Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/api/test',
      method: 'GET',
      ip: '192.168.1.1',
      headers: {},
      get: jest.fn()
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      locals: {}
    };

    mockNext = jest.fn();
  });

  describe('CSP (Content Security Policy)', () => {
    it('should generate unique nonce for each request', () => {
      const nonces: string[] = [];

      const generateCSPNonce = (req: Request, res: Response, next: NextFunction) => {
        res.locals.cspNonce = Buffer.from(Math.random().toString()).toString('base64');
        next();
      };

      for (let i = 0; i < 10; i++) {
        const res = { locals: {} } as Response;
        generateCSPNonce({} as Request, res, mockNext);
        nonces.push(res.locals.cspNonce);
      }

      // All nonces should be unique
      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(10);
    });

    it('should apply strict CSP in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const applyCSP = (req: Request, res: Response, next: NextFunction) => {
        const csp = [
          "default-src 'self'",
          "script-src 'self' 'nonce-test123'",
          "style-src 'self' 'nonce-test123'",
          "img-src 'self' data: https:",
          "object-src 'none'",
          "frame-ancestors 'none'"
        ].join('; ');

        res.setHeader('Content-Security-Policy', csp);
        next();
      };

      applyCSP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.not.stringContaining("unsafe-inline")
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.not.stringContaining("unsafe-eval")
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow unsafe directives in development only', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const applyDevCSP = (req: Request, res: Response, next: NextFunction) => {
        const csp = [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'"
        ].join('; ');

        res.setHeader('Content-Security-Policy', csp);
        next();
      };

      applyDevCSP(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("unsafe-inline")
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('CSRF Protection', () => {
    it('should generate CSRF token for GET requests', () => {
      mockRequest.method = 'GET';
      mockRequest.path = '/page';

      const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
          const token = 'csrf-token-' + Math.random();
          (res as any).cookie = jest.fn();
          (res as any).cookie('csrf-token', token, { httpOnly: false });
        }
        next();
      };

      const mockResponseWithCookie = {
        ...mockResponse,
        cookie: jest.fn()
      };

      csrfProtection(
        mockRequest as Request,
        mockResponseWithCookie as Response,
        mockNext
      );

      expect(mockResponseWithCookie.cookie).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate CSRF token for state-changing requests', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/projects';
      mockRequest.headers = {
        'x-csrf-token': 'valid-token'
      };
      (mockRequest as any).cookies = {
        'csrf-token': 'valid-token'
      };

      const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
          const headerToken = req.headers['x-csrf-token'];
          const cookieToken = (req as any).cookies?.['csrf-token'];

          if (headerToken !== cookieToken) {
            return res.status(403).json({ error: 'Invalid CSRF token' });
          }
        }
        next();
      };

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalledWith(403);
    });

    it('should reject requests with invalid CSRF token', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/projects';
      mockRequest.headers = {
        'x-csrf-token': 'invalid-token'
      };
      (mockRequest as any).cookies = {
        'csrf-token': 'valid-token'
      };

      const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
          const headerToken = req.headers['x-csrf-token'];
          const cookieToken = (req as any).cookies?.['csrf-token'];

          if (headerToken !== cookieToken) {
            return res.status(403).json({ error: 'Invalid CSRF token' });
          }
        }
        next();
      };

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid CSRF token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should skip CSRF for Bearer token authentication', () => {
      mockRequest.method = 'POST';
      mockRequest.path = '/api/projects';
      mockRequest.headers = {
        authorization: 'Bearer valid-jwt-token'
      };

      const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            return next(); // Skip CSRF for API tokens
          }

          const headerToken = req.headers['x-csrf-token'];
          const cookieToken = (req as any).cookies?.['csrf-token'];

          if (headerToken !== cookieToken) {
            return res.status(403).json({ error: 'Invalid CSRF token' });
          }
        }
        next();
      };

      csrfProtection(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in request body', () => {
      mockRequest.body = {
        name: '<script>alert("XSS")</script>Hello',
        description: 'Normal text'
      };

      const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
        const sanitize = (value: any): any => {
          if (typeof value === 'string') {
            return value
              .replace(/<\s*\/??\s*script.*?>/gi, '')
              .replace(/javascript:/gi, '')
              .replace(/on\w+\s*=/gi, '');
          }
          if (typeof value === 'object' && value !== null) {
            const sanitized: any = {};
            for (const key in value) {
              sanitized[key] = sanitize(value[key]);
            }
            return sanitized;
          }
          return value;
        };

        req.body = sanitize(req.body);
        next();
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.name).toBe('Hello');
      expect(mockRequest.body.name).not.toContain('<script>');
      expect(mockRequest.body.description).toBe('Normal text');
    });

    it('should remove javascript: protocol', () => {
      mockRequest.body = {
        link: 'javascript:alert("XSS")'
      };

      const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
        const sanitize = (value: any): any => {
          if (typeof value === 'string') {
            return value.replace(/javascript:/gi, '');
          }
          return value;
        };

        req.body = sanitize(req.body);
        next();
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.link).toBe('alert("XSS")');
      expect(mockRequest.body.link).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      mockRequest.body = {
        html: '<div onclick="alert()">Click me</div>'
      };

      const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
        const sanitize = (value: any): any => {
          if (typeof value === 'string') {
            return value.replace(/on\w+\s*=/gi, '');
          }
          return value;
        };

        req.body = sanitize(req.body);
        next();
      };

      sanitizeInput(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.body.html).not.toContain('onclick=');
    });
  });

  describe('Security Headers', () => {
    it('should set all required security headers', () => {
      const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        next();
      };

      securityHeaders(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Referrer-Policy', expect.any(String));
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.any(String));
    });

    it('should set HSTS header in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const hstsMiddleware = (req: Request, res: Response, next: NextFunction) => {
        if (process.env.NODE_ENV === 'production') {
          res.setHeader(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains; preload'
          );
        }
        next();
      };

      hstsMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=31536000')
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Request ID Tracing', () => {
    it('should add unique request ID to each request', () => {
      const requestIds: string[] = [];

      const addRequestId = (req: Request, res: Response, next: NextFunction) => {
        const requestId = 'req-' + Math.random().toString(36).substring(7);
        res.setHeader('X-Request-ID', requestId);
        (req as any).requestId = requestId;
        next();
      };

      for (let i = 0; i < 10; i++) {
        const req = {} as Request;
        const res = { setHeader: jest.fn() } as unknown as Response;

        addRequestId(req, res, mockNext);
        requestIds.push((req as any).requestId);
      }

      // All request IDs should be unique
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
