import { AuthResponse, Project, ProjectFile, RunResult } from '../types';
import { API_BASE_URL } from './config';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

const jsonHeaders = {
  'Content-Type': 'application/json'
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

export async function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/mobile/auth/login', {
    method: 'POST',
    body: { username, password }
  });
}

export async function getProjects(token: string): Promise<Project[]> {
  return request<Project[]>('/mobile/projects', { token });
}

export async function getProjectFiles(projectId: number, token: string): Promise<ProjectFile[]> {
  return request<ProjectFile[]>(`/mobile/projects/${projectId}/files`, { token });
}

export async function updateProjectFile(
  projectId: number,
  fileId: number,
  content: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(
    `/mobile/projects/${projectId}/files/${fileId}`,
    {
      method: 'PUT',
      token,
      body: { content }
    }
  );
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
