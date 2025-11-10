import type { AxiosInstance } from 'axios';

/**
 * Fetches a fresh CSRF token from the server
 * @param client Axios client instance
 * @param cookie Optional session cookie for authenticated requests
 * @returns CSRF token string
 */
export async function fetchCsrfToken(client: AxiosInstance, cookie?: string): Promise<string> {
  const headers = cookie ? { Cookie: cookie } : {};
  const response = await client.get('/api/auth/csrf-token', { headers });
  
  if (response.status !== 200 || !response.data?.csrfToken) {
    throw new Error(`Failed to fetch CSRF token: ${response.status}`);
  }
  
  return response.data.csrfToken;
}

/**
 * Registers a new user
 * @param client Axios client instance
 * @param email User email
 * @param password User password
 * @param username User username
 * @returns Registration response
 */
export async function registerUser(
  client: AxiosInstance,
  email: string,
  password: string,
  username: string
) {
  const csrfToken = await fetchCsrfToken(client);
  
  return await client.post('/api/auth/register', {
    email,
    password,
    username
  }, {
    headers: { 'x-csrf-token': csrfToken }
  });
}

/**
 * Logs in a user
 * @param client Axios client instance
 * @param email User email
 * @param password User password
 * @returns Login response with session cookie
 */
export async function loginUser(
  client: AxiosInstance,
  email: string,
  password: string
) {
  const csrfToken = await fetchCsrfToken(client);
  
  return await client.post('/api/auth/login', {
    email,
    password
  }, {
    headers: { 'x-csrf-token': csrfToken }
  });
}

/**
 * Registers and logs in a user in one step
 * @param client Axios client instance
 * @param email User email
 * @param password User password
 * @param username User username
 * @returns Object with login response and session cookie
 */
export async function registerAndLogin(
  client: AxiosInstance,
  email: string,
  password: string,
  username: string
) {
  // Register
  await registerUser(client, email, password, username);
  
  // Login
  const loginRes = await loginUser(client, email, password);
  const authCookie = loginRes.headers['set-cookie']?.[0] || '';
  
  return { loginRes, authCookie };
}

/**
 * Logs out a user
 * @param client Axios client instance
 * @param authCookie Session cookie
 * @returns Logout response
 */
export async function logoutUser(
  client: AxiosInstance,
  authCookie: string
) {
  const csrfToken = await fetchCsrfToken(client, authCookie);
  
  return await client.post('/api/auth/logout', {}, {
    headers: { 
      Cookie: authCookie,
      'x-csrf-token': csrfToken
    }
  });
}
