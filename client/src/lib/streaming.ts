/**
 * SSE Streaming Utilities for AI Code Actions
 * Handles Server-Sent Events streaming responses from the backend
 */

export interface StreamingOptions {
  onChunk: (content: string) => void;
  onComplete?: (provider: string) => void;
  onError?: (error: string) => void;
}

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  provider: string | null;
}

/**
 * Stream a code action response via SSE
 * Connects to the streaming endpoint and incrementally receives AI response chunks
 */
export async function streamCodeAction(
  action: string,
  code: string,
  language: string,
  options: StreamingOptions,
  projectId?: string,
  filePath?: string,
  provider?: string
): Promise<void> {
  const response = await fetch('/api/ai/code-actions/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, code, language, projectId, filePath, provider }),
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      options.onError?.(error.error || 'Stream failed');
    } catch {
      options.onError?.(`Stream failed with status ${response.status}`);
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    options.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              options.onChunk(data.content);
            }
            if (data.done) {
              options.onComplete?.(data.provider || 'unknown');
            }
            if (data.error) {
              options.onError?.(data.error);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.content) {
          options.onChunk(data.content);
        }
        if (data.done) {
          options.onComplete?.(data.provider || 'unknown');
        }
      } catch (e) {
        // Ignore incomplete final chunk
      }
    }
  } catch (error) {
    options.onError?.(error instanceof Error ? error.message : 'Stream connection lost');
  } finally {
    reader.releaseLock();
  }
}

/**
 * Abort controller for cancelling streaming requests
 */
export function createStreamController(): AbortController {
  return new AbortController();
}

/**
 * Stream code action with abort support
 */
export async function streamCodeActionWithAbort(
  action: string,
  code: string,
  language: string,
  options: StreamingOptions,
  abortController: AbortController,
  projectId?: string,
  filePath?: string,
  provider?: string
): Promise<void> {
  const response = await fetch('/api/ai/code-actions/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, code, language, projectId, filePath, provider }),
    signal: abortController.signal,
  });

  if (!response.ok) {
    try {
      const error = await response.json();
      options.onError?.(error.error || 'Stream failed');
    } catch {
      options.onError?.(`Stream failed with status ${response.status}`);
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    options.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              options.onChunk(data.content);
            }
            if (data.done) {
              options.onComplete?.(data.provider || 'unknown');
            }
            if (data.error) {
              options.onError?.(data.error);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled - not an error
      return;
    }
    options.onError?.(error instanceof Error ? error.message : 'Stream connection lost');
  } finally {
    reader.releaseLock();
  }
}
