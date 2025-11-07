/**
 * Mobile API Client Adapter for Agent Session
 * Configures the shared Agent hook to use mobile's API client with authentication
 */

import { configureAgentApi, type ApiClient } from '../../../shared/agent';
import { API_URL } from '../config';

let authToken: string | null = null;

/**
 * Set the authentication token for mobile API requests
 * Call this before using the Agent session hook
 */
export function setMobileAgentToken(token: string) {
  authToken = token;
  
  // Reconfigure the API client with the new token
  const mobileApiClient: ApiClient = {
    post: async (url: string, data: any) => {
      if (!authToken) {
        throw new Error('Mobile Agent API client: No authentication token set');
      }

      const response = await fetch(`${API_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
      }
      
      return response.json();
    }
  };

  configureAgentApi(mobileApiClient);
}

/**
 * Clear the authentication token (e.g., on logout)
 */
export function clearMobileAgentToken() {
  authToken = null;
}
