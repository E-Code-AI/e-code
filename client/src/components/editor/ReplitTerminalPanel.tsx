import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import {
  Terminal,
  X,
  RotateCcw,
  Copy,
  Maximize2,
  Minimize2,
  Plus,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TerminalMetricsIndicator } from '@/components/terminal/TerminalMetricsIndicator';
import { useToast } from '@/hooks/use-toast';
import { LazyMotionDiv } from '@/lib/motion';

interface ReplitTerminalPanelProps {
  projectId?: string | number;
  className?: string;
}

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <LazyMotionDiv
      className={cn("rounded-lg bg-muted", className)}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ConnectionBadge({ isConnecting, isConnected }: { isConnecting: boolean; isConnected: boolean }) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border">
        <Loader2 className="w-[18px] h-[18px] animate-spin text-primary" />
        <span className="text-[13px] text-muted-foreground">Connecting</span>
      </div>
    );
  }
  
  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border">
        <Wifi className="w-[18px] h-[18px] text-primary" />
        <span className="text-[13px] text-primary">Connected</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border">
      <WifiOff className="w-[18px] h-[18px] text-muted-foreground" />
      <span className="text-[13px] text-muted-foreground">Disconnected</span>
    </div>
  );
}

export function ReplitTerminalPanel({ projectId, className }: ReplitTerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const currentInputRef = useRef('');
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const connectWebSocket = useCallback(() => {
    if (!projectId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws?projectId=${projectId}`;
    
    setIsConnecting(true);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setIsLoading(false);
        
        if (xtermRef.current) {
          xtermRef.current.writeln('\x1b[1;32m✓ Connected to terminal server\x1b[0m');
          xtermRef.current.write('\x1b[1;36muser@e-code\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ');
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      ws.onmessage = (event) => {
        if (!xtermRef.current) return;
        
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'output':
              xtermRef.current.write(message.data);
              break;
            case 'error':
              xtermRef.current.write(`\x1b[1;31m${message.data}\x1b[0m`);
              break;
            case 'exit':
              xtermRef.current.writeln(`\r\n\x1b[90mProcess exited with code ${message.code}\x1b[0m`);
              xtermRef.current.write('\x1b[1;36muser@e-code\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ');
              break;
            default:
              xtermRef.current.write(message.data || event.data);
          }
        } catch { /* Raw terminal data - expected when message is not JSON */
          xtermRef.current.write(event.data);
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        
        if (xtermRef.current) {
          xtermRef.current.writeln('\r\n\x1b[1;33m⚠ Connection closed. Reconnecting...\x1b[0m');
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connectWebSocket();
          }
        }, 3000);
      };
      
      ws.onerror = () => {
        setIsConnecting(false);
        if (xtermRef.current) {
          xtermRef.current.writeln('\r\n\x1b[1;31m✗ Connection error\x1b[0m');
        }
      };
    } catch (error) {
      setIsConnecting(false);
      console.error('[Terminal] WebSocket connection error:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      theme: {
        background: 'var(--ecode-terminal-bg)',
        foreground: 'var(--ecode-terminal-text)',
        cursor: 'var(--ecode-accent)',
        cursorAccent: 'var(--ecode-terminal-bg)',
        selectionBackground: 'var(--ecode-border)',
        black: '#0e1525',
        red: '#9da2a6',
        green: '#0079f2',
        yellow: '#9da2a6',
        blue: '#0079f2',
        magenta: '#5c6670',
        cyan: '#9da2a6',
        white: '#ffffff',
        brightBlack: '#3d4452',
        brightRed: '#9da2a6',
        brightGreen: '#0079f2',
        brightYellow: '#d4d8dd',
        brightBlue: '#0079f2',
        brightMagenta: '#9da2a6',
        brightCyan: '#d4d8dd',
        brightWhite: '#ffffff'
      },
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
      allowTransparency: false
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;32m╭─────────────────────────────────────────╮\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m \x1b[1;36mE-Code Terminal\x1b[0m                       \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m│\x1b[0m \x1b[90mConnecting to workspace...\x1b[0m            \x1b[1;32m│\x1b[0m');
    term.writeln('\x1b[1;32m╰─────────────────────────────────────────╯\x1b[0m');
    term.writeln('');

    term.onData((data) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      if (data === '\x1b[A') {
        if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
          historyIndexRef.current++;
          const command = commandHistoryRef.current[commandHistoryRef.current.length - 1 - historyIndexRef.current];
          if (command) {
            term.write('\x1b[2K\r\x1b[1;36muser@e-code\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ' + command);
            currentInputRef.current = command;
          }
        }
        return;
      }

      if (data === '\x1b[B') {
        if (historyIndexRef.current >= 0) {
          historyIndexRef.current--;
          const command = historyIndexRef.current >= 0 
            ? commandHistoryRef.current[commandHistoryRef.current.length - 1 - historyIndexRef.current] 
            : '';
          term.write('\x1b[2K\r\x1b[1;36muser@e-code\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ' + command);
          currentInputRef.current = command;
        }
        return;
      }

      if (data === '\r') {
        if (currentInputRef.current.trim()) {
          commandHistoryRef.current = [...commandHistoryRef.current.slice(-99), currentInputRef.current.trim()];
        }
        currentInputRef.current = '';
        historyIndexRef.current = -1;
      } else if (data === '\x7f') {
        currentInputRef.current = currentInputRef.current.slice(0, -1);
      } else if (data.charCodeAt(0) >= 32) {
        currentInputRef.current += data;
      }

      wsRef.current.send(JSON.stringify({
        type: 'input',
        data: data
      }));
    });

    connectWebSocket();
    
    setTimeout(() => setIsLoading(false), 1500);

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        
        if (wsRef.current?.readyState === WebSocket.OPEN && xtermRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      term.dispose();
    };
  }, [connectWebSocket]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[1;36muser@e-code\x1b[0m:\x1b[1;34m~/workspace\x1b[0m$ ');
    }
  };

  const handleReset = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (xtermRef.current) {
      xtermRef.current.reset();
      xtermRef.current.writeln('\x1b[1;32m╭─────────────────────────────────────────╮\x1b[0m');
      xtermRef.current.writeln('\x1b[1;32m│\x1b[0m \x1b[1;36mE-Code Terminal\x1b[0m                       \x1b[1;32m│\x1b[0m');
      xtermRef.current.writeln('\x1b[1;32m│\x1b[0m \x1b[90mReconnecting...\x1b[0m                       \x1b[1;32m│\x1b[0m');
      xtermRef.current.writeln('\x1b[1;32m╰─────────────────────────────────────────╯\x1b[0m');
      xtermRef.current.writeln('');
    }
    
    setTimeout(connectWebSocket, 500);
  };

  const handleCopy = () => {
    if (xtermRef.current) {
      const selection = xtermRef.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
        toast({
          title: 'Copied',
          description: 'Selection copied to clipboard'
        });
      }
    }
  };

  return (
    <div 
      className={cn(
        "h-full flex flex-col bg-background",
        isFullscreen && "fixed inset-0 z-50",
        className
      )} 
      data-testid="replit-terminal-panel"
    >
      <div className="min-h-[48px] p-3 flex items-center justify-between bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-[18px] h-[18px] text-muted-foreground" />
            <span className="text-[17px] font-medium leading-tight text-foreground">Shell</span>
          </div>
          
          <ConnectionBadge isConnecting={isConnecting} isConnected={isConnected} />
          
          <TerminalMetricsIndicator compact data-testid="replit-terminal-panel-metrics" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={handleCopy}
            data-testid="button-terminal-copy"
          >
            <Copy className="w-[18px] h-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={handleClear}
            data-testid="button-terminal-clear"
          >
            <X className="w-[18px] h-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={handleReset}
            data-testid="button-terminal-reset"
          >
            <RotateCcw className="w-[18px] h-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-terminal-fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-[18px] h-[18px]" />
            ) : (
              <Maximize2 className="w-[18px] h-[18px]" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            data-testid="button-terminal-new"
          >
            <Plus className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 p-3 bg-background flex flex-col gap-2">
            <ShimmerSkeleton className="h-4 w-3/4 rounded" />
            <ShimmerSkeleton className="h-4 w-1/2 rounded" />
            <ShimmerSkeleton className="h-4 w-2/3 rounded" />
            <ShimmerSkeleton className="h-4 w-1/3 rounded" />
          </div>
        )}
        <div
          ref={terminalRef}
          className={cn(
            "h-full p-3 bg-[var(--ecode-terminal-bg)]",
            isLoading && "opacity-0"
          )}
          data-testid="terminal-container"
        />
      </div>
    </div>
  );
}
