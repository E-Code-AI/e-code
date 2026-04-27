import {
  drainSSEEvents,
  extractSSEDataLines,
  getSSEParseErrorLine,
  normalizeSSEChunk,
  parseSSEEventDataLines,
  parseSSEDataLine,
} from '../../client/src/lib/sse-client-parser';

describe('SSE client parser', () => {
  it('parses JSON data lines', () => {
    expect(parseSSEDataLine<{ content: string }>('data: {"content":"hello"}')).toEqual({
      content: 'hello',
    });
  });

  it('parses SSE data lines with no space after the colon', () => {
    expect(parseSSEDataLine<{ content: string }>('data:{"content":"compact"}')).toEqual({
      content: 'compact',
    });
  });

  it('ignores non-data, empty, and done sentinel lines', () => {
    expect(parseSSEDataLine('event: message')).toBeNull();
    expect(parseSSEDataLine('data: ')).toBeNull();
    expect(parseSSEDataLine('data: [DONE]')).toBeNull();
  });

  it('normalizes CRLF and CR line endings', () => {
    expect(normalizeSSEChunk('data: 1\r\n\r\ndata: 2\r\rdata: 3')).toBe(
      'data: 1\n\ndata: 2\n\ndata: 3',
    );
  });

  it('drains complete events and preserves partial events', () => {
    const result = drainSSEEvents('data: {"a":1}\n\ndata: {"b":2}');

    expect(result.events).toEqual(['data: {"a":1}']);
    expect(result.remaining).toBe('data: {"b":2}');
  });

  it('flushes a trailing event when the stream closes', () => {
    const result = drainSSEEvents('data: {"final":true}', true);

    expect(result.events).toEqual(['data: {"final":true}']);
    expect(result.remaining).toBe('');
  });

  it('extracts only SSE data lines from an event frame', () => {
    const lines = extractSSEDataLines(
      ': keepalive\nid: 42\nevent: message\ndata: {"content":"a"}\ndata:{"content":"b"}\ndata: [DONE]\nretry: 1000',
    );

    expect(lines).toEqual(['data: {"content":"a"}', 'data:{"content":"b"}', 'data: [DONE]']);
  });

  it('parses valid event data lines and skips done sentinels', () => {
    expect(
      parseSSEEventDataLines<{ content: string }>('event: message\ndata: {"content":"a"}\ndata: [DONE]'),
    ).toEqual([
      {
        line: 'data: {"content":"a"}',
        data: { content: 'a' },
      },
    ]);
  });

  it('attaches the source data line to malformed JSON errors', () => {
    let thrown: unknown;

    try {
      parseSSEEventDataLines('data: {"content":');
    } catch (error) {
      thrown = error;
    }

    expect(getSSEParseErrorLine(thrown, 'fallback')).toBe('data: {"content":');
  });
});
