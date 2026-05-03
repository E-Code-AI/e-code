import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  Copy, 
  Download, 
  Terminal, 
  CheckCircle, 
  XCircle,
  Play,
  Sparkles,
  Loader2,
  Plus,
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeLogs, RuntimeLogEntry } from '@/hooks/useRuntimeLogs';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { createShellWebSocket, type ConnectionState, type ResilientWebSocket } from '@/lib/websocket-resilience';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';

interface ConsoleLog {
  id: string;
  type: 'info' | 'error' | 'warn' | 'log' | 'debug' | 'stdout' | 'stderr' | 'system' | 'exit';
  message: string;
  timestamp: Date;
  stack?: string;
}

interface ShellSessionMeta {
  id: string;
  name: string;
  connectionState: ConnectionState;
}

interface ShellSessionRef {
  term: XTerm;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  ws: ResilientWebSocket | null;
  cleanupWs: (() => void) | null;
  inputBuffer: string;
}

interface ConsolePanelProps {
  projectId: string | number;
  userId?: string | number;
  isRunning?: boolean;
  executionId?: string;
  className?: string;
}

const HISTORY_STORAGE_KEY = (pid: string | number) => `shell-cmd-history-${pid}`;
const MAX_HISTORY_ENTRIES = 500;

function loadLocalHistory(projectId: string | number): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY(projectId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalHistory(projectId: string | number, history: string[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY(projectId), JSON.stringify(history.slice(-MAX_HISTORY_ENTRIES)));
  } catch {}
}

function loadCommandHistory(projectId: string | number): string[] {
  return loadLocalHistory(projectId);
}

async function appendCommandToHistory(projectId: string | number, command: string): Promise<void> {
  const trimmed = command.trim();
  if (!trimmed) return;

  const existing = loadLocalHistory(projectId);
  if (existing[existing.length - 1] === trimmed) return;
  const updated = [...existing, trimmed].slice(-MAX_HISTORY_ENTRIES);
  saveLocalHistory(projectId, updated);

  try {
    await fetch(`/api/shell/${projectId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: trimmed }),
      credentials: 'include',
    });
  } catch {
    // Server sync is best-effort; local cache is the source of truth
  }
}

async function loadServerHistory(projectId: string | number): Promise<string[]> {
  try {
    const res = await fetch(`/api/shell/${projectId}/history`, { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.history) ? data.history : [];
  } catch {
    return [];
  }
}

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

function ConnectionPill({ state }: { state: ConnectionState }) {
  if (state === 'connected') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
        <Wifi className="w-3 h-3 text-green-500" />
        <span className="text-[10px] text-green-500">Connected</span>
      </div>
    );
  }
  if (state === 'connecting' || state === 'reconnecting') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20">
        <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
        <span className="text-[10px] text-yellow-500">
          {state === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
        </span>
      </div>
    );
  }
  if (state === 'failed' || state === 'circuit_open') {
    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
        <WifiOff className="w-3 h-3 text-red-500" />
        <span className="text-[10px] text-red-500">Disconnected</span>
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

export function ConsolePanel({ projectId, userId, isRunning, executionId, className }: ConsolePanelProps) {
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'output' | 'shell'>('output');
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  
  const [shellSessions, setShellSessions] = useState<ShellSessionMeta[]>([]);
  const [activeShellId, setActiveShellId] = useState<string>('');
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sessionRefsMap = useRef<Map<string, ShellSessionRef>>(new Map());
  const containerRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const shellWrapperRef = useRef<HTMLDivElement>(null);

  const activeSession = shellSessions.find(s => s.id === activeShellId);

  const updateSessionState = useCallback((sessionId: string, state: ConnectionState) => {
    setShellSessions(prev => prev.map(s => s.id === sessionId ? { ...s, connectionState: state } : s));
  }, []);

  const initXterm = useCallback((sessionId: string, container: HTMLDivElement) => {
    if (sessionRefsMap.current.has(sessionId)) return;

    const term = new XTerm({
      theme: getTerminalTheme(),
      fontSize: 13,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);
    term.open(container);
    setTimeout(() => { try { fitAddon.fit(); } catch {} }, 0);

    const ref: ShellSessionRef = {
      term,
      fitAddon,
      searchAddon,
      ws: null,
      cleanupWs: null,
      inputBuffer: '',
    };
    sessionRefsMap.current.set(sessionId, ref);

    term.attachCustomKeyEventHandler((event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f' && event.type === 'keydown') {
        setIsSearchOpen(prev => !prev);
        return false;
      }
      if (event.key === 'Escape' && event.type === 'keydown') {
        setIsSearchOpen(false);
        return true;
      }
      return true;
    });

    connectShellWs(sessionId, ref, term);
  }, []);

  const connectShellWs = useCallback((sessionId: string, ref: ShellSessionRef, term: XTerm) => {
    if (ref.cleanupWs) { ref.cleanupWs(); ref.cleanupWs = null; }
    if (ref.ws) { ref.ws.destroy(); ref.ws = null; }

    const ws = createShellWebSocket(projectId, sessionId);
    ref.ws = ws;

    const unsub1 = ws.onStateChange((event) => {
      updateSessionState(sessionId, event.state);
      if (event.state === 'connected') {
        term.writeln('\x1b[32m● Connected to shell\x1b[0m');
        if (ref.fitAddon) {
          try {
            ref.fitAddon.fit();
            ws.send({ type: 'resize', cols: term.cols, rows: term.rows });
          } catch {}
        }
      } else if (event.state === 'reconnecting') {
        term.writeln('\r\n\x1b[33m● Reconnecting...\x1b[0m');
      } else if (event.state === 'failed' || event.state === 'circuit_open') {
        term.writeln('\r\n\x1b[31m● Connection failed. Click refresh to try again.\x1b[0m');
      }
    });

    const unsub2 = ws.onMessage((event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'output': term.write(msg.data); break;
          case 'error': term.write(`\x1b[31m${msg.data}\x1b[0m`); break;
          case 'exit': term.writeln(`\r\n\x1b[90mProcess exited with code ${msg.code}\x1b[0m`); break;
          default: if (msg.data) term.write(msg.data); break;
        }
      } catch {
        term.write(event.data);
      }
    });

    term.onData((data) => {
      if (ws.isConnected()) ws.send({ type: 'input', data });

      if (data === '\r') {
        const cmd = ref.inputBuffer.trim();
        if (cmd) {
          void appendCommandToHistory(projectId, cmd);
        }
        ref.inputBuffer = '';
      } else if (data === '\x7f' || data === '\b') {
        ref.inputBuffer = ref.inputBuffer.slice(0, -1);
      } else if (data.charCodeAt(0) === 0x03 || data.charCodeAt(0) === 0x15) {
        ref.inputBuffer = '';
      } else if (data.length === 1 && data.charCodeAt(0) >= 0x20) {
        ref.inputBuffer += data;
      } else if (data.length > 1 && !data.startsWith('\x1b')) {
        ref.inputBuffer += data;
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws.isConnected()) ws.send({ type: 'resize', cols, rows });
    });

    ref.cleanupWs = () => { unsub1(); unsub2(); };
    ws.connect();
  }, [projectId, updateSessionState]);

  const containerCallback = useCallback((sessionId: string) => (el: HTMLDivElement | null) => {
    if (!el) return;
    containerRefsMap.current.set(sessionId, el);
    initXterm(sessionId, el);
  }, [initXterm]);

  const createNewShell = useCallback(async () => {
    try {
      const { sessionId } = await apiRequest<{ sessionId: string }>(
        'POST', `/api/shell/${projectId}/shell/create`, {}
      );
      const name = `Shell ${shellSessions.length + 1}`;
      setShellSessions(prev => [...prev, { id: sessionId, name, connectionState: 'connecting' }]);
      setActiveShellId(sessionId);
      setActiveTab('shell');
    } catch {
      toast({ title: 'Failed to create shell', variant: 'destructive' });
    }
  }, [projectId, shellSessions.length, toast]);

  const closeShell = useCallback((shellId: string) => {
    const ref = sessionRefsMap.current.get(shellId);
    if (ref) {
      ref.cleanupWs?.();
      ref.ws?.destroy();
      ref.term.dispose();
      sessionRefsMap.current.delete(shellId);
    }
    containerRefsMap.current.delete(shellId);

    const remaining = shellSessions.filter(s => s.id !== shellId);
    setShellSessions(remaining);
    if (activeShellId === shellId) {
      setActiveShellId(remaining.length > 0 ? remaining[remaining.length - 1].id : '');
      if (remaining.length === 0) setActiveTab('output');
    }
  }, [shellSessions, activeShellId]);

  const clearShell = useCallback(() => {
    const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
    ref?.term.clear();
  }, [activeShellId]);

  const reconnectShell = useCallback(() => {
    const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
    if (!ref) return;
    ref.term.writeln('\r\n\x1b[33m● Reconnecting...\x1b[0m');
    ref.ws?.forceReconnect();
  }, [activeShellId]);

  const copyShell = useCallback(() => {
    const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
    if (!ref) return;
    const selection = ref.term.getSelection();
    if (selection) {
      navigator.clipboard.writeText(selection);
      toast({ title: 'Copied to clipboard' });
    }
  }, [activeShellId, toast]);

  const searchNext = useCallback(() => {
    const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
    if (ref && searchQuery) {
      ref.searchAddon.findNext(searchQuery, { caseSensitive: false, regex: false });
    }
  }, [activeShellId, searchQuery]);

  const searchPrev = useCallback(() => {
    const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
    if (ref && searchQuery) {
      ref.searchAddon.findPrevious(searchQuery, { caseSensitive: false, regex: false });
    }
  }, [activeShellId, searchQuery]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
      if (activeShellId) {
        const ref = sessionRefsMap.current.get(activeShellId);
        ref?.term.focus();
      }
    }
  }, [isSearchOpen, activeShellId]);

  useEffect(() => {
    if (!searchQuery) return;
    const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
    if (ref) {
      ref.searchAddon.findNext(searchQuery, { caseSensitive: false, regex: false });
    }
  }, [searchQuery, activeShellId]);

  useEffect(() => {
    if (!shellWrapperRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!activeShellId) return;
      const ref = sessionRefsMap.current.get(activeShellId);
      if (ref) {
        try { ref.fitAddon.fit(); } catch {}
      }
    });
    observer.observe(shellWrapperRef.current);
    return () => observer.disconnect();
  }, [activeShellId]);

  useEffect(() => {
    if (!activeShellId) return;
    const ref = sessionRefsMap.current.get(activeShellId);
    if (ref) {
      setTimeout(() => {
        try { ref.fitAddon.fit(); ref.term.focus(); } catch {}
      }, 50);
    }
  }, [activeShellId]);

  useEffect(() => {
    return () => {
      sessionRefsMap.current.forEach((ref) => {
        ref.cleanupWs?.();
        ref.ws?.destroy();
        ref.term.dispose();
      });
      sessionRefsMap.current.clear();
    };
  }, []);

  useEffect(() => {
    loadServerHistory(projectId).then((serverHistory) => {
      if (serverHistory.length === 0) return;
      const local = loadLocalHistory(projectId);
      const merged = Array.from(new Set([...local, ...serverHistory])).slice(-MAX_HISTORY_ENTRIES);
      saveLocalHistory(projectId, merged);
    });
  }, [projectId]);

  const handleLog = useCallback((log: RuntimeLogEntry) => {
    const consoleLog: ConsoleLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: log.type === 'stderr' ? 'error' : log.type === 'exit' ? 'info' : log.type,
      message: log.content,
      timestamp: new Date(log.timestamp),
    };
    setLogs(prev => [...prev, consoleLog]);
    if (autoScrollRef.current && scrollRef.current) {
      setTimeout(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 10);
    }
  }, []);

  const { isConnected, isComplete, exitCode, connect, disconnect, clearLogs: clearWsLogs } = useRuntimeLogs({
    projectId,
    userId,
    executionId,
    enabled: Boolean(isRunning && executionId),
    onLog: handleLog,
  });

  useEffect(() => {
    if (isRunning && executionId) {
      setLogs([]);
      setActiveTab('output');
      connect(executionId);
    } else if (!isRunning) {
      disconnect();
    }
  }, [isRunning, executionId, connect, disconnect]);

  const generateCommandMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest('POST', '/api/shell/generate-command', {
        prompt,
        projectId,
        history: loadCommandHistory(projectId).slice(-20),
      });
    },
    onSuccess: (data: any) => {
      if (data.command) {
        const ref = activeShellId ? sessionRefsMap.current.get(activeShellId) : undefined;
        if (ref && ref.ws?.isConnected()) {
          ref.term.paste(data.command);
        } else {
          toast({ title: 'Command generated', description: data.command });
        }
        setIsGenerateMode(false);
        setGeneratePrompt('');
      }
    },
    onError: () => {
      toast({ title: 'Generation failed', variant: 'destructive' });
    }
  });

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const clearLogs = () => {
    setLogs([]);
    clearWsLogs();
  };

  const copyLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const downloadLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}${log.stack ? '\n' + log.stack : ''}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${projectId}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error': case 'stderr': return 'text-destructive';
      case 'warn': return 'text-[hsl(var(--chart-4))]';
      case 'info': case 'system': return 'text-primary';
      case 'debug': return 'text-muted-foreground';
      case 'stdout': case 'log': return 'text-foreground';
      case 'exit': return 'text-[hsl(var(--chart-2))]';
      default: return 'text-foreground';
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ecode-surface)]", className)}>
      {/* Toolbar */}
      <div className="h-9 flex items-center justify-between px-2.5 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'output' | 'shell')}>
            <TabsList className="h-7 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <TabsTrigger 
                value="output" 
                className="text-[10px] px-2.5 h-6 gap-1 whitespace-nowrap data-[state=active]:bg-[hsl(142,72%,42%)]/10 data-[state=active]:text-[hsl(142,72%,42%)]"
                data-testid="console-tab-output"
              >
                <Play className="h-3 w-3" />
                Output
                {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,72%,42%)] animate-pulse" />}
              </TabsTrigger>
              <TabsTrigger 
                value="shell" 
                className="text-[10px] px-2.5 h-6 gap-1 whitespace-nowrap data-[state=active]:bg-[hsl(142,72%,42%)]/10 data-[state=active]:text-[hsl(142,72%,42%)]"
                onClick={() => { if (shellSessions.length === 0) createNewShell(); }}
                data-testid="console-tab-shell"
              >
                <Terminal className="h-3 w-3" />
                Shell
                {activeSession?.connectionState === 'connected' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(142,72%,42%)]" />
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'output' && isRunning && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-green-500" : "bg-yellow-500")} />
              <span>{isConnected ? 'Live' : 'Connecting...'}</span>
            </div>
          )}

          {activeTab === 'output' && isComplete && exitCode !== null && (
            <div className="flex items-center gap-1">
              {exitCode === 0
                ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                : <XCircle className="h-3.5 w-3.5 text-red-500" />}
              <span className={cn("text-[11px]", exitCode === 0 ? "text-green-500" : "text-red-500")}>
                Exit: {exitCode}
              </span>
            </div>
          )}

          {activeTab === 'shell' && activeSession && (
            <ConnectionPill state={activeSession.connectionState} />
          )}
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'output' ? (
            <>
              <Button
                variant={filter === 'all' ? 'secondary' : 'ghost'}
                size="sm" className="h-6 px-2 text-[11px]"
                onClick={() => setFilter('all')}
                data-testid="console-filter-all"
              >
                All ({logs.length})
              </Button>
              <Button
                variant={filter === 'error' ? 'secondary' : 'ghost'}
                size="sm" className="h-6 px-2 text-[11px]"
                onClick={() => setFilter('error')}
                data-testid="console-filter-error"
              >
                Errors
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearLogs} title="Clear" data-testid="console-clear">
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyLogs} title="Copy" data-testid="console-copy">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={downloadLogs} title="Download" data-testid="console-download">
                <Download className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              {shellSessions.length > 0 && (
                <div className="flex items-center gap-1 mr-1">
                  {shellSessions.map(s => (
                    <Button
                      key={s.id}
                      variant={s.id === activeShellId ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-[11px] gap-1"
                      onClick={() => setActiveShellId(s.id)}
                      data-testid={`shell-session-${s.id}`}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", 
                        s.connectionState === 'connected' ? 'bg-green-500' : 
                        s.connectionState === 'reconnecting' || s.connectionState === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-500'
                      )} />
                      {s.name}
                      <X
                        className="h-3 w-3 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); closeShell(s.id); }}
                      />
                    </Button>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={createNewShell} title="New Shell" data-testid="shell-new">
                <Plus className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reconnectShell} title="Reconnect" data-testid="shell-reconnect"
                disabled={!activeShellId}>
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                variant={isSearchOpen ? 'secondary' : 'ghost'}
                size="icon" className="h-6 w-6"
                onClick={() => setIsSearchOpen(v => !v)}
                title="Search (Ctrl+F)"
                data-testid="shell-search-toggle"
              >
                <Search className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearShell} title="Clear" data-testid="shell-clear">
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyShell} title="Copy selection" data-testid="shell-copy">
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => setIsGenerateMode(!isGenerateMode)}
                data-testid="shell-generate-toggle"
              >
                <Sparkles className="h-3 w-3" />
                AI
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      {activeTab === 'shell' && isSearchOpen && (
        <div className="flex items-center gap-1.5 px-2 py-1 border-b bg-muted/40 shrink-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find in terminal..."
            className="h-6 text-[11px] flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.shiftKey ? searchPrev() : searchNext(); }
              else if (e.key === 'Escape') { setIsSearchOpen(false); }
            }}
            data-testid="shell-search-input"
          />
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={searchPrev} title="Previous" data-testid="shell-search-prev">
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={searchNext} title="Next" data-testid="shell-search-next">
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsSearchOpen(false)} title="Close" data-testid="shell-search-close">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* AI Generate bar */}
      {activeTab === 'shell' && isGenerateMode && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-primary/5 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <Input
            value={generatePrompt}
            onChange={(e) => setGeneratePrompt(e.target.value)}
            placeholder="Describe the command you want..."
            className="h-7 text-[11px] flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && generatePrompt.trim()) generateCommandMutation.mutate(generatePrompt);
              else if (e.key === 'Escape') { setIsGenerateMode(false); setGeneratePrompt(''); }
            }}
            autoFocus
            data-testid="shell-generate-input"
          />
          <Button
            size="sm" className="h-7 text-[11px] gap-1"
            onClick={() => generateCommandMutation.mutate(generatePrompt)}
            disabled={!generatePrompt.trim() || generateCommandMutation.isPending}
            data-testid="shell-generate-submit"
          >
            {generateCommandMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => { setIsGenerateMode(false); setGeneratePrompt(''); }} data-testid="shell-generate-cancel">
            Cancel
          </Button>
        </div>
      )}

      {/* Content area */}
      {activeTab === 'output' ? (
        <ScrollArea
          className="flex-1 font-mono text-[11px]"
          onScroll={(e) => {
            const target = e.target as HTMLElement;
            const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
            autoScrollRef.current = isAtBottom;
          }}
        >
          <div className="p-2 space-y-0.5">
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                {isRunning ? 'Waiting for output...' : 'Click "Run" to see output'}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="group hover:bg-muted/50 px-2 py-0.5 rounded">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                    <span className={cn("font-semibold uppercase text-[10px]", getLogColor(log.type))}>{log.type}</span>
                    <span className="break-all whitespace-pre-wrap">{log.message}</span>
                  </div>
                  {log.stack && (
                    <pre className="ml-16 mt-1 text-muted-foreground text-[10px] whitespace-pre-wrap">{log.stack}</pre>
                  )}
                </div>
              ))
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      ) : (
        <div ref={shellWrapperRef} className="flex-1 relative overflow-hidden" data-testid="shell-output">
          {shellSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Terminal className="h-10 w-10 opacity-30" />
              <p className="text-sm">No shell sessions</p>
              <Button size="sm" onClick={createNewShell} data-testid="shell-start">
                <Plus className="h-4 w-4 mr-1" />
                New Shell
              </Button>
            </div>
          ) : (
            shellSessions.map((session) => (
              <div
                key={session.id}
                ref={containerCallback(session.id)}
                className="absolute inset-0 p-1"
                style={{ display: session.id === activeShellId ? 'block' : 'none' }}
                data-testid={`shell-xterm-${session.id}`}
              />
            ))
          )}

          {/* Dead session CTA */}
          {activeSession && (activeSession.connectionState === 'failed' || activeSession.connectionState === 'circuit_open') && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-[12px] text-muted-foreground">Session lost</span>
              <Button size="sm" className="h-7 text-[11px]" onClick={reconnectShell} data-testid="shell-reconnect-cta">
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={createNewShell} data-testid="shell-new-session-cta">
                <Plus className="h-3 w-3 mr-1" />
                New Shell
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
