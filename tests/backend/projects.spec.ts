import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { createTestSession, type TestSession } from '../helpers/test-session';

describe('Projects API - Strict Verification', () => {
  let baseClient: AxiosInstance;
  let session: TestSession;
  let testEmail: string;
  let testPassword: string;
  let testUsername: string;

  beforeAll(() => {
    const baseURL = process.env.VITE_API_URL || 'http://localhost:5000';
    baseClient = axios.create({
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
    
    // Create session with automatic cookie management
    session = createTestSession(baseClient);
    
    // Register and login user
    await session.register(testEmail, testPassword, testUsername);
    await session.login(testEmail, testPassword);
  });

  describe('Project Creation', () => {
    it('should create a new project with valid data', async () => {
      // Use session.request() which handles CSRF automatically
      const response = await session.request('POST', '/api/projects', {
        name: 'Test Project',
        description: 'A test project',
        template: 'blank',
        visibility: 'private'
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
      // Directly use client without session to bypass CSRF handling
      const response = await session.client.post('/api/projects', {
        name: 'Test Project',
        template: 'blank'
      });

      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty('error');
    });

    it('should reject project creation without authentication', async () => {
      // Create new anonymous session (no login)
      const anonSession = createTestSession(baseClient);
      const csrf = await anonSession.ensureCsrf();

      const response = await anonSession.client.post('/api/projects', {
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
      // Use session.request() for authenticated request
      const response = await session.request('GET', '/api/projects');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});
