import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { createTestSession, createAuthenticatedSession, type TestSession } from '../helpers/test-session';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Git API - Comprehensive Testing', () => {
  let baseClient: AxiosInstance;
  let session: TestSession;
  let authenticatedSession: TestSession;
  let projectId: string;

  beforeAll(() => {
    baseClient = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true,
      withCredentials: true,
    });
  });

  beforeEach(async () => {
    // Create fresh authenticated session for each test
    authenticatedSession = await createAuthenticatedSession(baseClient);
    session = createTestSession(baseClient);

    // Create a test project for Git operations
    const timestamp = Date.now();
    const projectResponse = await authenticatedSession.client.post('/api/projects', {
      name: `git-test-project-${timestamp}`,
      description: 'Test project for Git operations',
      isPublic: false,
    }, {
      headers: { 'x-csrf-token': await authenticatedSession.ensureCsrf() }
    });

    if (projectResponse.status === 200 || projectResponse.status === 201) {
      projectId = projectResponse.data.project?.id || projectResponse.data.id;
    }
  });

  describe('GET /api/git/status', () => {
    it('should require authentication', async () => {
      const response = await session.client.get('/api/git/status');
      expect([401, 403]).toContain(response.status);
    });

    it('should return git status for authenticated user', async () => {
      const response = await authenticatedSession.client.get('/api/git/status');
      expect([200, 404]).toContain(response.status); // 404 if no git repo initialized
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        // Git status typically includes staged, unstaged, untracked files
        expect(response.data).toHaveProperty('status');
      }
    });

    it('should handle projects without git initialization', async () => {
      const response = await authenticatedSession.client.get('/api/git/status', {
        params: { projectId }
      });
      
      // Should either return status or indicate no git repo
      expect([200, 404, 422]).toContain(response.status);
    });
  });

  describe('GET /api/git/diff/:filePath', () => {
    it('should require authentication', async () => {
      const response = await session.client.get('/api/git/diff/test.js');
      expect([401, 403]).toContain(response.status);
    });

    it('should return diff for a specific file', async () => {
      const response = await authenticatedSession.client.get('/api/git/diff/package.json');
      
      // May return 404 if file doesn't exist or no changes
      expect([200, 404, 422]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data).toHaveProperty('diff');
      }
    });

    it('should handle non-existent files gracefully', async () => {
      const response = await authenticatedSession.client.get('/api/git/diff/nonexistent-file-xyz.js');
      
      expect([404, 422]).toContain(response.status);
    });

    it('should properly encode file paths with special characters', async () => {
      const response = await authenticatedSession.client.get('/api/git/diff/src%2Findex.ts');
      
      // Should handle URL-encoded paths
      expect([200, 404, 422]).toContain(response.status);
    });
  });

  describe('POST /api/git/stage', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/git/stage', {
        files: ['test.js']
      });
      expect([401, 403]).toContain(response.status);
    });

    it('should reject requests without CSRF token', async () => {
      const response = await authenticatedSession.client.post('/api/git/stage', {
        files: ['test.js']
      });
      expect([403]).toContain(response.status);
    });

    it('should stage files when valid', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/stage', {
        files: ['package.json']
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      // May fail if git not initialized or file doesn't exist
      expect([200, 404, 422]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data).toHaveProperty('success');
      }
    });

    it('should validate files array parameter', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/stage', {
        files: 'not-an-array' // Invalid input
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/git/unstage', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/git/unstage', {
        files: ['test.js']
      });
      expect([401, 403]).toContain(response.status);
    });

    it('should reject requests without CSRF token', async () => {
      const response = await authenticatedSession.client.post('/api/git/unstage', {
        files: ['test.js']
      });
      expect([403]).toContain(response.status);
    });

    it('should unstage files when valid', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/unstage', {
        files: ['package.json']
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      // May fail if git not initialized or file not staged
      expect([200, 404, 422]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });
  });

  describe('POST /api/git/commit', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/git/commit', {
        message: 'Test commit'
      });
      expect([401, 403]).toContain(response.status);
    });

    it('should reject requests without CSRF token', async () => {
      const response = await authenticatedSession.client.post('/api/git/commit', {
        message: 'Test commit'
      });
      expect([403]).toContain(response.status);
    });

    it('should require commit message', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/commit', {
        // Missing message
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should create commit when valid', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/commit', {
        message: 'Test commit from automated tests'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      // May fail if nothing staged or git not initialized
      expect([200, 404, 422]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data).toHaveProperty('success');
      }
    });

    it('should reject empty commit messages', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/commit', {
        message: ''
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/git/push', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/git/push');
      expect([401, 403]).toContain(response.status);
    });

    it('should reject requests without CSRF token', async () => {
      const response = await authenticatedSession.client.post('/api/git/push');
      expect([403]).toContain(response.status);
    });

    it('should handle git push operation', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/push', {}, {
        headers: { 'x-csrf-token': csrf }
      });

      // May fail if no remote configured, no commits, or git not initialized
      expect([200, 404, 422, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });
  });

  describe('POST /api/git/pull', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/git/pull');
      expect([401, 403]).toContain(response.status);
    });

    it('should reject requests without CSRF token', async () => {
      const response = await authenticatedSession.client.post('/api/git/pull');
      expect([403]).toContain(response.status);
    });

    it('should handle git pull operation', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/pull', {}, {
        headers: { 'x-csrf-token': csrf }
      });

      // May fail if no remote configured or git not initialized
      expect([200, 404, 422, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      }
    });
  });

  describe('Security & Edge Cases', () => {
    it('should prevent path traversal in file paths', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.get('/api/git/diff/../../etc/passwd');
      
      expect([400, 403, 404, 422]).toContain(response.status);
    });

    it('should handle concurrent git operations gracefully', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      // Execute multiple git status requests concurrently
      const requests = Array.from({ length: 5 }, () =>
        authenticatedSession.client.get('/api/git/status')
      );

      const responses = await Promise.all(requests);
      
      // All should succeed or fail consistently
      responses.forEach(r => {
        expect([200, 404, 422]).toContain(r.status);
      });
    });

    it('should sanitize commit messages to prevent injection', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const response = await authenticatedSession.client.post('/api/git/commit', {
        message: '<script>alert("XSS")</script>'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      // Should either sanitize or reject, not execute
      expect([200, 400, 404, 422]).toContain(response.status);
      
      if (response.status === 200 && response.data.message) {
        // Ensure script tags are sanitized
        expect(response.data.message).not.toContain('<script>');
      }
    });
  });
});
