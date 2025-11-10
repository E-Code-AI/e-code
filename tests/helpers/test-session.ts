import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

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
  private readonly jar: CookieJar;
  
  public readonly client: AxiosInstance;
  
  constructor(baseClient: AxiosInstance) {
    // Create cookie jar for automatic cookie management
    this.jar = new CookieJar();
    
    // Create axios client with cookie jar support (Node.js environment)
    const wrappedClient = wrapper(axios.create({
      ...baseClient.defaults,
      validateStatus: () => true,
      withCredentials: true,
      jar: this.jar,
    }));
    
    this.client = wrappedClient as AxiosInstance;
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
    
    // Fetch fresh token (cookie jar handles cookies automatically)
    console.log('[TestSession] Fetching CSRF token...');
    const response = await this.client.get('/api/auth/csrf-token');
    console.log('[TestSession] CSRF response status:', response.status);
    console.log('[TestSession] CSRF response set-cookie:', response.headers['set-cookie']?.[0] || 'NONE');
    
    if (response.status !== 200 || !response.data?.csrfToken) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    
    this.csrfToken = response.data.csrfToken;
    this.csrfFetchedAt = Date.now();
    console.log('[TestSession] CSRF token saved:', this.csrfToken.substring(0, 16) + '...');
    
    return this.csrfToken;
  }
  
  async request<T = any>(method: string, url: string, data?: any): Promise<AxiosResponse<T>> {
    // Cookie jar handles cookies automatically, just add CSRF for mutations
    const headers: any = {};
    
    // Add CSRF token for mutating requests
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(method.toUpperCase())) {
      // FORCE fresh token for every mutation to prevent invalidation
      const csrf = await this.ensureCsrf(true);
      headers['x-csrf-token'] = csrf;
      console.log('[TestSession] Making', method, url);
      console.log('[TestSession] - CSRF token:', csrf.substring(0, 16) + '...');
    }
    
    const response = await this.client.request<T>({
      method,
      url,
      data,
      headers
    });
    
    console.log('[TestSession] Response status:', response.status);
    
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
  email?: string,
  password?: string,
  username?: string
): Promise<TestSession> {
  // Generate default credentials if not provided
  const timestamp = Date.now();
  const defaultEmail = email || `test-${timestamp}@example.com`;
  const defaultPassword = password || 'password123';
  const defaultUsername = username || `testuser${timestamp}`;
  
  const session = new TestSessionImpl(baseClient);
  
  // Register
  const registerRes = await session.register(defaultEmail, defaultPassword, defaultUsername);
  if (registerRes.status !== 200) {
    throw new Error(`Failed to register user: ${registerRes.status} - ${JSON.stringify(registerRes.data)}`);
  }
  
  // Login
  const loginRes = await session.login(defaultEmail, defaultPassword);
  if (loginRes.status !== 200) {
    throw new Error(`Failed to login user: ${loginRes.status} - ${JSON.stringify(registerRes.data)}`);
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
