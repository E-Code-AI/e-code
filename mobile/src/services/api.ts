import { AuthResponse, Project, ProjectFile, RunResult } from '../types';
import { API_BASE_URL } from './config';
import { offlineCacheService } from './offline-cache';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  useCache?: boolean;
  cacheTtl?: number;
  cacheKey?: string;
};

type CachedResponse<T> = {
  data: T;
  fromCache: boolean;
  isStale: boolean;
};

const jsonHeaders = {
  'Content-Type': 'application/json'
};

// Default cache TTLs by resource type
const CACHE_TTL = {
  projects: 5 * 60 * 1000,      // 5 minutes
  files: 2 * 60 * 1000,         // 2 minutes
  notifications: 1 * 60 * 1000, // 1 minute
  templates: 30 * 60 * 1000,    // 30 minutes
  collaborators: 5 * 60 * 1000, // 5 minutes
  deployments: 2 * 60 * 1000,   // 2 minutes
};

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && payload.message) ||
      (payload && typeof payload === 'object' && 'error' in payload && payload.error) ||
      response.statusText ||
      'Request failed';

    throw new Error(String(message));
  }

  return payload as T;
}

/**
 * Core request function (no caching)
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = { ...jsonHeaders };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  return handleResponse<T>(response);
}

/**
 * Request with offline cache support
 * Automatically caches GET requests and falls back to cache when offline
 */
async function requestWithCache<T>(
  path: string,
  options: RequestOptions = {}
): Promise<CachedResponse<T>> {
  const { 
    method = 'GET', 
    body, 
    token, 
    useCache = true, 
    cacheTtl,
    cacheKey 
  } = options;

  // Only cache GET requests
  if (method !== 'GET' || !useCache) {
    const data = await request<T>(path, options);
    return { data, fromCache: false, isStale: false };
  }

  const fetchFn = async () => {
    const headers: Record<string, string> = { ...jsonHeaders };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    return handleResponse<T>(response);
  };

  return offlineCacheService.fetchWithCache<T>(path, fetchFn, {
    ttl: cacheTtl,
    cacheKey: cacheKey || path,
  });
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return offlineCacheService.getOnlineStatus();
}

/**
 * Subscribe to online status changes
 */
export function onOnlineStatusChange(listener: (online: boolean) => void): () => void {
  return offlineCacheService.onStatusChange(listener);
}

/**
 * Invalidate cache for a resource pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  await offlineCacheService.invalidatePattern(pattern);
}

// ============================================================================
// Auth API (no caching - always fresh)
// ============================================================================

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/mobile/auth/login', {
    method: 'POST',
    body: { username, password }
  });
}

// ============================================================================
// Projects API (with offline caching)
// ============================================================================

export async function getProjects(token: string): Promise<Project[]> {
  const result = await requestWithCache<Project[]>('/mobile/projects', { 
    token,
    cacheTtl: CACHE_TTL.projects,
  });
  return result.data;
}

/**
 * Get projects with cache metadata
 * Returns whether data is from cache and if it's stale
 */
export async function getProjectsWithMeta(token: string): Promise<CachedResponse<Project[]>> {
  return requestWithCache<Project[]>('/mobile/projects', { 
    token,
    cacheTtl: CACHE_TTL.projects,
  });
}

export async function getProjectFiles(projectId: number, token: string): Promise<ProjectFile[]> {
  const result = await requestWithCache<ProjectFile[]>(
    `/mobile/projects/${projectId}/files`, 
    { 
      token,
      cacheTtl: CACHE_TTL.files,
      cacheKey: `projects/${projectId}/files`,
    }
  );
  return result.data;
}

export async function updateProjectFile(
  projectId: number,
  fileId: number,
  content: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const result = await request<{ success: boolean; message: string }>(
    `/mobile/projects/${projectId}/files/${fileId}`,
    {
      method: 'PUT',
      token,
      body: { content }
    }
  );
  
  // Invalidate file cache after update
  await offlineCacheService.invalidate(`projects/${projectId}/files`);
  
  return result;
}

export async function runProject(
  projectId: number,
  options: { fileId?: number; code: string; language?: string },
  token: string
): Promise<RunResult> {
  return request<RunResult>(`/mobile/projects/${projectId}/run`, {
    method: 'POST',
    token,
    body: options
  });
}

// Search API
export type SearchResult = {
  type: 'project' | 'file' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
};

export async function searchAll(
  query: string,
  token: string
): Promise<SearchResult[]> {
  return request<SearchResult[]>(`/mobile/search?q=${encodeURIComponent(query)}`, { token });
}

// ============================================================================
// Notifications API (with caching)
// ============================================================================

export type Notification = {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
};

export async function getNotifications(token: string): Promise<Notification[]> {
  const result = await requestWithCache<Notification[]>('/mobile/notifications', { 
    token,
    cacheTtl: CACHE_TTL.notifications,
  });
  return result.data;
}

export async function markNotificationRead(
  notificationId: string,
  token: string
): Promise<{ success: boolean }> {
  const result = await request<{ success: boolean }>(`/mobile/notifications/${notificationId}/read`, {
    method: 'POST',
    token
  });
  // Invalidate notifications cache
  await offlineCacheService.invalidate('/mobile/notifications');
  return result;
}

export async function markAllNotificationsRead(token: string): Promise<{ success: boolean }> {
  const result = await request<{ success: boolean }>('/mobile/notifications/read-all', {
    method: 'POST',
    token
  });
  // Invalidate notifications cache
  await offlineCacheService.invalidate('/mobile/notifications');
  return result;
}

// Profile API
export async function updateProfile(
  data: { displayName?: string; bio?: string; location?: string; website?: string },
  token: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>('/mobile/profile', {
    method: 'PATCH',
    token,
    body: data
  });
}

// File Manager API
export async function getFiles(
  projectId: number,
  path: string,
  token: string
): Promise<ProjectFile[]> {
  return request<ProjectFile[]>(
    `/mobile/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
    { token }
  );
}

export async function createFile(
  projectId: number,
  data: { name: string; path: string; isDirectory: boolean },
  token: string
): Promise<ProjectFile> {
  return request<ProjectFile>(`/mobile/projects/${projectId}/files`, {
    method: 'POST',
    token,
    body: data
  });
}

export async function renameFile(
  projectId: number,
  fileId: number,
  newName: string,
  token: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/mobile/projects/${projectId}/files/${fileId}/rename`, {
    method: 'POST',
    token,
    body: { name: newName }
  });
}

export async function deleteFile(
  projectId: number,
  fileId: number,
  token: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/mobile/projects/${projectId}/files/${fileId}`, {
    method: 'DELETE',
    token
  });
}

// Deployments API
export type Deployment = {
  id: string;
  status: 'success' | 'failed' | 'pending' | 'building';
  branch: string;
  commit: string;
  timestamp: string;
  url?: string;
};

export async function getDeployments(
  projectId: number,
  token: string
): Promise<Deployment[]> {
  return request<Deployment[]>(`/mobile/projects/${projectId}/deployments`, { token });
}

export async function createDeployment(
  projectId: number,
  data: { branch: string },
  token: string
): Promise<Deployment> {
  return request<Deployment>(`/mobile/projects/${projectId}/deployments`, {
    method: 'POST',
    token,
    body: data
  });
}

// Collaboration API
export type Collaborator = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'online' | 'offline';
  lastActive?: string;
};

export async function getCollaborators(
  projectId: number,
  token: string
): Promise<Collaborator[]> {
  return request<Collaborator[]>(`/mobile/projects/${projectId}/collaborators`, { token });
}

export async function inviteCollaborator(
  projectId: number,
  data: { email: string; role: string },
  token: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/mobile/projects/${projectId}/collaborators/invite`,
    { method: 'POST', token, body: data }
  );
}

export async function removeCollaborator(
  projectId: number,
  collaboratorId: string,
  token: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/mobile/projects/${projectId}/collaborators/${collaboratorId}`,
    { method: 'DELETE', token }
  );
}

// ============================================================================
// Templates API (heavily cached - rarely changes)
// ============================================================================

export type Template = {
  id: string;
  name: string;
  description: string;
  language: string;
  category: string;
  downloads: number;
  icon: string;
};

export async function getTemplates(
  category?: string,
  token?: string
): Promise<Template[]> {
  const params = category && category !== 'all' ? `?category=${category}` : '';
  const cacheKey = `templates${category ? `-${category}` : '-all'}`;
  
  const result = await requestWithCache<Template[]>(`/mobile/templates${params}`, { 
    token,
    cacheTtl: CACHE_TTL.templates,
    cacheKey,
  });
  return result.data;
}

export async function createProjectFromTemplate(
  templateId: string,
  projectName: string,
  token: string
): Promise<Project> {
  return request<Project>('/mobile/projects/from-template', {
    method: 'POST',
    token,
    body: { templateId, name: projectName }
  });
}

// Settings/Auth API
export async function logout(token: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/mobile/auth/logout', {
    method: 'POST',
    token
  });
}

export async function clearCache(token: string): Promise<{ success: boolean; clearedBytes: number }> {
  return request<{ success: boolean; clearedBytes: number }>('/mobile/cache/clear', {
    method: 'POST',
    token
  });
}
