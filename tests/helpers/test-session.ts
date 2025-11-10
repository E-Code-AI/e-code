import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';

/**
 * Test Session Interface
 * Encapsulates CSRF token lifecycle and cookie management for testing
 */
export interface TestSession {
  /** Get current session cookie */
  getCookie(): string | null;
  
  /** Ensure CSRF token is fresh (fetch if needed) */
  ensureCsrf(force?: boolean): Promise<string>;
  
  /** Make an authenticated request with automatic CSRF handling */
  request<T = any>(method: string, url: string, data?: any): Promise<AxiosResponse<T>>;
  
  /** Register a new user */
  register(email: string, password: string, username: string): Promise<AxiosResponse>;
  
  /** Login a user */
  login(email: string, password: string): Promise<AxiosResponse>;
  
  /** Logout current user */
  logout(): Promise<AxiosResponse>;
  
  /** Get current user */
  getUser(): Promise<AxiosResponse>;
  
  /** Raw axios client (for advanced usage) */
  client: AxiosInstance;
}

/**
 * Create a test session with automatic CSRF and cookie management
 */
class TestSessionImpl implements TestSession {
  private cookie: string | null = null;
  private csrfToken: string | null = null;
  private csrfFetchedAt: number | null = null;
  private readonly CSRF_EXPIRY = 60 * 60 * 1000; // 1 hour
  
  public readonly client: AxiosInstance;
  
  constructor(baseClient: AxiosInstance) {
    // Clone base client with session-specific defaults
    this.client = axios.create({
      ...baseClient.defaults,
      validateStatus: () => true,
      withCredentials: true,
    });
    
    // Intercept responses to persist set-cookie headers
    this.client.interceptors.response.use((response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        this.cookie = setCookie[0];
      }
      return response;
    });
  }
  
  getCookie(): string | null {
    return this.cookie;
  }
  
  async ensureCsrf(force: boolean = false): Promise<string> {
    // Check if we need to fetch a new token
    const needsRefresh = force 
      || !this.csrfToken 
      || !this.csrfFetchedAt
      || (Date.now() - this.csrfFetchedAt > this.CSRF_EXPIRY);
    
    if (!needsRefresh && this.csrfToken) {
      return this.csrfToken;
    }
    
    // Fetch fresh token
    const headers = this.cookie ? { Cookie: this.cookie } : {};
    const response = await this.client.get('/api/auth/csrf-token', { headers });
    
    if (response.status !== 200 || !response.data?.csrfToken) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    
    this.csrfToken = response.data.csrfToken;
    this.csrfFetchedAt = Date.now();
    
    return this.csrfToken;
  }
  
  async request<T = any>(method: string, url: string, data?: any): Promise<AxiosResponse<T>> {
    // Get headers (cookie + CSRF for mutations)
    const headers: any = {};
    
    if (this.cookie) {
      headers.Cookie = this.cookie;
    }
    
    // Add CSRF token for mutating requests
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(method.toUpperCase())) {
      // FORCE fresh token for every mutation to prevent invalidation
      const csrf = await this.ensureCsrf(true);
      headers['x-csrf-token'] = csrf;
    }
    
    const response = await this.client.request<T>({
      method,
      url,
      data,
      headers
    });
    
    // Clear cached token after successful mutation (token consumed)
    if (mutatingMethods.includes(method.toUpperCase()) && response.status >= 200 && response.status < 300) {
      this.csrfToken = null;
      this.csrfFetchedAt = null;
    }
    
    return response;
  }
  
  /**
   * Manually invalidate CSRF token (forces refresh on next use)
   */
  invalidateCsrf(): void {
    this.csrfToken = null;
    this.csrfFetchedAt = null;
  }
  
  async register(email: string, password: string, username: string): Promise<AxiosResponse> {
    return await this.request('POST', '/api/auth/register', {
      email,
      password,
      username
    });
  }
  
  async login(email: string, password: string): Promise<AxiosResponse> {
    return await this.request('POST', '/api/auth/login', {
      email,
      password
    });
  }
  
  async logout(): Promise<AxiosResponse> {
    return await this.request('POST', '/api/auth/logout', {});
  }
  
  async getUser(): Promise<AxiosResponse> {
    return await this.request('GET', '/api/auth/user');
  }
}

/**
 * Create an anonymous test session
 */
export function createTestSession(baseClient: AxiosInstance): TestSession {
  return new TestSessionImpl(baseClient);
}

/**
 * Create an authenticated test session (auto-registered + logged-in)
 */
export async function createAuthenticatedSession(
  baseClient: AxiosInstance,
  email: string,
  password: string,
  username: string
): Promise<TestSession> {
  const session = new TestSessionImpl(baseClient);
  
  // Register
  const registerRes = await session.register(email, password, username);
  if (registerRes.status !== 200) {
    throw new Error(`Failed to register user: ${registerRes.status} - ${JSON.stringify(registerRes.data)}`);
  }
  
  // Login
  const loginRes = await session.login(email, password);
  if (loginRes.status !== 200) {
    throw new Error(`Failed to login user: ${loginRes.status} - ${JSON.stringify(loginRes.data)}`);
  }
  
  return session;
}

/**
 * Create an admin test session (logged in as admin)
 */
export async function createAdminSession(baseClient: AxiosInstance): Promise<TestSession> {
  const session = new TestSessionImpl(baseClient);
  
  // Login as admin with known credentials
  const ADMIN_EMAIL = 'admin@replit.com';
  const ADMIN_PASSWORD = 'admin123';
  
  const loginRes = await session.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (loginRes.status !== 200) {
    throw new Error(`Failed to login as admin: ${loginRes.status} - ${JSON.stringify(loginRes.data)}`);
  }
  
  return session;
}

/**
 * Suite Session Pool - Shared sessions for an entire test suite
 * Use in beforeAll/afterAll to reduce CSRF token requests
 */
export interface SuiteSessionPool {
  /** Anonymous session (no authentication) */
  anonymous: TestSession;
  
  /** Authenticated regular user session */
  authenticated: TestSession;
  
  /** Admin session (null if admin user doesn't exist) */
  admin: TestSession | null;
  
  /** Cleanup all sessions */
  cleanup(): Promise<void>;
}

/**
 * Create a pool of shared test sessions for an entire suite
 * Reduces CSRF token requests from 160+ to ~5 per suite
 * 
 * Usage:
 * ```typescript
 * describe('My Suite', () => {
 *   let sessions: SuiteSessionPool;
 *   
 *   beforeAll(async () => {
 *     sessions = await useSuiteSessions(baseClient);
 *   });
 *   
 *   afterAll(async () => {
 *     await sessions.cleanup();
 *   });
 *   
 *   it('test', async () => {
 *     const response = await sessions.authenticated.client.get('/api/something');
 *   });
 * });
 * ```
 */
export async function useSuiteSessions(baseClient: AxiosInstance): Promise<SuiteSessionPool> {
  // Generate unique credentials for this suite
  const timestamp = Date.now();
  const email = `suite-${timestamp}@example.com`;
  const password = 'SecurePass123!';
  const username = `suite_${timestamp}`;
  
  // Create anonymous session
  const anonymous = new TestSessionImpl(baseClient);
  
  // Create authenticated session
  const authenticated = new TestSessionImpl(baseClient);
  const registerRes = await authenticated.register(email, password, username);
  if (registerRes.status !== 200) {
    throw new Error(`Failed to create authenticated session: ${registerRes.status} - ${JSON.stringify(registerRes.data)}`);
  }
  
  const loginRes = await authenticated.login(email, password);
  if (loginRes.status !== 200) {
    throw new Error(`Failed to login authenticated session: ${loginRes.status} - ${JSON.stringify(loginRes.data)}`);
  }
  
  // Try to create admin session (may fail if admin user doesn't exist)
  let admin: TestSession | null = null;
  try {
    admin = await createAdminSession(baseClient);
  } catch (error) {
    // Admin user doesn't exist - that's ok
    console.warn('Admin session creation failed (admin user may not exist):', error);
  }
  
  // Cleanup function to logout all sessions
  const cleanup = async () => {
    const logoutPromises: Promise<any>[] = [];
    
    if (authenticated) {
      logoutPromises.push(authenticated.logout().catch(() => {}));
    }
    
    if (admin) {
      logoutPromises.push(admin.logout().catch(() => {}));
    }
    
    await Promise.all(logoutPromises);
  };
  
  return {
    anonymous,
    authenticated,
    admin,
    cleanup
  };
}
