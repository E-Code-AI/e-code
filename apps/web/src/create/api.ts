import type {
  BootEvent,
  CreateProjectRequest,
  CreateProjectResponse,
  GitStackDetection,
  TemplateSummary,
} from './types';

export interface CreateFlowApiOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class CreateFlowApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = 'CreateFlowApiError';
    this.status = status;
    this.payload = payload;
  }
}

export class CreateFlowApi {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CreateFlowApiOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listTemplates(filters: Record<string, string> = {}): Promise<TemplateSummary[]> {
    const params = new URLSearchParams(filters);
    return this.request<TemplateSummary[]>(`/api/templates${params.size ? `?${params}` : ''}`);
  }

  async getTemplate(templateId: string): Promise<TemplateSummary> {
    return this.request<TemplateSummary>(`/api/templates/${encodeURIComponent(templateId)}`);
  }

  async detectGitStack(gitUrl: string): Promise<GitStackDetection> {
    return this.request<GitStackDetection>('/api/projects/imports/git/detect', {
      method: 'POST',
      body: JSON.stringify({ gitUrl }),
    });
  }

  async createProject(input: CreateProjectRequest): Promise<CreateProjectResponse> {
    return this.request<CreateProjectResponse>('/api/projects/from-template', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async forkProject(projectId: string, name: string): Promise<CreateProjectResponse> {
    return this.request<CreateProjectResponse>(`/api/projects/${encodeURIComponent(projectId)}/fork`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  connectBootStream(bootSessionId: string, onEvent: (event: BootEvent) => void): EventSource {
    const url = `${this.baseUrl}/api/projects/boot/${encodeURIComponent(bootSessionId)}/events`;
    const source = new EventSource(url, { withCredentials: true });
    source.addEventListener('message', (message) => {
      onEvent(JSON.parse(message.data) as BootEvent);
    });
    return source;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const payload = await readPayload(response);
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : `Request failed with HTTP ${response.status}`;
      throw new CreateFlowApiError(response.status, message, payload);
    }

    return response.json() as Promise<T>;
  }
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
