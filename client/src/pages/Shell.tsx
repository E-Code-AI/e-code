import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Terminal as TerminalIcon, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2,
  Download,
  Upload,
  Settings,
  Copy,
  Trash2,
  RefreshCw,
  ChevronDown,
  HelpCircle,
  Package,
  FolderOpen,
  Code,
  Search,
  History,
  Palette,
  Split,
  Command
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReplitHeader } from '@/components/layout/ReplitHeader';
import { ECodeLoading } from '@/components/ECodeLoading';

interface ShellSession {
  id: string;
  name: string;
  terminal: XTerm;
  fitAddon: FitAddon;
  websocket?: WebSocket;
  cwd: string;
  history: string[];
  historyIndex: number;
}

export default function Shell() {
  const [sessions, setSessions] = useState<ShellSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [fontSize, setFontSize] = useState(14);
  const terminalRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const { toast } = useToast();

  const themes = {
    default: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    monokai: {
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      black: '#272822',
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#f4bf75',
      blue: '#66d9ef',
      magenta: '#ae81ff',
      cyan: '#a1efe4',
      white: '#f8f8f2',
      brightBlack: '#75715e',
      brightRed: '#f92672',
      brightGreen: '#a6e22e',
      brightYellow: '#f4bf75',
      brightBlue: '#66d9ef',
      brightMagenta: '#ae81ff',
      brightCyan: '#a1efe4',
      brightWhite: '#f9f8f5'
    }
  };

  const createNewSession = useCallback((name?: string) => {
    const sessionId = `shell-${Date.now()}`;
    const sessionName = name || `Shell ${sessions.length + 1}`;
    
    const terminal = new XTerm({
      theme: themes[selectedTheme as keyof typeof themes],
      fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    const newSession: ShellSession = {
      id: sessionId,
      name: sessionName,
      terminal,
      fitAddon,
      cwd: '~',
      history: [],
      historyIndex: -1,
    };

    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(sessionId);
    
    // Connect to WebSocket after state update
    setTimeout(() => connectWebSocket(sessionId), 0);
    
    return sessionId;
  }, [sessions.length, selectedTheme, fontSize]);

  const connectWebSocket = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/shell?sessionId=${sessionId}`);
    
    ws.onopen = () => {
      console.log('Shell WebSocket connected');
      session.terminal.write('\r\n\x1b[32mE-Code Shell\x1b[0m - Full Linux Environment\r\n');
      session.terminal.write('Type \x1b[33mhelp\x1b[0m for available commands\r\n\r\n');
      session.terminal.write('\x1b[32m~\x1b[0m $ ');
    };

    ws.onmessage = (event) => {
      session.terminal.write(event.data);
    };

    ws.onerror = (error) => {
      console.error('Shell WebSocket error:', error);
      session.terminal.write('\r\n\x1b[31mConnection error. Please refresh to reconnect.\x1b[0m\r\n');
    };

    ws.onclose = () => {
      console.log('Shell WebSocket closed');
      session.terminal.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n');
    };

    // Handle terminal input
    session.terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    session.websocket = ws;
  };

  const closeSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.terminal.dispose();
      session.websocket?.close();
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (activeSessionId === sessionId && sessions.length > 1) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        setActiveSessionId(remainingSessions[0].id);
      }
    }
  };

  const copyTerminalContent = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession) {
      const selection = activeSession.terminal.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        toast({
          title: "Copied!",
          description: "Terminal selection copied to clipboard",
        });
      }
    }
  };

  const clearTerminal = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession) {
      activeSession.terminal.clear();
      activeSession.terminal.write('\x1b[2J\x1b[H');
      activeSession.terminal.write('\x1b[32m~\x1b[0m $ ');
    }
  };

  const downloadTerminalLog = () => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (activeSession) {
      const content = activeSession.terminal.buffer.active.getLine(0)?.translateToString() || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shell-${activeSession.name}-${new Date().toISOString()}.log`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    // Create initial session
    if (sessions.length === 0) {
      createNewSession('Main Shell');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Attach terminals to DOM
    sessions.forEach(session => {
      const container = terminalRefs.current[session.id];
      if (container && !container.hasChildNodes()) {
        session.terminal.open(container);
        session.fitAddon.fit();
      }
    });
  }, [sessions, activeSessionId]);

  useEffect(() => {
    // Handle resize
    const handleResize = () => {
      sessions.forEach(session => {
        if (session.fitAddon) {
          session.fitAddon.fit();
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ecode-background)] flex items-center justify-center">
        <ECodeLoading size="lg" text="Loading Shell..." />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[var(--ecode-background)] flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <ReplitHeader />
      
      <div className="flex-1 flex flex-col">
        {/* Shell Header */}
        <div className="bg-[var(--ecode-surface)] border-b border-[var(--ecode-border)] px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-5 w-5 text-[var(--ecode-text)]" />
                <h1 className="text-lg font-semibold text-[var(--ecode-text)]">Shell</h1>
              </div>
              
              {/* Session Tabs */}
              <Tabs value={activeSessionId} onValueChange={setActiveSessionId}>
                <TabsList className="h-8 bg-[var(--ecode-background)]">
                  {sessions.map(session => (
                    <TabsTrigger 
                      key={session.id} 
                      value={session.id}
                      className="text-xs px-3 py-1 data-[state=active]:bg-[var(--ecode-accent)] data-[state=active]:text-white"
                    >
                      <span className="max-w-[120px] truncate">{session.name}</span>
                      {sessions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-2 p-0 hover:bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeSession(session.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </TabsTrigger>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => createNewSession()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TabsList>
              </Tabs>
            </div>

            {/* Shell Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={copyTerminalContent}
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={clearTerminal}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Shell Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={downloadTerminalLog}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Log
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1.5">
                    <label className="text-sm font-medium">Theme</label>
                    <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="monokai">Monokai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="px-2 py-1.5">
                    <label className="text-sm font-medium">Font Size</label>
                    <Select value={fontSize.toString()} onValueChange={(v) => setFontSize(parseInt(v))}>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12px</SelectItem>
                        <SelectItem value="14">14px</SelectItem>
                        <SelectItem value="16">16px</SelectItem>
                        <SelectItem value="18">18px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Shell Info Bar */}
        <div className="bg-[var(--ecode-surface-secondary)] border-b border-[var(--ecode-border)] px-4 py-2">
          <div className="flex items-center justify-between text-xs text-[var(--ecode-text-secondary)]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3 w-3" />
                <span>~/projects</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3" />
                <span>Node.js 20.11.0</span>
              </div>
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                <span>Bash 5.2</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <Package className="h-3 w-3 mr-1" />
                Install packages
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs">
                <HelpCircle className="h-3 w-3 mr-1" />
                Help
              </Button>
            </div>
          </div>
        </div>

        {/* Terminal Container */}
        <div className="flex-1 bg-[#1e1e1e] p-4">
          {sessions.map(session => (
            <div
              key={session.id}
              ref={el => {
                if (el) terminalRefs.current[session.id] = el;
              }}
              className={`h-full ${session.id === activeSessionId ? 'block' : 'hidden'}`}
              style={{ minHeight: '400px' }}
            />
          ))}
        </div>

        {/* Shell Status Bar */}
        <div className="bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)] px-4 py-1">
          <div className="flex items-center justify-between text-xs text-[var(--ecode-text-secondary)]">
            <div className="flex items-center gap-4">
              <span>Connected</span>
              <span>•</span>
              <span>UTF-8</span>
              <span>•</span>
              <span>LF</span>
            </div>
            <div className="flex items-center gap-2">
              <Command className="h-3 w-3" />
              <span>Press Ctrl+C to interrupt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}