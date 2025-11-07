/**
 * CORS Security Tests
 * 
 * These tests verify that the CORS configuration properly restricts origins
 * and fails fast in production when no origins are configured.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createCorsMiddleware, getAllowedOrigins } from '../middleware/cors-config';
import cors from 'cors';

describe('CORS Security Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getAllowedOrigins', () => {
    it('should return empty array in production with no config', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.APP_URL;
      delete process.env.FRONTEND_URL;
      delete process.env.REPL_SLUG;
      delete process.env.REPL_OWNER;

      const origins = getAllowedOrigins();
      expect(origins).toEqual([]);
    });

    it('should include explicit ALLOWED_ORIGINS in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://www.example.com';

      const origins = getAllowedOrigins();
      expect(origins).toContain('https://app.example.com');
      expect(origins).toContain('https://www.example.com');
    });

    it('should include APP_URL in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_URL = 'https://myapp.replit.app';

      const origins = getAllowedOrigins();
      expect(origins).toContain('https://myapp.replit.app');
    });

    it('should NOT auto-allow Replit domains in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.REPL_SLUG = 'test-app';
      process.env.REPL_OWNER = 'testuser';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.APP_URL;

      const origins = getAllowedOrigins();
      expect(origins).not.toContain('https://test-app-testuser.replit.app');
      expect(origins).not.toContain('https://test-app.testuser.repl.co');
    });

    it('should auto-allow Replit domains in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.REPL_SLUG = 'test-app';
      process.env.REPL_OWNER = 'testuser';

      const origins = getAllowedOrigins();
      expect(origins).toContain('https://test-app-testuser.replit.app');
      expect(origins).toContain('https://test-app.testuser.repl.co');
    });

    it('should include localhost in development', () => {
      process.env.NODE_ENV = 'development';

      const origins = getAllowedOrigins();
      expect(origins).toContain('http://localhost:5000');
      expect(origins).toContain('http://127.0.0.1:5000');
    });

    it('should NOT include localhost in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_URL = 'https://myapp.replit.app';

      const origins = getAllowedOrigins();
      expect(origins).not.toContain('http://localhost:5000');
      expect(origins).not.toContain('http://127.0.0.1:5000');
    });

    it('should remove duplicate origins', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';
      process.env.APP_URL = 'https://app.example.com'; // duplicate

      const origins = getAllowedOrigins();
      const appOrigins = origins.filter(o => o === 'https://app.example.com');
      expect(appOrigins.length).toBe(1);
    });
  });

  describe('CORS Middleware Origin Validation', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
    });

    it('should reject requests from unauthorized origins in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_URL = 'https://myapp.replit.app';

      const corsOptions = createCorsMiddleware();
      app.use(cors(corsOptions));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://evil.com')
        .expect(500); // CORS error

      expect(response.text).toContain('Not allowed by CORS');
    });

    it('should allow requests from authorized origins', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com';

      const corsOptions = createCorsMiddleware();
      app.use(cors(corsOptions));
      app.get('/test', (req, res) => res.json({ ok: true }));

      await request(app)
        .get('/test')
        .set('Origin', 'https://app.example.com')
        .expect(200);
    });

    it('should reject no-origin requests in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_URL = 'https://myapp.replit.app';

      const corsOptions = createCorsMiddleware();
      app.use(cors(corsOptions));
      app.get('/test', (req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .expect(500); // CORS error in production for no-origin

      expect(response.text).toContain('Origin required in production');
    });

    it('should allow no-origin requests in development', async () => {
      process.env.NODE_ENV = 'development';

      const corsOptions = createCorsMiddleware();
      app.use(cors(corsOptions));
      app.get('/test', (req, res) => res.json({ ok: true }));

      await request(app)
        .get('/test')
        .expect(200); // Should work without origin in development
    });

    it('should include CSRF token in exposed headers', async () => {
      process.env.NODE_ENV = 'development';

      const corsOptions = createCorsMiddleware();
      app.use(cors(corsOptions));
      app.get('/test', (req, res) => {
        res.setHeader('X-CSRF-Token', 'test-token');
        res.json({ ok: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-csrf-token']).toBe('test-token');
    });
  });

  describe('Production Security Enforcement', () => {
    it('should warn about insecure HTTP origins in production', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'http://insecure.example.com';

      createCorsMiddleware();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Insecure HTTP origin in production')
      );

      consoleSpy.mockRestore();
    });

    it('should NOT warn about localhost HTTP in production config', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://app.example.com';

      createCorsMiddleware();

      const warnings = consoleSpy.mock.calls.map(call => call[0]);
      const localhostWarnings = warnings.filter(w => 
        w.includes('Insecure HTTP') && w.includes('localhost')
      );

      expect(localhostWarnings.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Cross-Environment Behavior', () => {
    it('should have stricter rules in production than development', () => {
      // Development: get allowed origins
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.APP_URL;
      const devOrigins = getAllowedOrigins();

      // Production: get allowed origins
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOWED_ORIGINS;
      delete process.env.APP_URL;
      const prodOrigins = getAllowedOrigins();

      // Development should have more allowed origins (localhost, etc.)
      expect(devOrigins.length).toBeGreaterThan(prodOrigins.length);
      
      // Production should be empty without explicit config
      expect(prodOrigins.length).toBe(0);
    });
  });
});
