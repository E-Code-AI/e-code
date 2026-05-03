import { TerminalMetricsIndicator } from '@/components/terminal/TerminalMetricsIndicator';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { LazyMotionDiv } from '@/lib/motion';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { createShellWebSocket,type ConnectionState,type ResilientWebSocket } from '@/lib/websocket-resilience';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Terminal,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReplitTerminalPanelProps {
  projectId?: string | number;
  className?: string;
}

interface ShellTab {
  id: string;          // local tab ID
  sessionId: string;   // backend session ID
  name: string;
  connectionState: ConnectionState;
}

interface TerminalInstance {
  term: XTerm;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  ws: ResilientWebSocket | null;
  outputBuffer: string; // raw text (ANSI stripped on demand)
  cleanupWs: (() => void) | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTerminalTheme() {
  const style = getComputedStyle(document.documentElement);
  const get = (v: string) => style.getPropertyValue(v).trim();
  return {
    background:          get('--ecode-terminal-bg')            || '#0e1525',
    foreground:          get('--ecode-terminal-text')           || '#d4d8dd',
    cursor:              get('--ecode-terminal-cursor')         || '#F26207',
    cursorAccent:        get('--ecode-terminal-bg')             || '#0e1525',
    selectionBackground: get('--ecode-terminal-selection')      || 'rgba(0,121,242,0.3)',
    black:               get('--ecode-terminal-black')          || '#0e1525',
    red:                 get('--ecode-terminal-red')            || '#ff6b6b',
    green:               get('--ecode-terminal-green')          || '#4ecdc4',
    yellow:              get('--ecode-terminal-yellow')         || '#ffe66d',
    blue:                get('--ecode-terminal-blue')           || '#0079f2',
    magenta:             get('--ecode-terminal-magenta')        || '#c792ea',
    cyan:                get('--ecode-terminal-cyan')           || '#89ddff',
    white:               get('--ecode-terminal-white')          || '#d4d8dd',
    brightBlack:         get('--ecode-terminal-bright-black')   || '#3d4452',
    brightRed:           get('--ecode-terminal-bright-red')     || '#ff8a80',
    brightGreen:         get('--ecode-terminal-bright-green')   || '#69f0ae',
    brightYellow:        get('--ecode-terminal-bright-yellow')  || '#ffff8d',
    brightBlue:          get('--ecode-terminal-bright-blue')    || '#40c4ff',
    brightMagenta:       get('--ecode-terminal-bright-magenta') || '#ff80ab',
    brightCyan:          get('--ecode-terminal-bright-cyan')    || '#a7fdeb',
    brightWhite:         get('--ecode-terminal-bright-white')   || '#ffffff',
  };
}

/** Strip ANSI escape sequences for text operations */
const ANSI_STRIP_RE = /\x1b\[[0-9;]*[mGKHF]|\x1b\[[0-9]*[A-Z]|\r/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_STRIP_RE, '');
}

/** LocalStorage key for persisted session IDs per project */
function storageKey(projectId: string | number) {
  return `ecode-shell-sessions-${projectId}`;
}
function activeSessionKey(projectId: string | number) {
  return `ecode-shell-active-${projectId}`;
}

function loadPersistedSessions(projectId: string | number): string[] {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function savePersistedSessions(projectId: string | number, sessionIds: string[]): void {
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify(sessionIds));
  } catch {}
}

function loadActiveSession(projectId: string | number): string | null {
  try {
    return localStorage.getItem(activeSessionKey(projectId));
  } catch {
    return null;
  }
}

function saveActiveSession(projectId: string | number, sessionId: string): void {
  try {
    localStorage.setItem(activeSessionKey(projectId), sessionId);
  } catch {}
}

function clearActiveSession(projectId: string | number): void {
  try {
    localStorage.removeItem(activeSessionKey(projectId));
  } catch {}
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <LazyMotionDiv
      className={cn('rounded-lg bg-muted', className)}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === 'connecting' || state === 'reconnecting') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border">
        <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
        <span className="text-[10px] text-muted-foreground capitalize">{state}</span>
      </div>
    );
  }
  if (state === 'connected') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border">
        <Wifi className="w-3 h-3 text-green-500" />
        <span className="text-[10px] text-green-500">Connected</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border">
      <WifiOff className="w-3 h-3 text-muted-foreground" />
      <span className="text-[10px] text-muted-foreground">Disconnected</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReplitTerminalPanel({ projectId, className }: ReplitTerminalPanelProps) {
  const params = useParams<{ id?: string; projectId?: string }>();
  const resolvedProjectId =
    projectId ??
    params.projectId ??
    params.id ??
    new URLSearchParams(window.location.search).get('projectId') ??
    undefined;

  const { toast } = useToast();
  const { theme } = useTheme();

  // ── Tab state ────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<ShellTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState(0);

  // ── AI Generate state ────────────────────────────────────────────────────
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');

  // ── Refs ─────────────────────────────────────────────────────────────────
  const instancesRef = useRef<Map<string, TerminalInstance>>(new Map());
  const containerRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const hasMountedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const generateInputRef = useRef<HTMLInputElement>(null);

  // ── Theme sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    const newTheme = getTerminalTheme();
    for (const inst of instancesRef.current.values()) {
      inst.term.options.theme = newTheme;
    }
  }, [theme]);

  // ── Session create via API ────────────────────────────────────────────────
  /**
   * Request a backend-issued session ID.
   * Never generates a client-side random ID — returns null so callers show an
   * explicit error rather than silently using an untracked local ID.
   */
  const createSessionId = useCallback(async (): Promise<string | null> => {
    if (!resolvedProjectId) return null;
    try {
      const res = await apiRequest<{ sessionId: string }>(
        'POST',
        `/api/shell/${resolvedProjectId}/shell/create`,
        {}
      );
      return res.sessionId ?? null;
    } catch {
      // Fallback: generic sessions endpoint (available without a project scope)
      try {
        const res2 = await apiRequest<{ sessionId: string }>('POST', '/api/shell/sessions', {});
        return res2.sessionId ?? null;
      } catch {
        // Server unreachable — surface explicit error, never fabricate an ID
        return null;
      }
    }
  }, [resolvedProjectId]);

  // ── Connect WebSocket for a tab ───────────────────────────────────────────
  const connectTab = useCallback((tabId: string, sessionId: string) => {
    if (!resolvedProjectId) return;
    const inst = instancesRef.current.get(tabId);
    if (!inst) return;

    // Tear down any existing socket
    inst.cleanupWs?.();
    inst.ws?.destroy();

    const socket = createShellWebSocket(resolvedProjectId, sessionId);

    const unsubState = socket.onStateChange((event) => {
      setTabs(prev =>
        prev.map(t => t.id === tabId ? { ...t, connectionState: event.state } : t)
      );

      if (event.state === 'connected') {
        setIsLoading(false);
        inst.term.writeln('\x1b[1;32m✓ Connected to shell\x1b[0m');
        // Send initial resize
        socket.send({ type: 'resize', cols: inst.term.cols, rows: inst.term.rows });
      }

      if (event.state === 'reconnecting') {
        inst.term.writeln('\r\n\x1b[1;33m⚠ Reconnecting...\x1b[0m');
      }

      if (event.state === 'failed' || event.state === 'circuit_open') {
        inst.term.writeln('\r\n\x1b[1;31m✗ Unable to reconnect automatically. Use Reset to try again.\x1b[0m');
      }
    });

    const unsubMsg = socket.onMessage((event) => {
      if (!inst.term) return;
      // Raw PTY data - write directly
      inst.term.write(event.data);
      // Append to output buffer (keep last 200K chars for search/download)
      inst.outputBuffer += event.data;
      if (inst.outputBuffer.length > 200_000) {
        inst.outputBuffer = inst.outputBuffer.slice(-200_000);
      }
    });

    inst.ws = socket;
    inst.cleanupWs = () => {
      unsubState();
      unsubMsg();
    };

    socket.connect();
  }, [resolvedProjectId]);

  // ── Initialize xterm for a tab into a container div ───────────────────────
  const initTerminal = useCallback((tabId: string, container: HTMLDivElement) => {
    if (instancesRef.current.has(tabId)) {
      // Re-open existing terminal into possibly new container
      const inst = instancesRef.current.get(tabId)!;
      inst.term.open(container);
      setTimeout(() => inst.fitAddon.fit(), 0);
      return;
    }

    const term = new XTerm({
      theme: getTerminalTheme(),
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
      allowTransparency: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    const searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(container);
    setTimeout(() => fitAddon.fit(), 0);

    term.writeln('\x1b[1;32m╭─────────────────────────────────────────╮\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m \x1b[1;36mE-Code Shell\x1b[0m                          \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m \x1b[90mConnecting to workspace...\x1b[0m            \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m╰─────────────────────────────────────────╯\x1b[0m');
    term.writeln('');

    const inst: TerminalInstance = {
      term,
      fitAddon,
      searchAddon,
      ws: null,
      outputBuffer: '',
      cleanupWs: null,
    };

    term.onData((data) => {
      if (!inst.ws?.isConnected()) return;
      inst.ws.send({ type: 'input', data });
    });

    // ── Explicit keyboard shortcut handling ────────────────────────────────
    // xterm.js handles raw keydown before the browser, so we must intercept
    // these combos explicitly to guarantee consistent cross-browser behavior.
    term.attachCustomKeyEventHandler((ev: KeyboardEvent) => {
      // Ctrl+Shift+C  →  copy selection to clipboard
      if (ev.type === 'keydown' && ev.ctrlKey && ev.shiftKey && ev.code === 'KeyC') {
        ev.preventDefault();
        const sel = term.getSelection();
        if (sel) navigator.clipboard.writeText(sel).catch(() => {});
        return false; // prevent xterm from sending \x03 or similar
      }

      // Ctrl+Shift+V  →  paste from clipboard into PTY
      if (ev.type === 'keydown' && ev.ctrlKey && ev.shiftKey && ev.code === 'KeyV') {
        ev.preventDefault();
        navigator.clipboard.readText().then(text => {
          if (text && inst.ws?.isConnected()) inst.ws.send({ type: 'input', data: text });
        }).catch(() => {});
        return false;
      }

      // Ctrl+L  →  clear screen (send FF \x0c — readline clears without history loss)
      if (ev.type === 'keydown' && ev.ctrlKey && !ev.shiftKey && ev.code === 'KeyL') {
        if (inst.ws?.isConnected()) {
          inst.ws.send({ type: 'input', data: '\x0c' });
        }
        return false;
      }

      // Ctrl+D  →  send EOF to PTY
      if (ev.type === 'keydown' && ev.ctrlKey && !ev.shiftKey && ev.code === 'KeyD') {
        if (inst.ws?.isConnected()) {
          inst.ws.send({ type: 'input', data: '\x04' });
        }
        return false;
      }

      return true; // let xterm handle everything else
    });

    instancesRef.current.set(tabId, inst);
  }, []);

  // ── Add a new tab ─────────────────────────────────────────────────────────
  const addTab = useCallback(async () => {
    const sessionId = await createSessionId();
    if (!sessionId) {
      toast({ title: 'Failed to create session', variant: 'destructive' });
      return;
    }

    const tabId = `tab-${Date.now()}`;
    const newTab: ShellTab = {
      id: tabId,
      sessionId,
      name: `Shell ${tabs.length + 1}`,
      connectionState: 'disconnected',
    };

    setTabs(prev => {
      const updated = [...prev, newTab];
      // Persist session IDs
      if (resolvedProjectId) {
        savePersistedSessions(resolvedProjectId, updated.map(t => t.sessionId));
      }
      return updated;
    });
    setActiveTabId(tabId);
  }, [createSessionId, resolvedProjectId, tabs.length, toast]);

  // ── Close a tab ───────────────────────────────────────────────────────────
  const closeTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Cleanup instance
    const inst = instancesRef.current.get(tabId);
    if (inst) {
      inst.cleanupWs?.();
      inst.ws?.destroy();
      inst.term.dispose();
      instancesRef.current.delete(tabId);
    }
    containerRefs.current.delete(tabId);

    // Delete session on backend using the project-scoped route (authoritative lifecycle path)
    if (resolvedProjectId && tab.sessionId) {
      try {
        await apiRequest('DELETE', `/api/shell/${resolvedProjectId}/shell/${tab.sessionId}`, undefined);
      } catch (err) {
        console.warn('[Shell] Failed to delete session from backend:', err);
      }
    }

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (resolvedProjectId) {
      savePersistedSessions(resolvedProjectId, newTabs.map(t => t.sessionId));
      if (activeTabId === tabId) {
        // The about-to-become-active tab
        const nextTab = newTabs[newTabs.length - 1];
        if (nextTab) {
          saveActiveSession(resolvedProjectId, nextTab.sessionId);
        } else {
          clearActiveSession(resolvedProjectId);
        }
      }
    }

    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : '');
    }
  }, [activeTabId, resolvedProjectId, tabs]);

  // ── Initial mount: load or create first tab ───────────────────────────────
  useEffect(() => {
    if (!resolvedProjectId || hasMountedRef.current) return;
    hasMountedRef.current = true;

    const initShell = async () => {
      const persisted = loadPersistedSessions(resolvedProjectId);

      if (persisted.length > 0) {
        // Verify which persisted session IDs are still live on the server
        // before committing to reattach. Stale IDs get replaced with fresh sessions.
        let liveIds = new Set<string>(persisted);
        try {
          const listRes = await apiRequest<{ sessions: { sessionId: string }[] }>(
            'GET',
            `/api/shell/${resolvedProjectId}/shell/sessions`
          );
          const serverIds = new Set((listRes.sessions ?? []).map(s => s.sessionId));
          liveIds = new Set(persisted.filter(id => serverIds.has(id)));
        } catch {
          // Server unreachable — optimistically try all persisted IDs;
          // WS connect will handle individual failures.
        }

        const expiredCount = persisted.length - liveIds.size;
        const validIds = Array.from(liveIds);

        if (validIds.length > 0) {
          const restoredTabs: ShellTab[] = validIds.map((sid, i) => ({
            id: `tab-restore-${i}-${Date.now()}`,
            sessionId: sid,
            name: `Shell ${i + 1}`,
            connectionState: 'disconnected' as ConnectionState,
          }));
          setTabs(restoredTabs);

          // Restore the previously active tab (by session ID)
          const persistedActiveId = loadActiveSession(resolvedProjectId);
          const activeTab = persistedActiveId
            ? restoredTabs.find(t => t.sessionId === persistedActiveId)
            : null;
          setActiveTabId((activeTab ?? restoredTabs[0]).id);

          if (expiredCount > 0) {
            toast({
              title: `${expiredCount} shell session${expiredCount > 1 ? 's' : ''} expired`,
              description: 'Starting a fresh shell for the expired one(s).',
            });
            // Create replacement tabs for expired sessions
            for (let i = 0; i < expiredCount; i++) {
              await addTab();
            }
          }
        } else {
          // All persisted sessions expired — start fresh
          if (persisted.length > 0) {
            toast({ title: 'Shell session expired', description: 'Starting a new shell.' });
          }
          await addTab();
        }
      } else {
        // Fresh start
        await addTab();
      }
    };

    initShell();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedProjectId]);

  // ── Mount terminal into container when active tab changes ─────────────────
  const setContainerRef = useCallback((tabId: string) => (el: HTMLDivElement | null) => {
    containerRefs.current.set(tabId, el);

    if (!el) return;
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Initialize terminal
    initTerminal(tabId, el);

    // Connect WebSocket if not already connected/connecting
    const inst = instancesRef.current.get(tabId);
    if (inst && !inst.ws) {
      connectTab(tabId, tab.sessionId);
    }
  }, [tabs, initTerminal, connectTab]);

  // ── Resize all terminals on container resize ──────────────────────────────
  useEffect(() => {
    if (!activeTabId) return;

    const handleResize = () => {
      const inst = instancesRef.current.get(activeTabId);
      if (!inst) return;
      inst.fitAddon.fit();
      if (inst.ws?.isConnected()) {
        inst.ws.send({ type: 'resize', cols: inst.term.cols, rows: inst.term.rows });
      }
    };

    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(handleResize);
    const container = containerRefs.current.get(activeTabId);
    if (container) observer.observe(container);

    // Fit when tab becomes active
    setTimeout(handleResize, 50);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [activeTabId]);

  // ── Cleanup all on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      for (const inst of instancesRef.current.values()) {
        inst.cleanupWs?.();
        inst.ws?.destroy();
        inst.term.dispose();
      }
      instancesRef.current.clear();
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const activeInst = () => instancesRef.current.get(activeTabId);

  const handleClear = () => {
    activeInst()?.term.clear();
  };

  const handleCopy = () => {
    const sel = activeInst()?.term.getSelection();
    if (sel) {
      navigator.clipboard.writeText(sel);
      toast({ title: 'Copied to clipboard' });
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const inst = activeInst();
      if (inst?.ws?.isConnected()) {
        inst.ws.send({ type: 'input', data: text });
      }
    } catch {
      toast({ title: 'Paste failed', description: 'Clipboard access denied', variant: 'destructive' });
    }
  };

  const handleStop = () => {
    const inst = activeInst();
    if (inst?.ws?.isConnected()) {
      inst.ws.send({ type: 'input', data: '\x03' }); // Ctrl+C
    }
  };

  const handleReset = async () => {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Capture old session ID before tearing down so we can delete it server-side
    const oldSessionId = tab.sessionId;

    const inst = instancesRef.current.get(activeTabId);
    if (inst) {
      inst.cleanupWs?.();
      inst.ws?.destroy();
      inst.ws = null;
      inst.cleanupWs = null;
      inst.term.reset();
      inst.term.writeln('\x1b[1;32m╭─────────────────────────────────────────╮\x1b[0m');
      inst.term.writeln('\x1b[1;32m│\x1b[0m \x1b[1;36mE-Code Shell\x1b[0m                          \x1b[1;32m│\x1b[0m');
      inst.term.writeln('\x1b[1;32m│\x1b[0m \x1b[90mReconnecting...\x1b[0m                       \x1b[1;32m│\x1b[0m');
      inst.term.writeln('\x1b[1;32m╰─────────────────────────────────────────╯\x1b[0m');
      inst.term.writeln('');
    }

    // Delete old server session before creating the replacement —
    // prevents orphan PTYs accumulating toward MAX_SESSIONS_PER_USER.
    if (resolvedProjectId && oldSessionId) {
      try {
        await apiRequest('DELETE', `/api/shell/${resolvedProjectId}/shell/${oldSessionId}`, undefined);
      } catch (err) {
        console.warn('[Shell] Failed to delete old session on reset:', err);
      }
    }

    // Create a fresh session ID for reset
    const newSessionId = await createSessionId();
    if (!newSessionId) return;

    setTabs(prev => {
      const updated = prev.map(t =>
        t.id === activeTabId
          ? { ...t, sessionId: newSessionId, connectionState: 'disconnected' as ConnectionState }
          : t
      );
      if (resolvedProjectId) {
        savePersistedSessions(resolvedProjectId, updated.map(t => t.sessionId));
        saveActiveSession(resolvedProjectId, newSessionId);
      }
      return updated;
    });

    setTimeout(() => connectTab(activeTabId, newSessionId), 300);
  };

  const handleDownloadLog = () => {
    const inst = activeInst();
    if (!inst) return;
    const content = stripAnsi(inst.outputBuffer);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tab = tabs.find(t => t.id === activeTabId);
    a.download = `shell-${tab?.name ?? 'session'}-${new Date().toISOString().slice(0, 19)}.log`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Log downloaded' });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const inst = activeInst();
    if (!inst) return;
    if (!query) {
      inst.searchAddon.clearDecorations();
      setSearchMatches(0);
      return;
    }
    // findNext highlights the first/next match in the terminal viewport
    const found = inst.searchAddon.findNext(query, {
      caseSensitive: false,
      regex: false,
      wholeWord: false,
      decorations: {
        matchBackground: '#f5a623',
        matchBorder: '#e8940a',
        matchOverviewRuler: '#f5a623',
        activeMatchBackground: '#ff6b00',
        activeMatchBorder: '#e85500',
        activeMatchColorOverviewRuler: '#ff6b00',
      },
    });
    setSearchMatches(found ? 1 : 0);
  };

  const handleSearchNext = () => {
    const inst = activeInst();
    if (!inst || !searchQuery) return;
    inst.searchAddon.findNext(searchQuery, { caseSensitive: false });
  };

  const handleSearchPrev = () => {
    const inst = activeInst();
    if (!inst || !searchQuery) return;
    inst.searchAddon.findPrevious(searchQuery, { caseSensitive: false });
  };

  // ── AI Generate ───────────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return apiRequest<{ command: string }>('POST', '/api/shell/generate-command', {
        prompt,
        projectId: resolvedProjectId,
      });
    },
    onSuccess: (data) => {
      const inst = activeInst();
      if (inst?.ws?.isConnected() && data.command) {
        // Insert command into PTY without executing (no \r)
        inst.ws.send({ type: 'input', data: data.command });
        toast({ title: 'Command inserted', description: data.command });
      }
      setGenerateOpen(false);
      setGeneratePrompt('');
      inst?.term.focus?.();
    },
    onError: () => {
      toast({ title: 'Failed to generate command', variant: 'destructive' });
    },
  });

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeState = activeTab?.connectionState ?? 'disconnected';

  // ── Render ────────────────────────────────────────────────────────────────

  if (!resolvedProjectId) {
    return (
      <div className={cn('h-full flex items-center justify-center p-4 bg-background', className)}>
        <div className="space-y-2 text-center">
          <Terminal className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
          <p className="text-sm font-medium">No project selected</p>
          <p className="text-xs text-muted-foreground">Open a project to start a shell session.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-background',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
      data-testid="replit-terminal-panel"
    >
      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="h-9 px-2 flex items-center justify-between bg-[var(--ecode-surface)] border-b border-[var(--ecode-border)] shrink-0">
        {/* Left: tabs + status */}
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 min-w-0">
          <div className="flex items-center gap-1 shrink-0">
            <Terminal className="w-3.5 h-3.5 text-[var(--ecode-text-muted)]" />
            <span className="text-xs font-medium text-[var(--ecode-text)] hidden sm:inline">Shell</span>
          </div>

          {/* Connection badge */}
          <ConnectionBadge state={activeState} />

          {/* Metrics */}
          <TerminalMetricsIndicator compact data-testid="shell-metrics" />

          {/* Tabs (shown when >1) */}
          {tabs.length > 1 && (
            <div className="flex items-center gap-0.5 ml-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    if (resolvedProjectId) saveActiveSession(resolvedProjectId, tab.sessionId);
                  }}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] whitespace-nowrap shrink-0',
                    tab.id === activeTabId
                      ? 'bg-[var(--ecode-sidebar-hover)] text-[var(--ecode-text)]'
                      : 'text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]'
                  )}
                  data-testid={`shell-tab-${tab.id}`}
                >
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full shrink-0',
                      tab.connectionState === 'connected' ? 'bg-green-500' : 'bg-muted-foreground'
                    )}
                  />
                  <span className="truncate max-w-[80px]">{tab.name}</span>
                  {tabs.length > 1 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); closeTab(tab.id); } }}
                      className="ml-0.5 rounded hover:bg-destructive/20 p-0.5"
                      data-testid={`shell-close-tab-${tab.id}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* AI Generate */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-primary"
            onClick={() => { setGenerateOpen(v => !v); setTimeout(() => generateInputRef.current?.focus(), 50); }}
            title="AI Generate Command (Sparkles)"
            data-testid="button-shell-generate"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </Button>

          {/* Search */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={() => { setSearchOpen(v => !v); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            title="Search scrollback (Ctrl+Shift+F)"
            data-testid="button-shell-search"
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          {/* Stop (Ctrl+C) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-red-500"
            onClick={handleStop}
            title="Stop (Ctrl+C)"
            data-testid="button-shell-stop"
          >
            <Square className="w-3.5 h-3.5" />
          </Button>

          {/* Paste */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={handlePaste}
            title="Paste from clipboard (Ctrl+Shift+V)"
            data-testid="button-shell-paste"
          >
            <Copy className="w-3.5 h-3.5 scale-x-[-1]" />
          </Button>

          {/* Clear */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={handleClear}
            title="Clear terminal (Ctrl+L)"
            data-testid="button-shell-clear"
          >
            <X className="w-3.5 h-3.5" />
          </Button>

          {/* Copy */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={handleCopy}
            title="Copy selection (Ctrl+Shift+C)"
            data-testid="button-shell-copy"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          {/* Download log */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={handleDownloadLog}
            title="Download log"
            data-testid="button-shell-download"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={handleReset}
            title="Reset session"
            data-testid="button-shell-reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={() => setIsFullscreen(v => !v)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            data-testid="button-shell-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>

          {/* New tab */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)]"
            onClick={addTab}
            title="New shell tab"
            data-testid="button-shell-new-tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── AI Generate bar ──────────────────────────────────────────────── */}
      {generateOpen && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--ecode-border)] bg-primary/5 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <Input
            ref={generateInputRef}
            value={generatePrompt}
            onChange={e => setGeneratePrompt(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && generatePrompt.trim()) {
                generateMutation.mutate(generatePrompt);
              } else if (e.key === 'Escape') {
                setGenerateOpen(false);
                setGeneratePrompt('');
              }
            }}
            placeholder="Describe the command you want…"
            className="h-7 text-[13px] flex-1 bg-transparent"
            data-testid="shell-generate-input"
          />
          <Button
            size="sm"
            className="h-7 gap-1 text-[12px]"
            onClick={() => generateMutation.mutate(generatePrompt)}
            disabled={!generatePrompt.trim() || generateMutation.isPending}
            data-testid="shell-generate-submit"
          >
            {generateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[12px]"
            onClick={() => { setGenerateOpen(false); setGeneratePrompt(''); }}
            data-testid="shell-generate-cancel"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── Search bar ───────────────────────────────────────────────────── */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--ecode-border)] bg-muted/30 shrink-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); activeInst()?.searchAddon.clearDecorations(); }
              if (e.key === 'Enter') e.shiftKey ? handleSearchPrev() : handleSearchNext();
            }}
            placeholder="Find in scrollback…"
            className="h-7 text-[13px] flex-1 bg-transparent"
            data-testid="shell-search-input"
          />
          {searchQuery && (
            <span className="text-[11px] text-muted-foreground shrink-0" data-testid="shell-search-count">
              {searchMatches > 0 ? 'Found' : 'No match'}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Previous match (Shift+Enter)"
            onClick={handleSearchPrev}
            disabled={!searchQuery}
            data-testid="shell-search-prev"
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Next match (Enter)"
            onClick={handleSearchNext}
            disabled={!searchQuery}
            data-testid="shell-search-next"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); activeInst()?.searchAddon.clearDecorations(); }}
            data-testid="shell-search-close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── Terminal containers (one per tab, hidden when inactive) ─────── */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && tabs.length === 0 && (
          <div className="absolute inset-0 z-10 p-3 bg-background flex flex-col gap-2">
            <ShimmerSkeleton className="h-4 w-3/4" />
            <ShimmerSkeleton className="h-4 w-1/2" />
            <ShimmerSkeleton className="h-4 w-2/3" />
          </div>
        )}

        {tabs.map(tab => (
          <div
            key={tab.id}
            className={cn('absolute inset-0', tab.id !== activeTabId && 'hidden')}
            data-testid={`shell-terminal-${tab.id}`}
          >
            <div
              ref={setContainerRef(tab.id)}
              className="h-full p-2"
              style={{ backgroundColor: 'var(--ecode-terminal-bg)' }}
              data-testid="terminal-container"
            />
          </div>
        ))}

        {tabs.length === 0 && !isLoading && (
          <div className="flex h-full items-center justify-center">
            <Button variant="outline" onClick={addTab} className="gap-2">
              <Plus className="h-4 w-4" />
              New shell
            </Button>
          </div>
        )}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="h-5 px-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-[var(--ecode-border)] bg-[var(--ecode-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>•</span>
          <span>xterm-256color</span>
          {tabs.length > 1 && (
            <>
              <span>•</span>
              <span>{tabs.length} sessions</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ChevronDown className="h-3 w-3" />
          <span>Ctrl+C to interrupt</span>
        </div>
      </div>
    </div>
  );
}
