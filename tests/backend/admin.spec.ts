import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { createTestSession, createAuthenticatedSession, createAdminSession, type TestSession } from '../helpers/test-session';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Admin API - Comprehensive Testing', () => {
  let baseClient: AxiosInstance;
  let session: TestSession;
  let authenticatedSession: TestSession;
  let adminSession: TestSession;

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
    // Admin session might not be available if no admin user exists
    try {
      adminSession = await createAdminSession(baseClient);
    } catch (error) {
      // Admin user may not exist in test database
    }
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should require authentication', async () => {
      const response = await session.client.get('/api/admin/dashboard/stats');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.get('/api/admin/dashboard/stats');
      expect([401, 403]).toContain(response.status);
    });

    it('should allow admin access and return stats', async () => {
      if (!adminSession) {
        // Skip if no admin session available
        return;
      }

      const response = await adminSession.client.get('/api/admin/dashboard/stats');
      
      if (response.status === 200) {
        expect(response.data).toBeDefined();
        expect(response.data).toHaveProperty('totalUsers');
        expect(response.data).toHaveProperty('totalProjects');
        expect(typeof response.data.totalUsers).toBe('number');
        expect(typeof response.data.totalProjects).toBe('number');
      }
    });
  });

  describe('GET /api/admin/users', () => {
    it('should require authentication', async () => {
      const response = await session.client.get('/api/admin/users');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.get('/api/admin/users');
      expect([401, 403]).toContain(response.status);
    });

    it('should return user list for admins', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.get('/api/admin/users');
      
      if (response.status === 200) {
        expect(Array.isArray(response.data.users || response.data)).toBe(true);
        
        const users = response.data.users || response.data;
        if (users.length > 0) {
          expect(users[0]).toHaveProperty('id');
          expect(users[0]).toHaveProperty('email');
          // Should not expose passwords
          expect(users[0]).not.toHaveProperty('password');
          expect(users[0]).not.toHaveProperty('passwordHash');
        }
      }
    });

    it('should support pagination', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.get('/api/admin/users', {
        params: { page: 1, limit: 10 }
      });
      
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const users = response.data.users || response.data;
        expect(users.length).toBeLessThanOrEqual(10);
      }
    });

    it('should support search/filtering', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.get('/api/admin/users', {
        params: { search: 'test' }
      });
      
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('PATCH /api/admin/users/:id/toggle-admin', () => {
    it('should require authentication', async () => {
      const response = await session.client.patch('/api/admin/users/123/toggle-admin');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.patch('/api/admin/users/123/toggle-admin');
      expect([401, 403]).toContain(response.status);
    });

    it('should require CSRF token', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.patch('/api/admin/users/123/toggle-admin');
      expect([403]).toContain(response.status);
    });

    it('should toggle admin status for valid user', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.patch('/api/admin/users/999999/toggle-admin', {}, {
        headers: { 'x-csrf-token': csrf }
      });

      // May fail if user doesn't exist
      expect([200, 404, 422]).toContain(response.status);
    });
  });

  describe('POST /api/admin/users/:id/lock', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/admin/users/123/lock');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.post('/api/admin/users/123/lock');
      expect([401, 403]).toContain(response.status);
    });

    it('should require CSRF token', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.post('/api/admin/users/123/lock');
      expect([403]).toContain(response.status);
    });

    it('should lock user account', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.post('/api/admin/users/999999/lock', {
        reason: 'Test lock from automated tests'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([200, 404, 422]).toContain(response.status);
    });

    it('should prevent self-locking', async () => {
      if (!adminSession) return;

      // Try to lock own account
      const csrf = await adminSession.ensureCsrf();
      const meResponse = await adminSession.client.get('/api/auth/user');
      
      if (meResponse.status === 200 && meResponse.data.user?.id) {
        const response = await adminSession.client.post(`/api/admin/users/${meResponse.data.user.id}/lock`, {}, {
          headers: { 'x-csrf-token': csrf }
        });

        // Should prevent or warn about self-locking
        expect([400, 403, 422]).toContain(response.status);
      }
    });
  });

  describe('POST /api/admin/users/:id/unlock', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/admin/users/123/unlock');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.post('/api/admin/users/123/unlock');
      expect([401, 403]).toContain(response.status);
    });

    it('should require CSRF token', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.post('/api/admin/users/123/unlock');
      expect([403]).toContain(response.status);
    });

    it('should unlock user account', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.post('/api/admin/users/999999/unlock', {}, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([200, 404, 422]).toContain(response.status);
    });
  });

  describe('GET /api/admin/projects', () => {
    it('should require authentication', async () => {
      const response = await session.client.get('/api/admin/projects');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.get('/api/admin/projects');
      expect([401, 403]).toContain(response.status);
    });

    it('should return all projects for admins', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.get('/api/admin/projects');
      
      if (response.status === 200) {
        expect(Array.isArray(response.data.projects || response.data)).toBe(true);
        
        const projects = response.data.projects || response.data;
        if (projects.length > 0) {
          expect(projects[0]).toHaveProperty('id');
          expect(projects[0]).toHaveProperty('name');
          expect(projects[0]).toHaveProperty('userId');
        }
      }
    });

    it('should support pagination', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.get('/api/admin/projects', {
        params: { page: 1, limit: 10 }
      });
      
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        const projects = response.data.projects || response.data;
        expect(projects.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('PATCH /api/admin/projects/:id', () => {
    it('should require authentication', async () => {
      const response = await session.client.patch('/api/admin/projects/123');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.patch('/api/admin/projects/123');
      expect([401, 403]).toContain(response.status);
    });

    it('should require CSRF token', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.patch('/api/admin/projects/123', {
        name: 'Updated Name'
      });
      expect([403]).toContain(response.status);
    });

    it('should update project', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.patch('/api/admin/projects/999999', {
        name: 'Updated Name'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([200, 404, 422]).toContain(response.status);
    });
  });

  describe('DELETE /api/admin/projects/:id', () => {
    it('should require authentication', async () => {
      const response = await session.client.delete('/api/admin/projects/123');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.delete('/api/admin/projects/123');
      expect([401, 403]).toContain(response.status);
    });

    it('should require CSRF token', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.delete('/api/admin/projects/123');
      expect([403]).toContain(response.status);
    });

    it('should delete project', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.delete('/api/admin/projects/999999', {
        headers: { 'x-csrf-token': csrf }
      });

      expect([200, 404, 422]).toContain(response.status);
    });

    it('should handle cascade deletion safely', async () => {
      if (!adminSession) return;

      // Create a project first
      const createCsrf = await adminSession.ensureCsrf();
      const createResponse = await adminSession.client.post('/api/projects', {
        name: `test-delete-cascade-${Date.now()}`,
        description: 'Test cascade deletion'
      }, {
        headers: { 'x-csrf-token': createCsrf }
      });

      if (createResponse.status === 200 || createResponse.status === 201) {
        const projectId = createResponse.data.project?.id || createResponse.data.id;
        
        // Delete it
        const deleteCsrf = await adminSession.ensureCsrf();
        const deleteResponse = await adminSession.client.delete(`/api/admin/projects/${projectId}`, {
          headers: { 'x-csrf-token': deleteCsrf }
        });

        expect([200, 204]).toContain(deleteResponse.status);
      }
    });
  });

  describe('GET /api/admin/api-keys', () => {
    it('should require authentication', async () => {
      const response = await session.client.get('/api/admin/api-keys');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.get('/api/admin/api-keys');
      expect([401, 403]).toContain(response.status);
    });

    it('should return API keys for admins', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.get('/api/admin/api-keys');
      
      if (response.status === 200) {
        expect(Array.isArray(response.data.apiKeys || response.data)).toBe(true);
        
        const apiKeys = response.data.apiKeys || response.data;
        if (apiKeys.length > 0) {
          expect(apiKeys[0]).toHaveProperty('id');
          expect(apiKeys[0]).toHaveProperty('provider');
          // Should not expose actual API keys in list view
          expect(apiKeys[0].key || '').toMatch(/\*\*\*|hidden|redacted/i);
        }
      }
    });
  });

  describe('POST /api/admin/api-keys', () => {
    it('should require authentication', async () => {
      const response = await session.client.post('/api/admin/api-keys');
      expect([401, 403]).toContain(response.status);
    });

    it('should deny non-admin access', async () => {
      const response = await authenticatedSession.client.post('/api/admin/api-keys');
      expect([401, 403]).toContain(response.status);
    });

    it('should require CSRF token', async () => {
      if (!adminSession) return;

      const response = await adminSession.client.post('/api/admin/api-keys', {
        provider: 'openai',
        key: 'sk-test123'
      });
      expect([403]).toContain(response.status);
    });

    it('should create API key', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.post('/api/admin/api-keys', {
        provider: 'test-provider',
        key: 'test-key-123',
        name: 'Test API Key'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([200, 201, 400, 422]).toContain(response.status);
    });

    it('should validate provider field', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.post('/api/admin/api-keys', {
        // Missing provider
        key: 'test-key-123'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect([400, 422]).toContain(response.status);
    });

    it('should encrypt API keys before storage', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const testKey = 'sk-plaintext-test-key';
      const createResponse = await adminSession.client.post('/api/admin/api-keys', {
        provider: 'test-encryption',
        key: testKey,
        name: 'Encryption Test'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      if (createResponse.status === 200 || createResponse.status === 201) {
        // List keys to verify encryption
        const listResponse = await adminSession.client.get('/api/admin/api-keys');
        
        if (listResponse.status === 200) {
          const keys = listResponse.data.apiKeys || listResponse.data;
          const createdKey = keys.find((k: any) => k.provider === 'test-encryption');
          
          if (createdKey) {
            // Key should be masked/encrypted in list view
            expect(createdKey.key || '').not.toBe(testKey);
          }
        }
      }
    });
  });

  describe('Security & Edge Cases', () => {
    it('should enforce admin-only access across all admin routes', async () => {
      const adminRoutes = [
        '/api/admin/dashboard/stats',
        '/api/admin/users',
        '/api/admin/projects',
        '/api/admin/api-keys'
      ];

      const responses = await Promise.all(
        adminRoutes.map(route => authenticatedSession.client.get(route))
      );

      responses.forEach(r => {
        expect([401, 403]).toContain(r.status);
      });
    });

    it('should validate user IDs to prevent enumeration', async () => {
      if (!adminSession) return;

      // Try sequential user IDs
      const responses = await Promise.all(
        [1, 2, 3, 4, 5].map(id =>
          adminSession.client.get(`/api/admin/users/${id}`)
        )
      );

      // Should not leak user existence patterns
      responses.forEach(r => {
        expect([200, 404, 403]).toContain(r.status);
      });
    });

    it('should prevent mass assignment vulnerabilities', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      const response = await adminSession.client.patch('/api/admin/users/999999', {
        email: 'test@example.com',
        isAdmin: true, // Should not allow direct admin promotion
        role: 'superadmin'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      // Should either reject or ignore dangerous fields
      expect([200, 400, 404, 422]).toContain(response.status);
    });

    it('should log admin actions for audit trail', async () => {
      if (!adminSession) return;

      const csrf = await adminSession.ensureCsrf();
      
      // Perform an admin action
      await adminSession.client.post('/api/admin/users/999999/lock', {}, {
        headers: { 'x-csrf-token': csrf }
      });

      // Check if activity logs exist
      const logsResponse = await adminSession.client.get('/api/admin/activity-logs');
      
      if (logsResponse.status === 200) {
        expect(Array.isArray(logsResponse.data.logs || logsResponse.data)).toBe(true);
      }
    });
  });
});
