import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ECodeSDKConfig, User } from './types';
import { AuthenticationError, APIError } from './errors';
import { ProjectManager } from './managers/ProjectManager';
import { FileManager } from './managers/FileManager';
import { DeploymentManager } from './managers/DeploymentManager';
import { AIManager } from './managers/AIManager';
import { CollaborationManager } from './managers/CollaborationManager';
import { UserManager } from './managers/UserManager';
import { TeamManager } from './managers/TeamManager';
import { IntegrationManager } from './managers/IntegrationManager';
import { APIKeyManager } from './managers/APIKeyManager';
import { WebhookManager } from './managers/WebhookManager';

export class ECodeSDK {
  private client: AxiosInstance;
  private config: ECodeSDKConfig;
  private _currentUser: User | null = null;

  // Manager instances
  public readonly projects: ProjectManager;
  public readonly files: FileManager;
  public readonly deployments: DeploymentManager;
  public readonly ai: AIManager;
  public readonly collaboration: CollaborationManager;
  public readonly users: UserManager;
  public readonly teams: TeamManager;
  public readonly integrations: IntegrationManager;
  public readonly apiKeys: APIKeyManager;
  public readonly webhooks: WebhookManager;

  constructor(config: ECodeSDKConfig) {
    this.config = {
      baseURL: 'https://e-code.dev/api',
      timeout: 30000,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `e-code-sdk-js/1.0.0`,
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new AuthenticationError('Authentication failed. Please check your API key.');
        }
        if (error.response?.status >= 400) {
          throw new APIError(
            error.response.data?.message || error.message,
            error.response.status,
            error.response.data
          );
        }
        throw error;
      }
    );

    // Initialize managers
    this.projects = new ProjectManager(this.client);
    this.files = new FileManager(this.client);
    this.deployments = new DeploymentManager(this.client);
    this.ai = new AIManager(this.client);
    this.collaboration = new CollaborationManager(this.client);
    this.users = new UserManager(this.client);
    this.teams = new TeamManager(this.client);
    this.integrations = new IntegrationManager(this.client);
    this.apiKeys = new APIKeyManager(this.client);
    this.webhooks = new WebhookManager(this.client);
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.client.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    if (this._currentUser) {
      return this._currentUser;
    }

    const response = await this.client.get('/user');
    this._currentUser = response.data;
    return this._currentUser;
  }

  /**
   * Test connection to E-Code API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API status and version
   */
  async getStatus(): Promise<{
    status: string;
    version: string;
    uptime: number;
  }> {
    const response = await this.client.get('/status');
    return response.data;
  }

  /**
   * Make a raw API request
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request(config);
    return response.data;
  }

  /**
   * Clear cached user data
   */
  clearCache(): void {
    this._currentUser = null;
  }

  /**
   * Get SDK configuration
   */
  getConfig(): ECodeSDKConfig {
    return { ...this.config };
  }

  /**
   * Update SDK configuration
   */
  updateConfig(config: Partial<ECodeSDKConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update axios instance if needed
    if (config.baseURL) {
      this.client.defaults.baseURL = config.baseURL;
    }
    if (config.timeout) {
      this.client.defaults.timeout = config.timeout;
    }
    if (config.apiKey) {
      this.setApiKey(config.apiKey);
    }
  }
}