import type {
  ApproveSpecRequest,
  GeneratorAttachment,
  GeneratorEvent,
  IterationRequest,
  StartGenerationRequest,
  StartGenerationResponse,
} from './types';

export interface AiGeneratorApiOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class AiGeneratorApi {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AiGeneratorApiOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createAttachmentUpload(file: File): Promise<GeneratorAttachment> {
    return this.request<GeneratorAttachment>('/api/ai-generator/attachments/resumable-url', {
      method: 'POST',
      body: JSON.stringify({
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }),
    });
  }

  async uploadAttachment(file: File, attachment: GeneratorAttachment): Promise<void> {
    const response = await this.fetchImpl(attachment.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': attachment.contentType },
    });
    if (!response.ok) throw new Error(`Attachment upload failed with HTTP ${response.status}`);
  }

  async start(request: StartGenerationRequest): Promise<StartGenerationResponse> {
    return this.request<StartGenerationResponse>('/api/ai-generator/generations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async approve(generationId: string, request: ApproveSpecRequest): Promise<void> {
    await this.request(`/api/ai-generator/generations/${encodeURIComponent(generationId)}/approve`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async iterate(request: IterationRequest): Promise<void> {
    await this.request(`/api/ai-generator/generations/${encodeURIComponent(request.generationId)}/iterations`, {
      method: 'POST',
      body: JSON.stringify({ prompt: request.prompt }),
    });
  }

  async undoLastChange(generationId: string): Promise<void> {
    await this.request(`/api/ai-generator/generations/${encodeURIComponent(generationId)}/undo`, {
      method: 'POST',
    });
  }

  connectStream(generationId: string, onEvent: (event: GeneratorEvent) => void): EventSource {
    const source = new EventSource(`${this.baseUrl}/api/ai-generator/generations/${encodeURIComponent(generationId)}/events`, {
      withCredentials: true,
    });
    source.addEventListener('message', (message) => onEvent(JSON.parse(message.data) as GeneratorEvent));
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

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `AI generator request failed with HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
