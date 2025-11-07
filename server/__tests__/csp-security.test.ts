/**
 * Content Security Policy Security Tests
 * 
 * These tests ensure that CSP is properly configured to prevent XSS attacks
 * and that unsafe directives are NEVER present in production.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import {
  getCSPDirectives,
  productionCSPDirectives,
  developmentCSPDirectives,
  buildCSPHeader,
  securityMiddleware
} from '../middleware/security';

describe('Content Security Policy Security', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Production CSP Directives', () => {
    it('should NOT include unsafe-inline in scriptSrc', () => {
      expect(productionCSPDirectives.scriptSrc).toBeDefined();
      expect(productionCSPDirectives.scriptSrc).not.toContain("'unsafe-inline'");
    });

    it('should NOT include unsafe-eval in scriptSrc', () => {
      expect(productionCSPDirectives.scriptSrc).toBeDefined();
      expect(productionCSPDirectives.scriptSrc).not.toContain("'unsafe-eval'");
    });

    it('should NOT include unsafe-inline in styleSrc', () => {
      expect(productionCSPDirectives.styleSrc).toBeDefined();
      expect(productionCSPDirectives.styleSrc).not.toContain("'unsafe-inline'");
    });

    it('should include nonce placeholder for scripts', () => {
      expect(productionCSPDirectives.scriptSrc).toContain("'nonce-{{nonce}}'");
    });

    it('should include nonce placeholder for styles', () => {
      expect(productionCSPDirectives.styleSrc).toContain("'nonce-{{nonce}}'");
    });

    it('should restrict frame ancestors to none', () => {
      expect(productionCSPDirectives.frameAncestors).toContain("'none'");
    });

    it('should block object sources', () => {
      expect(productionCSPDirectives.objectSrc).toContain("'none'");
    });

    it('should include upgrade-insecure-requests', () => {
      expect(productionCSPDirectives.upgradeInsecureRequests).toBeDefined();
    });
  });

  describe('Development CSP Directives', () => {
    it('should include unsafe-inline in scriptSrc for HMR', () => {
      expect(developmentCSPDirectives.scriptSrc).toContain("'unsafe-inline'");
    });

    it('should include unsafe-eval in scriptSrc for dev tools', () => {
      expect(developmentCSPDirectives.scriptSrc).toContain("'unsafe-eval'");
    });

    it('should include unsafe-inline in styleSrc for HMR', () => {
      expect(developmentCSPDirectives.styleSrc).toContain("'unsafe-inline'");
    });

    it('should allow localhost WebSocket connections', () => {
      expect(developmentCSPDirectives.connectSrc).toContain('ws://localhost:*');
    });

    it('should allow localhost HTTP connections', () => {
      expect(developmentCSPDirectives.connectSrc).toContain('http://localhost:*');
    });
  });

  describe('Environment-Based CSP Selection', () => {
    it('should return production directives when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      const directives = getCSPDirectives();
      
      expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
      expect(directives.scriptSrc).not.toContain("'unsafe-eval'");
    });

    it('should return development directives when NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      const directives = getCSPDirectives();
      
      expect(directives.scriptSrc).toContain("'unsafe-inline'");
      expect(directives.scriptSrc).toContain("'unsafe-eval'");
    });

    it('should default to development directives when NODE_ENV is unset', () => {
      delete process.env.NODE_ENV;
      const directives = getCSPDirectives();
      
      // When NODE_ENV is not set, it should use development for safety
      expect(directives.scriptSrc).toContain("'unsafe-inline'");
    });
  });

  describe('CSP Header Building', () => {
    it('should replace nonce placeholder with actual nonce', () => {
      const nonce = 'test-nonce-12345';
      const header = buildCSPHeader(productionCSPDirectives, nonce);
      
      expect(header).toContain(`'nonce-${nonce}'`);
      expect(header).not.toContain("'nonce-{{nonce}}'");
    });

    it('should NOT contain unsafe directives in production header', () => {
      const nonce = 'test-nonce-12345';
      const header = buildCSPHeader(productionCSPDirectives, nonce);
      
      expect(header).not.toContain("'unsafe-inline'");
      expect(header).not.toContain("'unsafe-eval'");
    });

    it('should properly format directive names (camelCase to kebab-case)', () => {
      const nonce = 'test-nonce-12345';
      const header = buildCSPHeader(productionCSPDirectives, nonce);
      
      expect(header).toContain('default-src');
      expect(header).toContain('script-src');
      expect(header).toContain('style-src');
      expect(header).toContain('frame-ancestors');
      expect(header).not.toContain('defaultSrc');
      expect(header).not.toContain('scriptSrc');
    });

    it('should include all required directives', () => {
      const nonce = 'test-nonce-12345';
      const header = buildCSPHeader(productionCSPDirectives, nonce);
      
      expect(header).toContain('default-src');
      expect(header).toContain('script-src');
      expect(header).toContain('style-src');
      expect(header).toContain('object-src');
      expect(header).toContain('base-uri');
    });
  });

  describe('CSP Middleware Integration', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
    });

    it('should set Content-Security-Policy header in production', async () => {
      process.env.NODE_ENV = 'production';
      
      securityMiddleware().forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).not.toContain("'unsafe-inline'");
      expect(response.headers['content-security-policy']).not.toContain("'unsafe-eval'");
    });

    it('should set Content-Security-Policy header in development', async () => {
      process.env.NODE_ENV = 'development';
      
      securityMiddleware().forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("'unsafe-inline'");
    });

    it('should include nonce in CSP header', async () => {
      process.env.NODE_ENV = 'production';
      
      securityMiddleware().forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .expect(200);

      const cspHeader = response.headers['content-security-policy'];
      expect(cspHeader).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    });

    it('should generate different nonces for different requests', async () => {
      process.env.NODE_ENV = 'production';
      
      securityMiddleware().forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response1 = await request(app).get('/test').expect(200);
      const response2 = await request(app).get('/test').expect(200);

      const nonce1 = response1.headers['content-security-policy'].match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
      const nonce2 = response2.headers['content-security-policy'].match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];

      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('Security Regression Prevention', () => {
    /**
     * CRITICAL TEST: This test MUST fail if unsafe directives are added to production
     * This prevents security regressions
     */
    it('CRITICAL: Production CSP MUST NOT have unsafe-inline or unsafe-eval', () => {
      const scriptSrc = productionCSPDirectives.scriptSrc || [];
      const styleSrc = productionCSPDirectives.styleSrc || [];
      
      // Check scriptSrc
      const hasUnsafeScript = scriptSrc.some(directive => 
        directive === "'unsafe-inline'" || directive === "'unsafe-eval'"
      );
      
      // Check styleSrc
      const hasUnsafeStyle = styleSrc.some(directive => 
        directive === "'unsafe-inline'"
      );
      
      expect(hasUnsafeScript).toBe(false);
      expect(hasUnsafeStyle).toBe(false);
    });

    it('should enforce strict CSP in production environment', () => {
      process.env.NODE_ENV = 'production';
      const directives = getCSPDirectives();
      
      // Verify no unsafe directives
      expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
      expect(directives.scriptSrc).not.toContain("'unsafe-eval'");
      expect(directives.styleSrc).not.toContain("'unsafe-inline'");
      
      // Verify nonce is present
      expect(directives.scriptSrc).toContain("'nonce-{{nonce}}'");
      expect(directives.styleSrc).toContain("'nonce-{{nonce}}'");
    });
  });

  describe('CSP Reporting', () => {
    it('should include report-uri directive', () => {
      expect(productionCSPDirectives.reportUri).toBe('/api/security/csp-report');
      expect(developmentCSPDirectives.reportUri).toBe('/api/security/csp-report');
    });

    it('should set report-only header when CSP_REPORT_ONLY=true', async () => {
      process.env.NODE_ENV = 'production';
      process.env.CSP_REPORT_ONLY = 'true';
      
      const app = express();
      securityMiddleware().forEach(middleware => app.use(middleware));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app).get('/test').expect(200);

      expect(response.headers['content-security-policy-report-only']).toBeDefined();
    });
  });
});
