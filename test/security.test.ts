import { securityScanner } from '../server/security/security-scanner';
import { testRunner } from './setup/test-runner';

testRunner.registerSuite('Security Scanner', {
  tests: [
    {
      name: 'detects critical secrets in source files',
      fn: async () => {
        const result = await securityScanner.scanProject(1, [
          {
            path: 'apps/web/src/api/client.ts',
            content: 'const key = "sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";',
          },
        ]);

        expect(result.summary.totalIssues).toBeGreaterThan(0);
        const secretIssue = result.issues.find((issue) => issue.title.includes('OpenAI API Key'));
        expect(secretIssue).toBeDefined();
        expect(secretIssue?.severity).toBe('critical');
      },
    },
    {
      name: 'skips ignored directories during scans',
      fn: async () => {
        const result = await securityScanner.scanProject(2, [
          {
            path: 'node_modules/package/index.js',
            content: 'const token = "ghp_exampletokenvalue123456789012345678";',
          },
        ]);

        expect(result.issues.length).toBe(0);
        expect(result.summary.totalIssues).toBe(0);
      },
    },
    {
      name: 'identifies vulnerability patterns in code',
      fn: async () => {
        const result = await securityScanner.scanProject(3, [
          {
            path: 'services/db/query.ts',
            content: 'const query = `SELECT * FROM users WHERE id = ${userInput}`;',
          },
        ]);

        expect(result.summary.totalIssues).toBeGreaterThan(0);
        const vulnerability = result.issues.find((issue) => issue.title.includes('SQL Injection Risk'));
        expect(vulnerability).toBeDefined();
        expect(vulnerability?.severity).toBe('high');
      },
    },
  ],
});
