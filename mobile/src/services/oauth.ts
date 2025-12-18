import { Linking } from 'react-native';
import { API_BASE_URL } from './config';

export type OAuthProvider = 'google' | 'github';

export interface OAuthCallbackParams {
  token?: string;
  refreshToken?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  error?: string;
}

export class OAuthService {
  static async initiateOAuth(provider: OAuthProvider): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/mobile/auth/oauth/${provider}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'OAuth initialization failed');
      }
      
      if (data.authUrl) {
        const canOpen = await Linking.canOpenURL(data.authUrl);
        if (canOpen) {
          await Linking.openURL(data.authUrl);
        } else {
          throw new Error('Cannot open authentication URL');
        }
      } else {
        throw new Error('No authentication URL received');
      }
    } catch (error: any) {
      console.error(`[OAuth] ${provider} init error:`, error);
      throw error;
    }
  }

  static parseCallbackUrl(url: string): OAuthCallbackParams {
    try {
      const urlObj = new URL(url);
      const params: OAuthCallbackParams = {};
      
      urlObj.searchParams.forEach((value, key) => {
        (params as any)[key] = value;
      });
      
      return params;
    } catch (error) {
      console.error('[OAuth] Failed to parse callback URL:', error);
      return {};
    }
  }

  static isOAuthCallback(url: string): boolean {
    return url.startsWith('ecode://auth/callback');
  }
}

export default OAuthService;
