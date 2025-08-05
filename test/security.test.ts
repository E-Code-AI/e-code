/**
 * Security Tests
 * Tests for production security features
 */

import { Request, Response } from 'express';
import { sanitizeInput, preventSQLInjection, fileUploadSecurity } from '../server/middleware/security';
import { testRunner } from './setup/test-runner';

testRunner.registerSuite('Security Middleware', {
  tests: [
    {
      name: 'should sanitize XSS attempts in request body',
      fn: async () => {
        const req = {
          body: {
            name: '<script>alert("xss")</script>',
            description: 'Normal text',
            nested: {
              value: 'javascript:alert("xss")'
            }
          },
          query: {},
          params: {}
        } as unknown as Request;
        
        const res = {} as Response;
        const next = jest.fn();
        
        sanitizeInput(req, res, next);
        
        expect(req.body.name).toBe('alert("xss")');
        expect(req.body.nested.value).toBe('alert("xss")');
        expect(req.body.description).toBe('Normal text');
        expect(next).toHaveBeenCalled();
      }
    },

    {
      name: 'should prevent SQL injection patterns',
      fn: async () => {
        const maliciousQueries = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "admin' --",
          "' UNION SELECT * FROM passwords; --"
        ];
        
        for (const query of maliciousQueries) {
          const sanitized = preventSQLInjection(query);
          expect(sanitized).not.toContain('DROP');
          expect(sanitized).not.toContain('UNION');
          expect(sanitized).not.toContain('--');
          expect(sanitized).not.toContain("'");
        }
      }
    },

    {
      name: 'should validate file uploads',
      fn: async () => {
        const validFile = {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 1024 * 1024, // 1MB
          buffer: Buffer.from('test')
        } as Express.Multer.File;
        
        const invalidMimeFile = {
          originalname: 'test.exe',
          mimetype: 'application/x-msdownload',
          size: 1024 * 1024,
          buffer: Buffer.from('test')
        } as Express.Multer.File;
        
        const oversizedFile = {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          size: 20 * 1024 * 1024, // 20MB
          buffer: Buffer.from('test')
        } as Express.Multer.File;
        
        const validResult = fileUploadSecurity.validateFile(validFile);
        expect(validResult.valid).toBe(true);
        
        const invalidMimeResult = fileUploadSecurity.validateFile(invalidMimeFile);
        expect(invalidMimeResult.valid).toBe(false);
        expect(invalidMimeResult.error).toBe('Invalid file type');
        
        const oversizedResult = fileUploadSecurity.validateFile(oversizedFile);
        expect(oversizedResult.valid).toBe(false);
        expect(oversizedResult.error).toBe('File too large');
      }
    },

    {
      name: 'should generate secure filenames',
      fn: async () => {
        const filename = 'my document.pdf';
        const secure = fileUploadSecurity.generateSecureFilename(filename);
        
        expect(secure).toMatch(/^[a-f0-9]{32}\.pdf$/);
        expect(secure).not.toContain(' ');
      }
    }
  ]
});