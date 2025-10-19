import { testRunner } from './setup/test-runner';
import {
  securityMiddleware,
  csrfProtection,
  sanitizeInput,
  preventSQLInjection,
  fileUploadSecurity,
  apiKeyValidation,
  securityMonitoring,
  ipSecurity,
} from '../server/middleware/security';
import { securityScanner } from '../server/security/security-scanner';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
}

testRunner.registerSuite('Security Middleware', {
  tests: [
    {
      name: 'securityMiddleware sets essential headers for API traffic',
      fn: async () => {
        const middlewares = securityMiddleware();
        expect(Array.isArray(middlewares)).toBe(true);
        expect(middlewares.length >= 2).toBe(true);

        const headerMiddleware = middlewares[1];
        const req: any = { path: '/api/projects', method: 'POST' };
        const res = createResponse();
        let nextCalled = false;

        await headerMiddleware(req, res, () => {
          nextCalled = true;
        });

        expect(res.headers['X-Frame-Options']).toBe('DENY');
        expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
        expect(res.headers['X-XSS-Protection']).toBe('1; mode=block');
        expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(res.headers['Permissions-Policy']).toContain('geolocation');
        expect(res.headers['X-API-Version']).toBe('1.0');
        expect(res.headers['X-RateLimit-Policy']).toContain('rate-limits');
        expect(nextCalled).toBe(true);
      },
    },
    {
      name: 'csrfProtection generates secure tokens and verifies them',
      fn: () => {
        const csrf = csrfProtection();
        const sessionId = 'session-123';
        const token = csrf.generate(sessionId);

        expect(typeof token).toBe('string');
        expect(token).toHaveLength(64);
        expect(csrf.verify(sessionId, token)).toBe(true);

        const invalidToken = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
        expect(csrf.verify(sessionId, invalidToken)).toBe(false);

        const originalNow = Date.now;
        try {
          Date.now = () => originalNow() + 2 * 60 * 60 * 1000;
          expect(csrf.verify(sessionId, token)).toBe(false);
        } finally {
          Date.now = originalNow;
        }
      },
    },
    {
      name: 'sanitizeInput removes common XSS payloads across request data',
      fn: () => {
        const req: any = {
          body: { message: "<script>alert('x')</script><img src='x' onerror=alert(1)>" },
          query: { q: "javascript:alert('oops')" },
          params: { id: "<div onclick='steal()'>123</div>" },
        };
        const res = createResponse();
        let nextCalled = false;

        sanitizeInput(req, res, () => {
          nextCalled = true;
        });

        expect(req.body.message.includes('<')).toBe(false);
        expect(req.body.message.toLowerCase().includes('script')).toBe(false);
        expect(req.body.message.toLowerCase().includes('onerror')).toBe(false);
        expect(req.query.q.toLowerCase().includes('javascript:')).toBe(false);
        expect(req.params.id.includes('<')).toBe(false);
        expect(nextCalled).toBe(true);
      },
    },
    {
      name: 'preventSQLInjection strips dangerous SQL patterns',
      fn: () => {
        const input = "SELECT * FROM users WHERE name = 'admin' OR 1=1; --";
        const sanitized = preventSQLInjection(input);

        expect(sanitized.toLowerCase().includes('select')).toBe(false);
        expect(sanitized.includes('--')).toBe(false);
        expect(sanitized.includes("'")).toBe(false);
        expect(sanitized.toLowerCase().includes('or')).toBe(false);
      },
    },
    {
      name: 'fileUploadSecurity validates mime type, size, and extension',
      fn: () => {
        const valid = fileUploadSecurity.validateFile({
          mimetype: 'image/png',
          size: 1024,
          originalname: 'avatar.png',
        } as any);
        expect(valid).toEqual({ valid: true });

        const badType = fileUploadSecurity.validateFile({
          mimetype: 'application/x-msdownload',
          size: 500,
          originalname: 'malware.exe',
        } as any);
        expect(badType.valid).toBe(false);
        expect(badType.error).toBe('Invalid file type');

        const badSize = fileUploadSecurity.validateFile({
          mimetype: 'image/jpeg',
          size: fileUploadSecurity.maxFileSize + 1,
          originalname: 'photo.jpg',
        } as any);
        expect(badSize.valid).toBe(false);
        expect(badSize.error).toBe('File too large');

        const mismatch = fileUploadSecurity.validateFile({
          mimetype: 'image/png',
          size: 200,
          originalname: 'avatar.jpg',
        } as any);
        expect(mismatch.valid).toBe(false);
        expect(mismatch.error).toBe('File extension mismatch');

        const secureName = fileUploadSecurity.generateSecureFilename('avatar.png');
        expect(secureName.endsWith('.png')).toBe(true);
        expect(secureName.split('.')[0].length).toBe(32);
      },
    },
    {
      name: 'apiKeyValidation enforces presence and minimum length',
      fn: () => {
        const resMissing = createResponse();
        const reqMissing: any = { headers: {} };
        let missingNextCalled = false;

        apiKeyValidation(reqMissing, resMissing, () => {
          missingNextCalled = true;
        });

        expect(resMissing.statusCode).toBe(401);
        expect((resMissing.body as any)?.error).toBe('API key required');
        expect(missingNextCalled).toBe(false);

        const resValid = createResponse();
        const reqValid: any = { headers: { 'x-api-key': 'k'.repeat(32) } };
        let validNextCalled = false;

        apiKeyValidation(reqValid, resValid, () => {
          validNextCalled = true;
        });

        expect(validNextCalled).toBe(true);
        expect(resValid.statusCode).toBe(200);
      },
    },
    {
      name: 'ipSecurity blocks blacklisted IPs and restricts admin access',
      fn: async () => {
        ipSecurity.blacklist.clear();
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        ipSecurity.adminWhitelist = ['10.0.0.1'];

        ipSecurity.blockIp('1.2.3.4', 10);
        expect(ipSecurity.blacklist.has('1.2.3.4')).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 20));
        expect(ipSecurity.blacklist.has('1.2.3.4')).toBe(false);

        const resBlocked = createResponse();
        const reqBlocked: any = { path: '/admin', ip: '9.9.9.9' };
        let nextCalled = false;
        ipSecurity.middleware(reqBlocked, resBlocked, () => {
          nextCalled = true;
        });
        expect(resBlocked.statusCode).toBe(403);
        expect((resBlocked.body as any)?.error).toBe('Admin access restricted');
        expect(nextCalled).toBe(false);

        const resAllowed = createResponse();
        const reqAllowed: any = { path: '/admin/settings', ip: '10.0.0.1' };
        let allowedNext = false;
        ipSecurity.middleware(reqAllowed, resAllowed, () => {
          allowedNext = true;
        });
        expect(allowedNext).toBe(true);

        process.env.NODE_ENV = originalEnv;
      },
    },
    {
      name: 'securityMonitoring flags suspicious payloads',
      fn: () => {
        const req: any = {
          path: '/api/projects',
          method: 'POST',
          ip: '8.8.8.8',
          query: {},
          body: { input: '<script>alert(1)</script>' },
          get: () => 'test-agent',
        };
        const res = createResponse();
        let nextCalled = false;
        let warnCalled = false;
        const originalWarn = console.warn;
        console.warn = () => {
          warnCalled = true;
        };

        try {
          securityMonitoring(req, res, () => {
            nextCalled = true;
          });
        } finally {
          console.warn = originalWarn;
        }

        expect(nextCalled).toBe(true);
        expect(warnCalled).toBe(true);
      },
    },
  ],
});

testRunner.registerSuite('Security Scanner', {
  tests: [
    {
      name: 'quickScan detects exposed API keys',
      fn: async () => {
        const codeSample = "const apiKey = \"sk-abcdefghijklmnopqrstuvwxyz1234\";";
        const issues = await securityScanner.quickScan(codeSample);

        expect(Array.isArray(issues)).toBeTruthy();
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('secret');
      },
    },
    {
      name: 'scanProject aggregates issue severities',
      fn: async () => {
        const result = await securityScanner.scanProject(42, [
          {
            path: 'src/index.ts',
            content: "const password = \"supersecret\";\\n// TODO: tighten security\\nconsole.log('debug');",
          },
          {
            path: 'src/app.ts',
            content: `fetch('https://example.com/data');\nconst token = 'ghp_${'A'.repeat(36)}';`,
          },
        ]);

        const severities = new Set(result.issues.map(issue => issue.severity));

        expect(result.projectId).toBe(42);
        expect(result.summary.totalIssues).toBe(result.issues.length);
        expect(severities.has('critical')).toBeTruthy();
        expect(severities.size).toBeGreaterThan(1);
        expect(result.summary.totalIssues).toBeGreaterThan(3);
      },
    },
    {
      name: 'getSecurityRecommendations returns actionable guidance',
      fn: async () => {
        const recommendations = await securityScanner.getSecurityRecommendations(99);

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations).toContain('Use environment variables for sensitive configuration');
      },
    },
  ],
});
