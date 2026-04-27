export function normalizeSSEChunk(chunk: string): string {
  return chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function parseSSEDataLine<T = unknown>(line: string): T | null {
  if (!line.startsWith('data: ')) return null;

  const payload = line.slice(6).trim();
  if (!payload || payload === '[DONE]') return null;

  return JSON.parse(payload) as T;
}

export function drainSSEEvents(
  buffer: string,
  flushTrailingEvent = false,
): { events: string[]; remaining: string } {
  let remaining = buffer;
  const events: string[] = [];

  while (true) {
    const boundaryIndex = remaining.indexOf('\n\n');
    if (boundaryIndex === -1) break;

    const eventText = remaining.slice(0, boundaryIndex);
    remaining = remaining.slice(boundaryIndex + 2);

    if (eventText.trim()) {
      events.push(eventText);
    }
  }

  if (flushTrailingEvent && remaining.trim()) {
    events.push(remaining.trim());
    remaining = '';
  }

  return { events, remaining };
}
