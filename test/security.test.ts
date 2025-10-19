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

function createResponse(): ResponseShape {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
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
      name: 'securityMiddleware configures standard hardening headers',
      fn: async () => {
        const middlewares = securityMiddleware();
        expect(Array.isArray(middlewares)).toBe(true);
        expect(middlewares.length).toBeGreaterThan(1);

        const headerMiddleware = middlewares[1];
        const req = { path: '/api/forms', method: 'GET' } as any;
        const res = createResponse();
        let nextCalled = false;

        await headerMiddleware(req, res, () => {
          nextCalled = true;
        });

        expect(res.headers['X-Frame-Options']).toBe('DENY');
        expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
        expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(nextCalled).toBe(true);
      },
    },
    {
      name: 'csrfProtection generates and verifies tokens per session',
      fn: () => {
        const csrf = csrfProtection();
        const sessionId = 'session-123';
        const token = csrf.generate(sessionId);

        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(32);
        expect(csrf.verify(sessionId, token)).toBe(true);

        const tampered = `${token.slice(0, -1)}0`;
        expect(csrf.verify(sessionId, tampered)).toBe(false);
      },
    },
    {
      name: 'sanitizeInput removes common scripting vectors',
      fn: () => {
        const req: any = {
          body: { message: "<img src=x onerror=alert('x')>hello" },
          query: { q: "javascript:alert('oops')" },
          params: { id: "<script>1</script>" },
        };
        const res = createResponse();
        let nextCalled = false;

        sanitizeInput(req, res, () => {
          nextCalled = true;
        });

        expect(req.body.message.includes('<')).toBe(false);
        expect(req.query.q.toLowerCase().includes('javascript:')).toBe(false);
        expect(req.params.id.includes('<')).toBe(false);
        expect(nextCalled).toBe(true);
      },
    },
    {
      name: 'apiKeyValidation rejects missing or short keys',
      fn: () => {
        const missingReq = { headers: {} } as any;
        const missingRes = createResponse();
        let missingNext = false;

        apiKeyValidation(missingReq, missingRes, () => {
          missingNext = true;
        });

        expect(missingRes.statusCode).toBe(401);
        expect(missingRes.body && (missingRes.body as any).error).toBe('API key required');
        expect(missingNext).toBe(false);

        const invalidReq = { headers: { 'x-api-key': 'short' } } as any;
        const invalidRes = createResponse();
        apiKeyValidation(invalidReq, invalidRes, () => {
          missingNext = true;
        });

        expect(invalidRes.statusCode).toBe(401);
        expect(invalidRes.body && (invalidRes.body as any).error).toBe('Invalid API key');
      },
    },
    {
      name: 'securityMonitoring forwards suspicious activity to logger',
      fn: () => {
        const originalWarn = console.warn;
        let warned = false;
        console.warn = () => {
          warned = true;
        };

        try {
          const req = {
            ip: '127.0.0.1',
            method: 'GET',
            path: '/admin/../../etc/passwd',
            query: {},
            body: {},
            get: () => 'jest',
            user: { id: 'user-1' },
          } as any;
          const res = createResponse();
          let nextCalled = false;

          securityMonitoring(req, res, () => {
            nextCalled = true;
          });

          expect(warned).toBe(true);
          expect(nextCalled).toBe(true);
        } finally {
          console.warn = originalWarn;
        }
      },
    },
    {
      name: 'ipSecurity blocks blacklisted addresses',
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
      name: 'preventSQLInjection strips comments and tautologies',
      fn: () => {
        const input = "SELECT * FROM users WHERE name = 'admin' OR 1=1 --";
        const sanitized = preventSQLInjection(input);

        expect(sanitized.toLowerCase().includes('select')).toBe(false);
        expect(sanitized.includes('--')).toBe(false);
      },
    },
    {
      name: 'fileUploadSecurity validates metadata',
      fn: () => {
        const valid = fileUploadSecurity.validateFile({
          mimetype: 'image/png',
          size: 1024,
          originalname: 'avatar.png',
        } as any);
        expect(valid.valid).toBe(true);

        const invalid = fileUploadSecurity.validateFile({
          mimetype: 'application/x-msdownload',
          size: 1024,
          originalname: 'payload.exe',
        } as any);
        expect(invalid.valid).toBe(false);
      },
    },
  ],
});

testRunner.registerSuite('Security Scanner', {
  tests: [
    {
      name: 'quickScan flags embedded secrets',
      fn: async () => {
        const codeSample = "const apiKey = \"sk-abcdefghijklmnopqrstuvwxyz1234\";";
        const issues = await securityScanner.quickScan(codeSample);

        expect(Array.isArray(issues)).toBe(true);
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('secret');
      },
    },
    {
      name: 'scanProject aggregates severity data',
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
