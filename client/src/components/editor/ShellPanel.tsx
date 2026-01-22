import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  Terminal,
  X,
  RotateCcw,
  Copy,
  Trash2,
  Plus,
  Wifi,
  WifiOff,
  Loader2,
  Settings,
  FolderOpen,
  ChevronDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { io, Socket } from 'socket.io-client';

interface ShellPanelProps {
  projectId: string | number;
  className?: string;
}

interface ShellTab {
  id: string;
  sessionId: string;
  name: string;
  cwd: string;
  isConnected: boolean;
  isConnecting: boolean;
}

interface TerminalInstance {
  term: XTerm;
  fitAddon: FitAddon;
  socket: Socket | null;
  commandHistory: string[];
  historyIndex: number;
  currentInput: string;
}

export function ShellPanel({ projectId, className }: ShellPanelProps) {
  const [tabs, setTabs] = useState<ShellTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Track which tabs have had WebSocket connection initiated (prevents duplicate connections)
  const wsInitiatedRef = useRef<Set<string>>(new Set());
  const { toast } = useToast();

  const createSession = useCallback(async (): Promise<string | null> => {
    // For now, use local session IDs - they work with the terminal WebSocket directly
    // The API endpoint is optional and may fail if user doesn't own the project
    const sessionId = `shell-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    console.log('[Shell] Created local session:', sessionId);
    return sessionId;
  }, [projectId]);

  const connectSocket = useCallback((tabId: string, sessionId: string) => {
    console.log('[Shell] connectSocket called', { tabId, sessionId });
    const instance = terminalsRef.current.get(tabId);
    if (!instance) {
      console.warn('[Shell] No terminal instance found for tab', tabId);
      return;
    }
    console.log('[Shell] Terminal instance found, creating Socket.IO connection');

    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, isConnecting: true, isConnected: false } : tab
    ));

    const projectParam = projectId && projectId !== 'undefined' ? projectId : 'default';
    console.log('[Shell] Socket.IO connecting with projectId:', projectParam);

    try {
      const socket = io({
        path: '/socket.io/terminal',
        query: { projectId: projectParam, sessionId },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
      
      console.log('[Shell] Socket.IO instance created');
      instance.socket = socket;

      socket.on('connect', () => {
        console.log('[Shell] Socket.IO connected for tab', tabId);
        setTabs(prev => prev.map(tab => 
          tab.id === tabId ? { ...tab, isConnected: true, isConnecting: false } : tab
        ));

        instance.term.writeln('\x1b[1;32m✓ Connected to shell\x1b[0m');
        console.log('[Shell] Wrote connection success message to terminal');

        const existingTimeout = reconnectTimeoutsRef.current.get(tabId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          reconnectTimeoutsRef.current.delete(tabId);
        }
      });

      socket.on('connected', (data: { message: string }) => {
        console.log('[Shell] Server connected message:', data.message);
      });

      socket.on('ready', (data: { message: string }) => {
        console.log('[Shell] Server ready message:', data.message);
        instance.term.writeln(`\x1b[1;32m✓ ${data.message}\x1b[0m`);
        instance.term.write('\x1b[1;36muser@project\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ');
      });

      socket.on('history', (data: { data: string }) => {
        if (data?.data) {
          instance.term.write(data.data);
        }
      });

      socket.on('output', (data: { data: string }) => {
        if (data?.data) {
          instance.term.write(data.data);
        }
      });

      socket.on('error', (data: { message: string }) => {
        console.error('[Shell] Socket.IO error:', data.message);
        instance.term.writeln(`\r\n\x1b[1;31m✗ ${data.message}\x1b[0m`);
      });

      socket.on('exit', (data: { code: number; signal: number }) => {
        instance.term.writeln(`\r\n\x1b[90mProcess exited with code ${data.code}\x1b[0m`);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Shell] Socket.IO disconnected for tab', tabId, 'reason:', reason);
        setTabs(prev => prev.map(tab => 
          tab.id === tabId ? { ...tab, isConnected: false, isConnecting: false } : tab
        ));

        instance.term.writeln('\r\n\x1b[1;33m⚠ Connection closed\x1b[0m');

        if (reason === 'io server disconnect') {
          const timeout = setTimeout(() => {
            instance.term.writeln('\x1b[90mReconnecting...\x1b[0m');
            socket.connect();
          }, 3000);
          reconnectTimeoutsRef.current.set(tabId, timeout);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('[Shell] Socket.IO connect_error for tab', tabId, error.message);
        setTabs(prev => prev.map(tab => 
          tab.id === tabId ? { ...tab, isConnecting: false } : tab
        ));
        instance.term.writeln(`\r\n\x1b[1;31m✗ Connection error: ${error.message}\x1b[0m`);
      });

    } catch (error) {
      console.error('[Shell] Socket.IO connection error:', error);
      setTabs(prev => prev.map(tab => 
        tab.id === tabId ? { ...tab, isConnecting: false } : tab
      ));
    }
  }, [projectId]);

  const initializeTerminal = useCallback((tabId: string, container: HTMLDivElement) => {
    if (terminalsRef.current.has(tabId)) return;

    const term = new XTerm({
      theme: {
        background: '#0e1525',
        foreground: '#d4d8dd',
        cursor: '#0079f2',
        cursorAccent: '#0e1525',
        selectionBackground: 'rgba(0, 121, 242, 0.3)',
        black: '#0e1525',
        red: '#ff6b6b',
        green: '#4ecdc4',
        yellow: '#ffe66d',
        blue: '#0079f2',
        magenta: '#c792ea',
        cyan: '#89ddff',
        white: '#d4d8dd',
        brightBlack: '#3d4452',
        brightRed: '#ff8a80',
        brightGreen: '#69f0ae',
        brightYellow: '#ffff8d',
        brightBlue: '#40c4ff',
        brightMagenta: '#ff80ab',
        brightCyan: '#a7fdeb',
        brightWhite: '#ffffff'
      },
      fontSize: 13,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
      allowTransparency: false,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    
    setTimeout(() => fitAddon.fit(), 0);

    const instance: TerminalInstance = {
      term,
      fitAddon,
      socket: null,
      commandHistory: [],
      historyIndex: -1,
      currentInput: '',
    };

    term.writeln('\x1b[1;32m╭─────────────────────────────────────────╮\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m \x1b[1;36mShell\x1b[0m                                   \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m \x1b[90mConnecting to workspace...\x1b[0m            \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m╰─────────────────────────────────────────╯\x1b[0m');
    term.writeln('');

    term.onData((data) => {
      if (!instance.socket || !instance.socket.connected) {
        return;
      }

      if (data === '\x1b[A') {
        if (instance.historyIndex < instance.commandHistory.length - 1) {
          instance.historyIndex++;
          const command = instance.commandHistory[instance.commandHistory.length - 1 - instance.historyIndex];
          if (command) {
            term.write('\x1b[2K\r\x1b[1;36muser@project\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ' + command);
            instance.currentInput = command;
          }
        }
        return;
      }

      if (data === '\x1b[B') {
        if (instance.historyIndex >= 0) {
          instance.historyIndex--;
          const command = instance.historyIndex >= 0 
            ? instance.commandHistory[instance.commandHistory.length - 1 - instance.historyIndex] 
            : '';
          term.write('\x1b[2K\r\x1b[1;36muser@project\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ' + command);
          instance.currentInput = command;
        }
        return;
      }

      if (data === '\r') {
        if (instance.currentInput.trim()) {
          instance.commandHistory = [...instance.commandHistory.slice(-99), instance.currentInput.trim()];
        }
        instance.currentInput = '';
        instance.historyIndex = -1;
      } else if (data === '\x7f') {
        instance.currentInput = instance.currentInput.slice(0, -1);
      } else if (data.charCodeAt(0) >= 32) {
        instance.currentInput += data;
      }

      instance.socket.emit('input', { data });
    });

    terminalsRef.current.set(tabId, instance);
  }, []);

  const addNewTab = useCallback(async () => {
    const sessionId = await createSession();
    if (!sessionId) {
      toast({
        title: 'Error',
        description: 'Failed to create shell session',
        variant: 'destructive',
      });
      return;
    }

    const tabId = `tab-${Date.now()}`;
    const newTab: ShellTab = {
      id: tabId,
      sessionId,
      name: `Shell ${tabs.length + 1}`,
      cwd: '~/workspace',
      isConnected: false,
      isConnecting: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
  }, [createSession, tabs.length, toast]);

  const closeTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await apiRequest('DELETE', `/api/projects/${projectId}/shell/${tab.sessionId}`);
    } catch (error) {
      console.error('[Shell] Failed to close session:', error);
    }

    const instance = terminalsRef.current.get(tabId);
    if (instance) {
      instance.socket?.disconnect();
      instance.term.dispose();
      terminalsRef.current.delete(tabId);
    }

    const timeout = reconnectTimeoutsRef.current.get(tabId);
    if (timeout) {
      clearTimeout(timeout);
      reconnectTimeoutsRef.current.delete(tabId);
    }

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  }, [activeTabId, projectId, tabs]);

  const handleClear = useCallback(() => {
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      instance.term.clear();
      instance.term.write('\x1b[1;36muser@project\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ');
    }
  }, [activeTabId]);

  const handleCopy = useCallback(() => {
    const instance = terminalsRef.current.get(activeTabId);
    if (instance) {
      const selection = instance.term.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        toast({
          title: 'Copied',
          description: 'Selection copied to clipboard',
        });
      }
    }
  }, [activeTabId, toast]);

  const handleReset = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId);
    const instance = terminalsRef.current.get(activeTabId);
    
    if (!tab || !instance) return;

    instance.socket?.disconnect();
    instance.term.reset();
    instance.term.writeln('\x1b[1;32m╭─────────────────────────────────────────╮\x1b[0m');
    instance.term.writeln('\x1b[1;32m│\x1b[0m \x1b[1;36mShell\x1b[0m                                   \x1b[1;32m│\x1b[0m');
    instance.term.writeln('\x1b[1;32m│\x1b[0m \x1b[90mReconnecting...\x1b[0m                       \x1b[1;32m│\x1b[0m');
    instance.term.writeln('\x1b[1;32m╰─────────────────────────────────────────╯\x1b[0m');
    instance.term.writeln('');

    setTimeout(() => connectSocket(activeTabId, tab.sessionId), 500);
  }, [activeTabId, connectSocket, tabs]);

  useEffect(() => {
    if (tabs.length === 0) {
      addNewTab();
    }
  }, []);

  useEffect(() => {
    if (!activeTabId || !terminalContainerRef.current) return;

    const container = terminalContainerRef.current;
    const existingInstance = terminalsRef.current.get(activeTabId);
    
    if (!existingInstance) {
      container.innerHTML = '';
      initializeTerminal(activeTabId, container);
    } else {
      // Re-attach existing terminal to container
      container.innerHTML = '';
      existingInstance.term.open(container);
      setTimeout(() => existingInstance.fitAddon.fit(), 0);
    }
  }, [activeTabId, initializeTerminal]);
  
  // Separate effect for WebSocket connection - only runs once per tab
  useEffect(() => {
    if (!activeTabId) return;
    
    // Only initiate WebSocket connection once per tab
    if (wsInitiatedRef.current.has(activeTabId)) {
      console.log('[Shell] WebSocket already initiated for tab', activeTabId);
      return;
    }
    
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab || !tab.sessionId) {
      console.log('[Shell] Tab not found or no sessionId', { activeTabId, tabsCount: tabs.length, hasSessionId: tab?.sessionId });
      return;
    }
    
    // Small delay to ensure terminal is fully initialized
    const timer = setTimeout(() => {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance && !instance.socket) {
        console.log('[Shell] Initiating Socket.IO for tab', activeTabId, 'sessionId:', tab.sessionId);
        wsInitiatedRef.current.add(activeTabId);
        connectSocket(activeTabId, tab.sessionId);
      } else {
        console.log('[Shell] Skipping Socket.IO connection', { 
          hasInstance: !!instance, 
          hasSocket: !!instance?.socket,
          connected: instance?.socket?.connected 
        });
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [activeTabId, tabs, connectSocket]);

  useEffect(() => {
    const handleResize = () => {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance) {
        instance.fitAddon.fit();
        
        if (instance.socket?.connected) {
          instance.socket.emit('resize', {
            cols: instance.term.cols,
            rows: instance.term.rows,
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    const container = terminalContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    
    if (container) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [activeTabId]);

  useEffect(() => {
    return () => {
      terminalsRef.current.forEach((instance) => {
        instance.socket?.disconnect();
        instance.term.dispose();
      });
      terminalsRef.current.clear();
      
      reconnectTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      reconnectTimeoutsRef.current.clear();
    };
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div 
      className={cn(
        "h-full flex flex-col bg-background",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      data-testid="shell-panel"
    >
      <div className="min-h-[40px] sm:min-h-[44px] flex items-center justify-between px-2 sm:px-3 border-b border-border bg-card">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <Terminal className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] font-medium hidden sm:inline">Shell</span>
          </div>

          {activeTab && (
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {activeTab.isConnecting ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-[11px] text-muted-foreground hidden md:inline">Connecting</span>
                </div>
              ) : activeTab.isConnected ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/10">
                  <Wifi className="w-3 h-3 text-green-500" />
                  <span className="text-[11px] text-green-500 hidden md:inline">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
                  <WifiOff className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground hidden md:inline">Disconnected</span>
                </div>
              )}
            </div>
          )}

          {tabs.length > 1 && (
            <ScrollArea className="flex-1 max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
              <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
                <TabsList className="h-7 bg-transparent p-0 gap-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="h-6 px-2 text-[11px] gap-1 data-[state=active]:bg-muted rounded"
                      data-testid={`tab-shell-${tab.id}`}
                    >
                      <span className="truncate max-w-[60px] sm:max-w-[80px]">{tab.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        data-testid={`button-close-tab-${tab.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </ScrollArea>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={addNewTab}
            title="New shell"
            data-testid="button-new-shell"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={handleCopy}
            title="Copy selection"
            data-testid="button-copy-output"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={handleClear}
            title="Clear terminal"
            data-testid="button-clear-terminal"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={handleReset}
            title="Reset terminal"
            data-testid="button-reset-terminal"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            data-testid="button-fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                data-testid="button-shell-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-testid="menu-shell-settings">
              <DropdownMenuItem onClick={addNewTab}>
                <Plus className="w-4 h-4 mr-2" />
                New Shell
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClear}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Output
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Shell
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Selection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {activeTab && (
        <div className="h-6 flex items-center px-3 border-b border-border bg-muted/30 text-[11px] text-muted-foreground gap-2">
          <FolderOpen className="w-3 h-3" />
          <span className="truncate" data-testid="text-working-directory">{activeTab.cwd}</span>
        </div>
      )}

      <div className="flex-1 relative overflow-hidden">
        <div
          ref={terminalContainerRef}
          className="absolute inset-0 p-2"
          style={{ backgroundColor: '#0e1525' }}
          data-testid="terminal-container"
        />
      </div>
    </div>
  );
}
