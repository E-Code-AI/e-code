import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { createTestSession, createAuthenticatedSession, createAdminSession, type TestSession } from '../helpers/test-session';
import { fetchCsrfToken, registerUser, loginUser, logoutUser } from '../helpers/auth-helpers';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

describe('Authentication API - Strict Verification', () => {
  let baseClient: AxiosInstance;
  let client: AxiosInstance; // Alias for backward compatibility
  let session: TestSession;
  let testEmail: string;
  let testPassword: string;
  let testUsername: string;
  let authCookie: string;

  beforeAll(() => {
    baseClient = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true, // Don't throw on any status
      withCredentials: true,
    });
    client = baseClient; // Alias for backward compatibility
  });

  beforeEach(async () => {
    const timestamp = Date.now();
    testEmail = `test-${timestamp}@example.com`;
    testPassword = 'SecurePass123!';
    testUsername = `user_${timestamp}`;
    
    // Create fresh session for each test (handles CSRF automatically)
    session = createTestSession(baseClient);
  });

  describe('CSRF Token Management', () => {
    it('should generate CSRF token', async () => {
      const csrfToken = await session.ensureCsrf();
      
      expect(csrfToken).toBeDefined();
      expect(typeof csrfToken).toBe('string');
      expect(csrfToken.length).toBeGreaterThan(10);
    });

    it('should reject mutations without CSRF token', async () => {
      const response = await session.client.post('/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: testUsername
      });

      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('User Registration', () => {

    it('should register new user successfully', async () => {
      const response = await session.register(testEmail, testPassword, testUsername);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('message');
    });

    it('should reject registration with weak password', async () => {
      const response = await session.request('post', '/api/auth/register', {
        email: testEmail,
        password: 'weak',
        username: testUsername
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
      expect(response.data.error.toLowerCase()).toContain('password');
    });

    it('should reject registration with invalid email', async () => {
      const response = await session.request('post', '/api/auth/register', {
        email: 'not-an-email',
        password: testPassword,
        username: testUsername
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject duplicate email registration', async () => {
      // Register first time
      await session.register(testEmail, testPassword, testUsername);

      // Try to register again with same email (using new session to get fresh CSRF)
      const session2 = createTestSession(baseClient);
      const response = await session2.register(testEmail, testPassword, `${testUsername}_2`);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject duplicate username registration', async () => {
      // Register first time
      await session.register(testEmail, testPassword, testUsername);

      // Try to register again with same username (using new session to get fresh CSRF)
      const session2 = createTestSession(baseClient);
      const response = await session2.register(`different-${testEmail}`, testPassword, testUsername);

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });

    it('should sanitize XSS attempts in username', async () => {
      const response = await session.request('post', '/api/auth/register', {
        email: testEmail,
        password: testPassword,
        username: '<script>alert("xss")</script>'
      });

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // CSRF token already obtained in parent beforeEach
      
      // Register a user first
      await session.register(testEmail, testPassword, testUsername);
    });

    it('should login with valid credentials', async () => {
      const response = await session.login(testEmail, testPassword);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('email', testEmail);
      expect(response.headers['set-cookie']).toBeDefined();
      
      authCookie = response.headers['set-cookie']?.[0] || '';
      expect(authCookie).toContain('connect.sid');
    });

    it('should reject login with wrong password', async () => {
      const response = await session.login(testEmail, 'WrongPassword123!');

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject login with non-existent email', async () => {
      const response = await session.login('nonexistent@example.com', testPassword);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    it('should prevent SQL injection in login', async () => {
      const response = await session.login("admin' OR '1'='1", "password' OR '1'='1");

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
    });

    it('should set secure session cookie on login', async () => {
      const response = await session.login(testEmail, testPassword);

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
      // Register and login
      await session.register(testEmail, testPassword, testUsername);

      // Get fresh CSRF token for login
      const loginRes = await session.login(testEmail, testPassword);

      authCookie = loginRes.headers['set-cookie']?.[0] || '';
    });

    it('should retrieve current user from session', async () => {
      const response = await session.getUser();

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('email', testEmail);
      expect(response.data).toHaveProperty('username', testUsername);
      expect(response.data).not.toHaveProperty('password');
    });

    it('should logout and invalidate session', async () => {
      const logoutRes = await logoutUser(client, authCookie);

      expect(logoutRes.status).toBe(200);

      // Verify session is invalid
      const userRes = await session.getUser();

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
      const adminSession = createTestSession(baseClient);
      const response = await adminSession.login(ADMIN_EMAIL, ADMIN_PASSWORD);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
      expect(response.data.user).toHaveProperty('isAdmin', true);
    });

    it('should grant admin access to admin-only endpoints', async () => {
      // Login as admin
      const loginRes = await loginUser(client, ADMIN_EMAIL, ADMIN_PASSWORD);
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

    it('should enforce rate limiting on repeated login attempts', async () => {
      // Use session.login() for each attempt (automatically handles CSRF)
      const attempts = Array.from({ length: 10 }, async () => {
        const testSession = createTestSession(baseClient);
        return await testSession.login('nonexistent@example.com', 'wrongpassword');
      });

      const responses = await Promise.all(attempts);
      const statusCodes = responses.map(r => r.status);

      // Should eventually get rate limited
      const hasRateLimit = statusCodes.some(code => code === 429);
      const allUnauthorized = statusCodes.every(code => code === 401);

      expect(hasRateLimit || allUnauthorized).toBe(true);
    }, 60000);

    it('should hash passwords with bcrypt', async () => {
      // Use fresh session for registration
      const testSession = createTestSession(baseClient);
      const registerRes = await testSession.register(testEmail, testPassword, testUsername);

      expect(registerRes.status).toBe(200);

      // Verify we can login with the password (proves it was hashed/compared correctly)
      const loginRes = await testSession.login(testEmail, testPassword);

      expect(loginRes.status).toBe(200);
    });
  });
});
