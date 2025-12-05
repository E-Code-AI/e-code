import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface ReplitTerminalPanelProps {
  projectId?: string | number;
  className?: string;
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
        } catch {
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
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#F26207',
        cursorAccent: '#F26207',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#e6edf3',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#39c5cf',
        brightWhite: '#f0f6fc'
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
    <div className={cn("h-full flex flex-col bg-background", className)} data-testid="replit-terminal-panel">
      <div className="h-10 px-3 flex items-center justify-between bg-muted border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Shell</span>
          
          {isConnecting ? (
            <Badge variant="outline" className="text-xs gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Connecting
            </Badge>
          ) : isConnected ? (
            <Badge variant="outline" className="text-xs gap-1 text-green-500 border-green-500/30">
              <Wifi className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 text-yellow-500 border-yellow-500/30">
              <WifiOff className="h-3 w-3" />
              Disconnected
            </Badge>
          )}
          
          <TerminalMetricsIndicator compact data-testid="replit-terminal-panel-metrics" />
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleCopy}
            data-testid="button-terminal-copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleClear}
            data-testid="button-terminal-clear"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleReset}
            data-testid="button-terminal-reset"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-terminal-fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent"
            data-testid="button-terminal-new"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        ref={terminalRef}
        className="flex-1 p-2 bg-[#0d1117]"
        data-testid="terminal-container"
      />
    </div>
  );
}
