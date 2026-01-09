/**
 * Mobile-Compatible Type Exports
 * 
 * This file exports types and utilities from shared/schema.ts that are compatible
 * with React Native. It excludes Drizzle ORM-specific constructs that require
 * Node.js runtime.
 * 
 * Usage in mobile/:
 *   import { User, Project, AIModel } from '../../shared/mobile-types';
 */

// Re-export pure TypeScript types (no Drizzle dependencies)
export type { UserId } from './schema';
export { normalizeUserId, isValidUserId } from './schema';

// AI Models enum values (for mobile model selector) - UPDATED January 2025
// Source: Official provider documentation verified January 2025
export const AI_MODELS = [
  // OpenAI Models (Dec 2025)
  'gpt-5.2',
  'gpt-5.2-codex',
  'gpt-5.1',
  'gpt-5',
  'gpt-4o',
  'gpt-4o-mini', 
  'o3',
  'o4-mini',
  // Anthropic Models (Nov 2025)
  'claude-opus-4-5-20251124',
  'claude-sonnet-4-5-20250929',
  'claude-haiku-4-5-20251015',
  // Google Gemini Models (Nov 2025) - Gemini 1.5 RETIRED April 2025
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  // xAI Models (Jan 2025) - grok-beta/grok-2 DEPRECATED
  'grok-4-1-fast',
  'grok-4-fast',
  'grok-4',
  // Moonshot/Kimi Models (Sept 2025) - K2 = thinking models with temp=1.0 requirement
  'kimi-k2-0905-preview',
  'kimi-k2-thinking',
  'moonshot-v1-32k',
  'moonshot-v1-128k',
] as const;

export type AIModel = typeof AI_MODELS[number];

// AI Providers
export const AI_PROVIDERS = ['openai', 'anthropic', 'gemini', 'xai', 'moonshot'] as const;
export type AIProvider = typeof AI_PROVIDERS[number];

// Subscription tiers
export const SUBSCRIPTION_TIERS = ['free', 'core', 'teams', 'enterprise'] as const;
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

// Project visibility
export const VISIBILITY_OPTIONS = ['public', 'private', 'unlisted'] as const;
export type Visibility = typeof VISIBILITY_OPTIONS[number];

// Language options
export const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go',
  'rust', 'php', 'ruby', 'swift', 'kotlin', 'html', 'css', 'sql', 'bash', 'other'
] as const;
export type Language = typeof LANGUAGES[number];

// Mobile-specific interfaces (derived from Drizzle schemas)
export interface User {
  id: number;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  createdAt: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  language: Language;
  visibility: Visibility;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface File {
  id: number;
  name: string;
  path: string;
  content?: string;
  type?: string;
  projectId: number;
  parentId?: number;
  isDirectory: boolean;
}

export interface AgentSession {
  id: number;
  projectId: number;
  userId: number;
  status: 'active' | 'paused' | 'completed' | 'error';
  aiModel: AIModel;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth types
export interface AuthUser {
  id: number;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}
