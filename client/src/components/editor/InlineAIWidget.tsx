/**
 * InlineAIWidget — Cmd+K floating prompt over a CodeMirror selection.
 *
 * Usage:
 *   const { extension, widget } = useInlineAI({ language, fileName });
 *   <CM6Editor extraExtensions={[extension]} ... />
 *   {widget}
 *
 * The hook returns a CM6 keymap extension that opens the widget on Cmd+K
 * (or Ctrl+K). The widget captures a free-form prompt, calls the inline-edit
 * SSE endpoint, and replaces the selection with the model's reply.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { keymap, EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { Sparkles, X } from 'lucide-react';

interface PendingEdit {
  view: EditorView;
  from: number;
  to: number;
  selection: string;
  caret: { x: number; y: number };
}

interface UseInlineAIOptions {
  language?: string;
  fileName?: string;
  enabled?: boolean;
}

export function useInlineAI({ language, fileName, enabled = true }: UseInlineAIOptions) {
  const [pending, setPending] = useState<PendingEdit | null>(null);
  const pendingRef = useRef<PendingEdit | null>(null);
  pendingRef.current = pending;

  const openWidget = useCallback((view: EditorView) => {
    const { from, to } = view.state.selection.main;
    if (from === to) return false; // nothing selected — let other Cmd+K handlers run
    const selection = view.state.sliceDoc(from, to);
    const coords = view.coordsAtPos(from);
    const caret = coords ? { x: coords.left, y: coords.bottom } : { x: 0, y: 0 };
    setPending({ view, from, to, selection, caret });
    return true;
  }, []);

  const close = useCallback(() => setPending(null), []);

  const apply = useCallback(async (prompt: string) => {
    const p = pendingRef.current;
    if (!p) return;
    try {
      const res = await fetch('/api/ai/inline-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ selection: p.selection, prompt, language, fileName }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replacement: string | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const ev of events) {
          const dataLine = ev.split('\n').find((l) => l.startsWith('data: '));
          const eventLine = ev.split('\n').find((l) => l.startsWith('event: '));
          if (!dataLine || !eventLine) continue;
          const eventType = eventLine.slice(7).trim();
          const payload = JSON.parse(dataLine.slice(6));
          if (eventType === 'replacement') replacement = payload.text;
          if (eventType === 'error') throw new Error(payload.message);
        }
      }
      if (replacement != null) {
        p.view.dispatch({
          changes: { from: p.from, to: p.to, insert: replacement },
          selection: { anchor: p.from, head: p.from + replacement.length },
        });
      }
    } finally {
      setPending(null);
    }
  }, [language, fileName]);

  const extension: Extension = useMemo(() => {
    if (!enabled) return [];
    return keymap.of([
      {
        key: 'Mod-k',
        run: (view) => openWidget(view),
      },
    ]);
  }, [enabled, openWidget]);

  const widget = pending ? (
    <InlineAIPrompt caret={pending.caret} onSubmit={apply} onCancel={close} />
  ) : null;

  return { extension, widget };
}

interface InlineAIPromptProps {
  caret: { x: number; y: number };
  onSubmit: (prompt: string) => void | Promise<void>;
  onCancel: () => void;
}

function InlineAIPrompt({ caret, onSubmit, onCancel }: InlineAIPromptProps) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    try {
      await onSubmit(prompt.trim());
    } catch (err) {
      console.error('[InlineAI] failed:', err);
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Inline AI prompt"
      style={{
        position: 'fixed',
        left: Math.min(caret.x, window.innerWidth - 420),
        top: caret.y + 4,
        zIndex: 9999,
      }}
      className="w-[400px] rounded-lg border border-border bg-popover shadow-xl p-2"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <input
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={busy ? 'Generating…' : 'Ask AI to modify the selection'}
          disabled={busy}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-accent rounded text-muted-foreground"
          aria-label="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 px-1">
        Enter to apply · Esc to cancel
      </div>
    </div>
  );
}
