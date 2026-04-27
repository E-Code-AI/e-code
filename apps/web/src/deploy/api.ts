import type { DeploymentProject, Release, StartDeployRequest } from './types';

export class DeployApi {
  constructor(private readonly baseUrl = '', private readonly fetchImpl: typeof fetch = fetch) {}

  async getProject(projectId: string): Promise<DeploymentProject> {
    return this.request<DeploymentProject>(`/api/deploy/projects/${encodeURIComponent(projectId)}`);
  }

  async deploy(request: StartDeployRequest): Promise<Release> {
    return this.request<Release>('/api/deploy/releases', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async promote(projectId: string, releaseId: string): Promise<void> {
    await this.request(`/api/deploy/projects/${encodeURIComponent(projectId)}/releases/${encodeURIComponent(releaseId)}/promote`, {
      method: 'POST',
    });
  }

  async rollback(projectId: string, releaseId: string): Promise<void> {
    await this.request(`/api/deploy/projects/${encodeURIComponent(projectId)}/releases/${encodeURIComponent(releaseId)}/rollback`, {
      method: 'POST',
    });
  }

  async verifyDomain(projectId: string, domain: string): Promise<{ verified: boolean; instructions: string[] }> {
    return this.request(`/api/deploy/projects/${encodeURIComponent(projectId)}/domains/verify`, {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  connectLogs(releaseId: string, onLine: (line: string) => void): EventSource {
    const source = new EventSource(`${this.baseUrl}/api/deploy/releases/${encodeURIComponent(releaseId)}/logs`, { withCredentials: true });
    source.addEventListener('message', (message) => onLine(message.data));
    return source;
  }

  private async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(await response.text());
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
