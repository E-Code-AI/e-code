import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, User } from '../types';
import { API_BASE_URL } from './config';

const AUTH_TOKEN_KEY = '@ecode_auth_token';
const REFRESH_TOKEN_KEY = '@ecode_refresh_token';
const USER_KEY = '@ecode_user';

export class AuthService {
  private static token: string | null = null;
  private static refreshToken: string | null = null;
  private static user: User | null = null;

  // Initialize auth state from storage
  static async initialize(): Promise<boolean> {
    try {
      const [token, refreshToken, userStr] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY)
      ]);

      this.token = token;
      this.refreshToken = refreshToken;
      this.user = userStr ? JSON.parse(userStr) : null;

      return !!token && !!this.user;
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return false;
    }
  }

  // Login
  static async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/mobile/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();

      // Store tokens and user
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token),
        data.refreshToken && AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user))
      ]);

      this.token = data.token;
      this.refreshToken = data.refreshToken || null;
      this.user = data.user;

      return data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint if needed
      if (this.token) {
        try {
          await fetch(`${API_BASE_URL}/mobile/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            }
          });
        } catch (error) {
          console.warn('Logout API call failed:', error);
        }
      }

      // Clear storage
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY)
      ]);

      this.token = null;
      this.refreshToken = null;
      this.user = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Refresh token
  static async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/mobile/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      if (!response.ok) {
        await this.logout();
        return null;
      }

      const data = await response.json();
      const newToken = data.token;

      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      this.token = newToken;

      return newToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.logout();
      return null;
    }
  }

  // Get current token
  static getToken(): string | null {
    return this.token;
  }

  // Get current user
  static getUser(): User | null {
    return this.user;
  }

  // Check if authenticated
  static isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Update user data
  static async updateUser(updates: Partial<User>): Promise<User> {
    if (!this.user) {
      throw new Error('No user logged in');
    }

    const updatedUser = { ...this.user, ...updates };
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    this.user = updatedUser;

    return updatedUser;
  }
}

export default AuthService;
