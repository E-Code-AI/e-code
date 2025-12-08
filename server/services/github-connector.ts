import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken(): Promise<string | null> {
  try {
    if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
      return connectionSettings.settings.access_token;
    }
    
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!xReplitToken || !hostname) {
      console.log('[GitHub Connector] Replit connector environment not available');
      return null;
    }

    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    const data = await response.json() as any;
    connectionSettings = data.items?.[0];

    const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!connectionSettings || !accessToken) {
      console.log('[GitHub Connector] GitHub not connected via Replit');
      return null;
    }
    
    return accessToken;
  } catch (error) {
    console.error('[GitHub Connector] Error getting access token:', error);
    return null;
  }
}

export async function isGitHubConnected(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

export async function getGitHubClient(): Promise<Octokit | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }
  return new Octokit({ auth: accessToken });
}

export async function getGitHubToken(): Promise<string | null> {
  return await getAccessToken();
}

export interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  avatarUrl?: string;
}

export async function getGitHubConnectionStatus(): Promise<GitHubConnectionStatus> {
  try {
    const client = await getGitHubClient();
    if (!client) {
      return { connected: false };
    }
    
    const { data: user } = await client.users.getAuthenticated();
    return {
      connected: true,
      username: user.login,
      avatarUrl: user.avatar_url
    };
  } catch (error) {
    console.error('[GitHub Connector] Error checking connection status:', error);
    return { connected: false };
  }
}

export async function getGitCredentials(): Promise<{ username: string; password: string } | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }
    
    const client = await getGitHubClient();
    if (!client) {
      return null;
    }
    
    const { data: user } = await client.users.getAuthenticated();
    return {
      username: user.login,
      password: token
    };
  } catch (error) {
    console.error('[GitHub Connector] Error getting credentials:', error);
    return null;
  }
}
