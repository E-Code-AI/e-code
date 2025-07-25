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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  Command,
  Menu,
  MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ReplitHeader } from '@/components/layout/ReplitHeader';
import { ECodeLoading } from '@/components/ECodeLoading';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { 
  responsiveText, 
  responsivePadding, 
  responsiveContainer,
  responsiveButton,
  responsiveVisibility,
  mediaQueries 
} from '@/lib/responsive';

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

export default function ResponsiveShell() {
  const [sessions, setSessions] = useState<ShellSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [fontSize, setFontSize] = useState(14);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const terminalRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const { toast } = useToast();

  // Responsive states
  const isMobile = useMediaQuery(mediaQueries.isMobile);
  const isTablet = useMediaQuery(mediaQueries.isTablet);
  const isDesktop = useMediaQuery(mediaQueries.isDesktop);

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
      fontSize: isMobile ? 12 : fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      convertEol: true,
      // Mobile optimizations
      allowTransparency: false,
      drawBoldTextInBrightColors: true,
      rendererType: 'canvas',
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
  }, [sessions.length, selectedTheme, fontSize, isMobile]);

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

  // Adjust font size for mobile
  useEffect(() => {
    sessions.forEach(session => {
      session.terminal.options.fontSize = isMobile ? 12 : fontSize;
    });
  }, [isMobile, fontSize, sessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ecode-background)] flex items-center justify-center">
        <ECodeLoading size="lg" text="Loading Shell..." />
      </div>
    );
  }

  // Mobile header
  const MobileHeader = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)]">
      <div className="flex items-center gap-2">
        <TerminalIcon className="h-5 w-5 text-[var(--ecode-text)]" />
        <h1 className={cn(responsiveText.lg, "font-semibold text-[var(--ecode-text)]")}>Shell</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={copyTerminalContent}
          className="h-8 w-8"
        >
          <Copy className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={clearTerminal}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadTerminalLog}>
              <Download className="h-4 w-4 mr-2" />
              Download Log
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Desktop header
  const DesktopHeader = () => (
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
  );

  // Shell Info Bar
  const InfoBar = () => (
    <div className={cn(
      "bg-[var(--ecode-surface-secondary)] border-b border-[var(--ecode-border)]",
      responsivePadding.x.base,
      "py-2"
    )}>
      <div className="flex items-center justify-between text-xs text-[var(--ecode-text-secondary)]">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <FolderOpen className="h-3 w-3" />
            <span className={responsiveVisibility.hideMobile}>~/projects</span>
            <span className={responsiveVisibility.showMobile}>~</span>
          </div>
          <div className={cn("flex items-center gap-1 sm:gap-2", responsiveVisibility.hideTablet)}>
            <Package className="h-3 w-3" />
            <span>Node.js 20.11.0</span>
          </div>
          <div className={cn("flex items-center gap-1 sm:gap-2", responsiveVisibility.hideMobile)}>
            <Code className="h-3 w-3" />
            <span>Bash 5.2</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 sm:gap-4", responsiveVisibility.hideTablet)}>
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
  );

  // Settings sheet for mobile
  const SettingsSheet = () => (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetContent side="bottom" className="h-[50vh]">
        <SheetHeader>
          <SheetTitle>Shell Settings</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
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
          
          <div>
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
          
          <Button onClick={downloadTerminalLog} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Log
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className={cn(
      "min-h-screen bg-[var(--ecode-background)] flex flex-col",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      {!isMobile && <ReplitHeader />}
      
      <div className="flex-1 flex flex-col">
        {isMobile ? <MobileHeader /> : <DesktopHeader />}
        
        {!isMobile && <InfoBar />}

        {/* Terminal Container */}
        <div className={cn(
          "flex-1 bg-[#1e1e1e]",
          isMobile ? "p-2" : "p-4"
        )}>
          {sessions.map(session => (
            <div
              key={session.id}
              ref={el => {
                if (el) terminalRefs.current[session.id] = el;
              }}
              className={cn(
                "h-full",
                session.id === activeSessionId ? 'block' : 'hidden'
              )}
              style={{ minHeight: isMobile ? '300px' : '400px' }}
            />
          ))}
        </div>

        {/* Mobile session tabs */}
        {isMobile && sessions.length > 1 && (
          <div className="bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)] px-2 py-1">
            <div className="flex gap-1 overflow-x-auto">
              {sessions.map(session => (
                <Button
                  key={session.id}
                  variant={session.id === activeSessionId ? "default" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2 whitespace-nowrap"
                  onClick={() => setActiveSessionId(session.id)}
                >
                  {session.name}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => createNewSession()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Shell Status Bar */}
        <div className={cn(
          "bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)]",
          responsivePadding.x.base,
          "py-1"
        )}>
          <div className="flex items-center justify-between text-xs text-[var(--ecode-text-secondary)]">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>Connected</span>
              <span className={responsiveVisibility.hideMobile}>•</span>
              <span className={responsiveVisibility.hideMobile}>UTF-8</span>
              <span className={responsiveVisibility.hideMobile}>•</span>
              <span className={responsiveVisibility.hideMobile}>LF</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Command className="h-3 w-3" />
              <span className={responsiveVisibility.hideMobile}>Press Ctrl+C to interrupt</span>
              <span className={responsiveVisibility.showMobile}>Ctrl+C</span>
            </div>
          </div>
        </div>
      </div>
      
      {isMobile && <SettingsSheet />}
    </div>
  );
}