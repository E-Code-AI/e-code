import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

describe('Projects API - Strict Verification', () => {
  let client: AxiosInstance;
  let csrfToken: string;
  let authCookie: string;
  let testEmail: string;
  let testPassword: string;
  let testUsername: string;

  beforeAll(() => {
    const baseURL = process.env.VITE_API_URL || 'http://localhost:5000';
    client = axios.create({
      baseURL,
      validateStatus: () => true,
      withCredentials: true,
    });
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testEmail = `test-${timestamp}@example.com`;
    testPassword = 'SecurePass123!';
    testUsername = `user_${timestamp}`;
    
    // Register user
    const csrfRes1 = await client.get('/api/auth/csrf-token');
    csrfToken = csrfRes1.data.csrfToken;
    
    await client.post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      username: testUsername
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    // Login user
    const csrfRes2 = await client.get('/api/auth/csrf-token');
    const loginRes = await client.post('/api/auth/login', {
      email: testEmail,
      password: testPassword
    }, {
      headers: { 'x-csrf-token': csrfRes2.data.csrfToken }
    });

    authCookie = loginRes.headers['set-cookie']?.[0] || '';
  });

  describe('Project Creation', () => {
    it('should create a new project with valid data', async () => {
      // Get fresh CSRF token
      const csrfRes = await client.get('/api/auth/csrf-token', {
        headers: { Cookie: authCookie }
      });
      const csrf = csrfRes.data.csrfToken;

      const response = await client.post('/api/projects', {
        name: 'Test Project',
        description: 'A test project',
        template: 'blank',
        visibility: 'private'
      }, {
        headers: { 
          'x-csrf-token': csrf,
          Cookie: authCookie
        }
      });

      console.log('[TEST] Create project response:', {
        status: response.status,
        data: response.data
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('name', 'Test Project');
      expect(response.data).toHaveProperty('slug');
    });

    it('should reject project creation without CSRF token', async () => {
      const response = await client.post('/api/projects', {
        name: 'Test Project',
        template: 'blank'
      }, {
        headers: { Cookie: authCookie }
      });

      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject project creation without authentication', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const csrf = csrfRes.data.csrfToken;

      const response = await client.post('/api/projects', {
        name: 'Test Project',
        template: 'blank'
      }, {
        headers: { 'x-csrf-token': csrf }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Project Retrieval', () => {
    it('should list user projects', async () => {
      const response = await client.get('/api/projects', {
        headers: { Cookie: authCookie }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});
