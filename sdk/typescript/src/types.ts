export interface ECodeSDKConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bio?: string;
  website?: string;
  githubUsername?: string;
  twitterUsername?: string;
  linkedinUsername?: string;
  reputation: number;
  isMentor: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  language: string;
  ownerId: string;
  isTemplate: boolean;
  likes: number;
  views: number;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: number;
  name: string;
  content: string;
  path: string;
  isFolder: boolean;
  projectId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentConfig {
  type: 'static' | 'autoscale' | 'reserved' | 'serverless' | 'scheduled';
  name: string;
  domain?: string;
  environment?: Record<string, string>;
  scaling?: {
    minInstances?: number;
    maxInstances?: number;
    targetCPU?: number;
    targetMemory?: number;
  };
  resources?: {
    cpu: string;
    memory: string;
    disk: string;
  };
  regions?: string[];
  healthCheck?: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
}

export interface BuildResult {
  id: string;
  status: 'building' | 'success' | 'failed';
  logs: string[];
  startTime: string;
  endTime?: string;
  duration?: number;
  url?: string;
}

export type AIProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'gemini' 
  | 'xai' 
  | 'perplexity' 
  | 'mixtral' 
  | 'llama' 
  | 'cohere' 
  | 'deepseek' 
  | 'mistral';

export interface AIResponse {
  message: string;
  provider: AIProviderType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

export interface CollaborationSession {
  id: string;
  projectId: number;
  users: User[];
  startTime: string;
  isActive: boolean;
}

export interface Team {
  id: number;
  name: string;
  slug: string;
  description?: string;
  visibility: 'public' | 'private';
  ownerId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  provider: AIProviderType;
  isActive: boolean;
  usageLimit?: number;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  responseBody?: string;
  attempts: number;
  nextRetry?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface Integration {
  id: string;
  type: 'slack' | 'discord' | 'jira' | 'linear' | 'datadog' | 'newrelic';
  name: string;
  config: Record<string, any>;
  isActive: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectCreateOptions {
  name: string;
  description?: string;
  language: string;
  visibility?: 'public' | 'private';
  template?: string;
  isTemplate?: boolean;
}

export interface ProjectUpdateOptions {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export interface FileCreateOptions {
  name: string;
  content?: string;
  path?: string;
  isFolder?: boolean;
}

export interface FileUpdateOptions {
  name?: string;
  content?: string;
  path?: string;
}

export interface DeploymentOptions extends DeploymentConfig {
  projectId: number;
  branch?: string;
  commit?: string;
}

export interface AIRequestOptions {
  message: string;
  provider?: AIProviderType;
  context?: {
    projectId?: number;
    fileId?: number;
    selectedCode?: string;
    mode?: 'assistant' | 'agent';
  };
  stream?: boolean;
}

export interface CollaborationOptions {
  projectId: number;
  permissions?: {
    read: boolean;
    write: boolean;
    admin: boolean;
  };
}

export interface TeamCreateOptions {
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export interface TeamUpdateOptions {
  name?: string;
  description?: string;
  visibility?: 'public' | 'private';
}

export interface IntegrationCreateOptions {
  type: 'slack' | 'discord' | 'jira' | 'linear' | 'datadog' | 'newrelic';
  name: string;
  config: Record<string, any>;
  projectId: string;
}

export interface WebhookCreateOptions {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  projectId: string;
}

export interface MetricsData {
  timestamp: string;
  value: number;
  labels?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  notifications: string[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  version: string;
  services: {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latency?: number;
    errorRate?: number;
  }[];
}