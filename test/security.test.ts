import { testRunner } from './setup/test-runner';
import { securityScanner } from '../server/security/security-scanner';

testRunner.registerSuite('Security Scanner', {
  tests: [
    {
      name: 'quickScan detects exposed API keys',
      fn: async () => {
        const codeSample = `const apiKey = "sk-abcdefghijklmnopqrstuvwxyz1234";`;
        const issues = await securityScanner.quickScan(codeSample);

        expect(Array.isArray(issues)).toBeTruthy();
        expect(issues.length).toBeGreaterThan(0);
        expect(issues[0].type).toBe('secret');
      }
    },
    {
      name: 'scanProject aggregates issue severities',
      fn: async () => {
        const result = await securityScanner.scanProject(42, [
          {
            path: 'src/index.ts',
            content: `const password = "supersecret";\n// TODO: tighten security\nconsole.log('debug');`
          },
          {
            path: 'src/app.ts',
            content: `fetch('https://example.com/data');\nconst token = 'ghp_${'A'.repeat(36)}';`
          }
        ]);

        const severities = new Set(result.issues.map((issue) => issue.severity));

        expect(result.projectId).toBe(42);
        expect(result.summary.totalIssues).toBe(result.issues.length);
        expect(severities.has('critical')).toBeTruthy();
        expect(severities.size).toBeGreaterThan(1);
        expect(result.summary.totalIssues).toBeGreaterThan(3);
      }
    },
    {
      name: 'getSecurityRecommendations returns actionable guidance',
      fn: async () => {
        const recommendations = await securityScanner.getSecurityRecommendations(99);

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations).toContain('Use environment variables for sensitive configuration');
      }
    }
  ]
});

testRunner.registerSuite('Security', {
  tests: []
});
