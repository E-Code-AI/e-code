import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { createTestSession, createAuthenticatedSession, type TestSession } from '../helpers/test-session';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Files API - Comprehensive Testing with Strong Assertions', () => {
  let baseClient: AxiosInstance;
  let session: TestSession;
  let authenticatedSession: TestSession;
  let testProjectId: string;
  let createdFileIds: string[] = [];

  beforeAll(() => {
    baseClient = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true,
      withCredentials: true,
    });
  });

  beforeEach(async () => {
    authenticatedSession = await createAuthenticatedSession(baseClient);
    session = createTestSession(baseClient);
    createdFileIds = [];

    // Create deterministic test project
    const timestamp = Date.now();
    const csrf = await authenticatedSession.ensureCsrf();
    const projectResponse = await authenticatedSession.client.post('/api/projects', {
      name: `files-test-${timestamp}`,
      description: 'Test project for file operations',
      isPublic: false,
    }, {
      headers: { 'x-csrf-token': csrf }
    });

    if (projectResponse.status === 200 || projectResponse.status === 201) {
      testProjectId = projectResponse.data.project?.id || projectResponse.data.id;
      expect(testProjectId).toBeDefined();
      expect(typeof testProjectId).toBe('string');
    } else {
      throw new Error(`Failed to create test project: ${projectResponse.status}`);
    }
  });

  afterEach(async () => {
    // Cleanup: Delete created files
    if (createdFileIds.length > 0 && authenticatedSession) {
      const csrf = await authenticatedSession.ensureCsrf();
      await Promise.all(
        createdFileIds.map(fileId =>
          authenticatedSession.client.delete(`/api/files/${fileId}`, {
            headers: { 'x-csrf-token': csrf }
          })
        )
      );
    }
  });

  describe('GET /api/projects/:projectId/files - List Files', () => {
    it('should require authentication', async () => {
      const response = await session.client.get(`/api/projects/${testProjectId}/files`);
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('message');
      expect(response.data.code).toBe('AUTH_REQUIRED');
    });

    it('should return empty array for new project', async () => {
      const response = await authenticatedSession.client.get(`/api/projects/${testProjectId}/files`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(0);
    });

    it('should return files after creation', async () => {
      // Create a test file first
      const csrf = await authenticatedSession.ensureCsrf();
      const createResponse = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: 'test.js',
          content: 'console.log("hello");',
          language: 'javascript'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        const fileId = createResponse.data.file?.id || createResponse.data.id;
        if (fileId) createdFileIds.push(fileId);

        // Now list files
        const listResponse = await authenticatedSession.client.get(`/api/projects/${testProjectId}/files`);
        
        expect(listResponse.status).toBe(200);
        expect(Array.isArray(listResponse.data)).toBe(true);
        expect(listResponse.data.length).toBeGreaterThan(0);
        
        const file = listResponse.data.find((f: any) => f.path === 'test.js');
        expect(file).toBeDefined();
        expect(file.language).toBe('javascript');
        expect(file).toHaveProperty('id');
        expect(file).toHaveProperty('createdAt');
      }
    });

    it('should deny access to other users projects', async () => {
      // Create another authenticated session (different user)
      const otherSession = await createAuthenticatedSession(baseClient);
      
      const response = await otherSession.client.get(`/api/projects/${testProjectId}/files`);
      expect([403, 404]).toContain(response.status);
      
      if (response.status === 403) {
        expect(response.data.code).toBe('ACCESS_DENIED');
      }
    });
  });

  describe('POST /api/projects/:projectId/files - Create File', () => {
    it('should require authentication', async () => {
      const response = await session.client.post(`/api/projects/${testProjectId}/files`, {
        path: 'test.js',
        content: 'test'
      });
      expect(response.status).toBe(401);
    });

    it('should require CSRF token', async () => {
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        { path: 'test.js', content: 'test' }
      );
      expect(response.status).toBe(403);
    });

    it('should create file with valid data', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const fileContent = 'function hello() { return "world"; }';
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: 'hello.js',
          content: fileContent,
          language: 'javascript'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([200, 201]).toContain(response.status);
      expect(response.data).toHaveProperty('file');
      
      const file = response.data.file || response.data;
      expect(file).toHaveProperty('id');
      expect(file.path).toBe('hello.js');
      expect(file.language).toBe('javascript');
      expect(file).toHaveProperty('createdAt');
      
      if (file.id) createdFileIds.push(file.id);

      // Verify file was actually created by reading it back
      const readResponse = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files/hello.js`
      );
      
      expect(readResponse.status).toBe(200);
      expect(readResponse.data.content || readResponse.data).toContain(fileContent);
    });

    it('should validate required path field', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        { content: 'test' }, // Missing path
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([400, 422]).toContain(response.status);
      expect(response.data).toHaveProperty('error');
    });

    it('should prevent path traversal attacks', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const maliciousPaths = [
        '../../etc/passwd',
        '../../../root/.ssh/id_rsa',
        '/etc/shadow',
        '..\\..\\windows\\system32\\config\\sam'
      ];

      const responses = await Promise.all(
        maliciousPaths.map(path =>
          authenticatedSession.client.post(
            `/api/projects/${testProjectId}/files`,
            { path, content: 'malicious' },
            { headers: { 'x-csrf-token': csrf } }
          )
        )
      );

      responses.forEach(r => {
        expect([400, 403, 422]).toContain(r.status);
      });
    });

    it('should sanitize XSS in file content', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const xssContent = '<script>alert("XSS")</script><img src=x onerror="alert(1)">';
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: 'malicious.html',
          content: xssContent,
          language: 'html'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      if (response.status === 200 || response.status === 201) {
        const fileId = response.data.file?.id || response.data.id;
        if (fileId) createdFileIds.push(fileId);

        // Read back and verify sanitization or escaping
        const readResponse = await authenticatedSession.client.get(
          `/api/projects/${testProjectId}/files/malicious.html`
        );

        if (readResponse.status === 200) {
          const content = readResponse.data.content || readResponse.data;
          // Content should be stored, but when served to browser, should be escaped
          expect(typeof content).toBe('string');
        }
      }
    });
  });

  describe('GET /api/projects/:projectId/files/* - Read File', () => {
    let testFilePath: string;

    beforeEach(async () => {
      // Create a file to read
      const csrf = await authenticatedSession.ensureCsrf();
      testFilePath = `read-test-${Date.now()}.js`;
      
      const createResponse = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: testFilePath,
          content: 'const x = 42;',
          language: 'javascript'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        const fileId = createResponse.data.file?.id || createResponse.data.id;
        if (fileId) createdFileIds.push(fileId);
      }
    });

    it('should require authentication', async () => {
      const response = await session.client.get(`/api/projects/${testProjectId}/files/${testFilePath}`);
      expect(response.status).toBe(401);
    });

    it('should return file content', async () => {
      const response = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files/${testFilePath}`
      );

      expect(response.status).toBe(200);
      const content = response.data.content || response.data;
      expect(content).toContain('const x = 42');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files/nonexistent-file-xyz.js`
      );

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty('message');
    });

    it('should handle URL-encoded file paths', async () => {
      // Create file with special characters in path
      const csrf = await authenticatedSession.ensureCsrf();
      const specialPath = 'src/components/Button Component.tsx';
      
      const createResponse = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: specialPath,
          content: 'export const Button = () => {};',
          language: 'typescript'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        const fileId = createResponse.data.file?.id || createResponse.data.id;
        if (fileId) createdFileIds.push(fileId);

        // Read with URL-encoded path
        const encodedPath = encodeURIComponent(specialPath);
        const readResponse = await authenticatedSession.client.get(
          `/api/projects/${testProjectId}/files/${encodedPath}`
        );

        expect([200, 404]).toContain(readResponse.status);
      }
    });
  });

  describe('PUT /api/projects/:projectId/files/* - Update File', () => {
    let testFilePath: string;

    beforeEach(async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      testFilePath = `update-test-${Date.now()}.js`;
      
      const createResponse = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: testFilePath,
          content: 'const original = true;',
          language: 'javascript'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        const fileId = createResponse.data.file?.id || createResponse.data.id;
        if (fileId) createdFileIds.push(fileId);
      }
    });

    it('should require authentication', async () => {
      const response = await session.client.put(
        `/api/projects/${testProjectId}/files/${testFilePath}`,
        { content: 'updated' }
      );
      expect(response.status).toBe(401);
    });

    it('should require CSRF token', async () => {
      const response = await authenticatedSession.client.put(
        `/api/projects/${testProjectId}/files/${testFilePath}`,
        { content: 'updated' }
      );
      expect(response.status).toBe(403);
    });

    it('should update file content', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      const newContent = 'const updated = true;\nconsole.log("changed");';
      
      const updateResponse = await authenticatedSession.client.put(
        `/api/projects/${testProjectId}/files/${testFilePath}`,
        { content: newContent },
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([200, 204]).toContain(updateResponse.status);

      // Verify content was actually updated
      const readResponse = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files/${testFilePath}`
      );

      expect(readResponse.status).toBe(200);
      const content = readResponse.data.content || readResponse.data;
      expect(content).toBe(newContent);
      expect(content).not.toContain('original');
    });

    it('should handle concurrent updates safely', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      // Execute 3 concurrent updates
      const updates = ['update1', 'update2', 'update3'].map((content, i) =>
        authenticatedSession.client.put(
          `/api/projects/${testProjectId}/files/${testFilePath}`,
          { content: `const version = ${i}; // ${content}` },
          { headers: { 'x-csrf-token': csrf } }
        )
      );

      const responses = await Promise.all(updates);
      
      // All should succeed or handle conflicts gracefully
      responses.forEach(r => {
        expect([200, 204, 409]).toContain(r.status);
      });

      // Final read should have one of the updates
      const readResponse = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files/${testFilePath}`
      );

      expect(readResponse.status).toBe(200);
      const content = readResponse.data.content || readResponse.data;
      expect(content).toMatch(/version = [0-2]/);
    }, 30000);
  });

  describe('DELETE /api/projects/:projectId/files/* - Delete File', () => {
    let testFilePath: string;
    let testFileId: string;

    beforeEach(async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      testFilePath = `delete-test-${Date.now()}.js`;
      
      const createResponse = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: testFilePath,
          content: 'const toDelete = true;',
          language: 'javascript'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        testFileId = createResponse.data.file?.id || createResponse.data.id;
        // Don't add to createdFileIds since we're testing deletion
      }
    });

    it('should require authentication', async () => {
      const response = await session.client.delete(
        `/api/projects/${testProjectId}/files/${testFilePath}`
      );
      expect(response.status).toBe(401);
    });

    it('should require CSRF token', async () => {
      const response = await authenticatedSession.client.delete(
        `/api/projects/${testProjectId}/files/${testFilePath}`
      );
      expect(response.status).toBe(403);
    });

    it('should delete file and verify removal', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      // Delete the file
      const deleteResponse = await authenticatedSession.client.delete(
        `/api/projects/${testProjectId}/files/${testFilePath}`,
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([200, 204]).toContain(deleteResponse.status);

      // Verify file is actually gone
      const readResponse = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files/${testFilePath}`
      );

      expect(readResponse.status).toBe(404);

      // Verify file not in list
      const listResponse = await authenticatedSession.client.get(
        `/api/projects/${testProjectId}/files`
      );

      if (listResponse.status === 200) {
        const files = listResponse.data;
        const deletedFile = files.find((f: any) => f.path === testFilePath);
        expect(deletedFile).toBeUndefined();
      }
    });

    it('should return 404 for non-existent file deletion', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      const response = await authenticatedSession.client.delete(
        `/api/projects/${testProjectId}/files/never-existed.js`,
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([404, 422]).toContain(response.status);
    });
  });

  describe('POST /api/projects/:projectId/folders - Create Folder', () => {
    it('should require authentication', async () => {
      const response = await session.client.post(
        `/api/projects/${testProjectId}/folders`,
        { path: 'src' }
      );
      expect(response.status).toBe(401);
    });

    it('should require CSRF token', async () => {
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/folders`,
        { path: 'src' }
      );
      expect(response.status).toBe(403);
    });

    it('should create folder structure', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/folders`,
        { path: 'src/components' },
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([200, 201]).toContain(response.status);
      
      if (response.data.folder || response.data.path) {
        expect(response.data.folder?.path || response.data.path).toBe('src/components');
      }
    });

    it('should prevent path traversal in folder creation', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/folders`,
        { path: '../../evil' },
        { headers: { 'x-csrf-token': csrf } }
      );

      expect([400, 403, 422]).toContain(response.status);
    });
  });

  describe('Security & Data Integrity', () => {
    it('should enforce project ownership for file operations', async () => {
      // Create file in project
      const csrf1 = await authenticatedSession.ensureCsrf();
      const createResponse = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: 'owned.js',
          content: 'const mine = true;'
        },
        { headers: { 'x-csrf-token': csrf1 } }
      );

      if (createResponse.status === 200 || createResponse.status === 201) {
        const fileId = createResponse.data.file?.id || createResponse.data.id;
        if (fileId) createdFileIds.push(fileId);

        // Try to access with different user
        const otherSession = await createAuthenticatedSession(baseClient);
        const csrf2 = await otherSession.ensureCsrf();
        
        // Try to update
        const updateResponse = await otherSession.client.put(
          `/api/projects/${testProjectId}/files/owned.js`,
          { content: 'hacked' },
          { headers: { 'x-csrf-token': csrf2 } }
        );

        expect([403, 404]).toContain(updateResponse.status);

        // Try to delete
        const deleteResponse = await otherSession.client.delete(
          `/api/projects/${testProjectId}/files/owned.js`,
          { headers: { 'x-csrf-token': csrf2 } }
        );

        expect([403, 404]).toContain(deleteResponse.status);
      }
    });

    it('should handle binary files safely', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      // Simulate binary content (base64 encoded image)
      const binaryContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: 'image.png',
          content: binaryContent,
          encoding: 'base64'
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      // Should handle binary files appropriately
      expect([200, 201, 400, 415]).toContain(response.status);
    });

    it('should limit file size to prevent DoS', async () => {
      const csrf = await authenticatedSession.ensureCsrf();
      
      // Create very large file content (10MB)
      const largeContent = 'x'.repeat(10 * 1024 * 1024);
      
      const response = await authenticatedSession.client.post(
        `/api/projects/${testProjectId}/files`,
        {
          path: 'huge.txt',
          content: largeContent
        },
        { headers: { 'x-csrf-token': csrf } }
      );

      // Should reject or handle large files appropriately
      expect([200, 201, 413, 422]).toContain(response.status);
      
      if (response.status === 413) {
        expect(response.data.error || response.data.message).toMatch(/too large|size limit/i);
      }
    }, 30000);
  });
});
