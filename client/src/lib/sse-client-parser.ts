export function normalizeSSEChunk(chunk: string): string {
  return chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function parseSSEDataLine<T = unknown>(line: string): T | null {
  if (!line.startsWith('data:')) return null;

  const rawPayload = line.slice(5);
  const payload = (rawPayload.startsWith(' ') ? rawPayload.slice(1) : rawPayload).trim();
  if (!payload || payload === '[DONE]') return null;

  return JSON.parse(payload) as T;
}

export interface ParsedSSEDataLine<T = unknown> {
  line: string;
  data: T;
}

export function extractSSEDataLines(eventText: string): string[] {
  return eventText
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('data:'));
}

export function parseSSEEventDataLines<T = unknown>(eventText: string): ParsedSSEDataLine<T>[] {
  return extractSSEDataLines(eventText).flatMap((line) => {
    try {
      const data = parseSSEDataLine<T>(line);
      return data === null ? [] : [{ line, data }];
    } catch (error) {
      if (error instanceof Error) {
        Object.assign(error, { sseLine: line });
      }
      throw error;
    }
  });
}

export function getSSEParseErrorLine(error: unknown, fallbackLine: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'sseLine' in error &&
    typeof (error as { sseLine?: unknown }).sseLine === 'string'
  ) {
    return (error as { sseLine: string }).sseLine;
  }

  return fallbackLine;
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
