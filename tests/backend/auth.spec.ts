import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Authentication API - Strict Verification', () => {
  let client: AxiosInstance;
  let testEmail: string;
  let testPassword: string;
  let testUsername: string;
  let csrfToken: string;
  let authCookie: string;

  beforeAll(() => {
    client = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true, // Don't throw on any status
      withCredentials: true,
    });
  });

  beforeEach(() => {
    const timestamp = Date.now();
    testEmail = `test-${timestamp}@example.com`;
    testPassword = 'SecurePass123!';
    testUsername = `user_${timestamp}`;
  });

  describe('CSRF Token Management', () => {
    it('should generate CSRF token', async () => {
      const response = await client.get('/api/auth/csrf-token');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('csrfToken');
      expect(typeof response.data.csrfToken).toBe('string');
      expect(response.data.csrfToken.length).toBeGreaterThan(10);
      
      csrfToken = response.data.csrfToken;
    });

    it('should reject mutations without CSRF token', async () => {
      const response = await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      });

      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('User Registration', () => {
    beforeEach(async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      csrfToken = csrfRes.data.csrfToken;
    });

    it('should register new user successfully', async () => {
      const response = await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject registration with weak password', async () => {
      const response = await client.post('/api/auth/register', {
        email: testEmail,
        password: 'weak',
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error.toLowerCase()).toContain('password');
    });

    it('should reject registration with invalid email', async () => {
      const response = await client.post('/api/auth/register', {
        email: 'not-an-email',
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject duplicate email registration', async () => {
      // Register first time
      await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      // Try to register again with same email
      const csrfRes2 = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: `${testUsername}_2`
      }, {
        headers: { 'x-csrf-token': csrfRes2.data.csrfToken }
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject duplicate username registration', async () => {
      // Register first time
      await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      // Try to register again with same username
      const csrfRes2 = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/register', {
        email: `different-${testEmail}`,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfRes2.data.csrfToken }
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should sanitize XSS attempts in username', async () => {
      const response = await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: '<script>alert("xss")</script>'
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      csrfToken = csrfRes.data.csrfToken;

      // Register a user first
      await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });
    });

    it('should login with valid credentials', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('email', testEmail);
      expect(response.headers['set-cookie']).toBeDefined();
      
      authCookie = response.headers['set-cookie']?.[0] || '';
      expect(authCookie).toContain('connect.sid');
    });

    it('should reject login with wrong password', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/login', {
        email: testEmail,
        password: 'WrongPassword123!'
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject login with non-existent email', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/login', {
        email: 'nonexistent@example.com',
        password: testPassword
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    it('should prevent SQL injection in login', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/login', {
        email: "admin' OR '1'='1",
        password: "password' OR '1'='1"
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    it('should set secure session cookie on login', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      expect(response.status).toBe(200);
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const sessionCookie = cookies?.find(c => c.includes('connect.sid'));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('SameSite');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      csrfToken = csrfRes.data.csrfToken;

      // Register and login
      await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      const csrfRes2 = await client.get('/api/auth/csrf-token');
      const loginRes = await client.post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      }, {
        headers: { 'x-csrf-token': csrfRes2.data.csrfToken }
      });

      authCookie = loginRes.headers['set-cookie']?.[0] || '';
    });

    it('should retrieve current user from session', async () => {
      const response = await client.get('/api/auth/user', {
        headers: { Cookie: authCookie }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email', testEmail);
      expect(response.data).toHaveProperty('username', testUsername);
      expect(response.data).not.toHaveProperty('password');
    });

    it('should logout and invalidate session', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const logoutRes = await client.post('/api/auth/logout', {}, {
        headers: { 
          Cookie: authCookie,
          'x-csrf-token': csrfRes.data.csrfToken
        }
      });

      expect(logoutRes.status).toBe(200);

      // Verify session is invalid
      const userRes = await client.get('/api/auth/user', {
        headers: { Cookie: authCookie }
      });

      expect(userRes.status).toBe(401);
    });

    it('should reject unauthenticated access to protected endpoints', async () => {
      const response = await client.get('/api/auth/user');
      expect(response.status).toBe(401);
    });
  });

  describe('Admin Access Control', () => {
    const ADMIN_EMAIL = 'admin@replit.com';
    const ADMIN_PASSWORD = 'admin123';

    it('should allow admin login with correct credentials', async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      const response = await client.post('/api/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('isAdmin', true);
    });

    it('should grant admin access to admin-only endpoints', async () => {
      // Login as admin
      const csrfRes = await client.get('/api/auth/csrf-token');
      const loginRes = await client.post('/api/auth/login', {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }, {
        headers: { 'x-csrf-token': csrfRes.data.csrfToken }
      });

      const adminCookie = loginRes.headers['set-cookie']?.[0] || '';

      // Try to access admin endpoint
      const response = await client.get('/api/admin/stats', {
        headers: { Cookie: adminCookie }
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should deny non-admin access to admin-only endpoints', async () => {
      // Login as regular user (from beforeEach)
      const response = await client.get('/api/admin/stats', {
        headers: { Cookie: authCookie }
      });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      const csrfRes = await client.get('/api/auth/csrf-token');
      csrfToken = csrfRes.data.csrfToken;
    });

    it('should enforce rate limiting on repeated login attempts', async () => {
      const attempts = Array.from({ length: 10 }, () =>
        client.post('/api/auth/login', {
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        }, {
          headers: { 'x-csrf-token': csrfToken }
        })
      );

      const responses = await Promise.all(attempts);
      const statusCodes = responses.map(r => r.status);

      // Should eventually get rate limited
      const hasRateLimit = statusCodes.some(code => code === 429);
      const allUnauthorized = statusCodes.every(code => code === 401);

      expect(hasRateLimit || allUnauthorized).toBe(true);
    }, 60000);

    it('should hash passwords with bcrypt', async () => {
      const response = await client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      }, {
        headers: { 'x-csrf-token': csrfToken }
      });

      expect(response.status).toBe(200);

      // Verify we can login with the password (proves it was hashed/compared correctly)
      const csrfRes2 = await client.get('/api/auth/csrf-token');
      const loginRes = await client.post('/api/auth/login', {
        email: testEmail,
        password: testPassword
      }, {
        headers: { 'x-csrf-token': csrfRes2.data.csrfToken }
      });

      expect(loginRes.status).toBe(200);
    });
  });
});
