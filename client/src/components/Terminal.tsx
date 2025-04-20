import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Maximize2,
  Minimize2,
  X,
  Terminal as TerminalIcon,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Terminal as XtermTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { Project } from "@shared/schema";
import "xterm/css/xterm.css";

interface TerminalProps {
  project: Project | undefined;
  minimized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

export function Terminal({ project, minimized, onMinimize, onMaximize, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XtermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [output, setOutput] = useState<string[]>([]);

  // Terminal initialization
  useEffect(() => {
    if (!terminalRef.current || !project || minimized) return;

    // Clear any existing terminal
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }

    // Initialize XTerm
    const term = new XtermTerminal({
      cursorBlink: true,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        brightBlack: '#666666',
        red: '#e06c75',
        brightRed: '#e06c75',
        green: '#98c379',
        brightGreen: '#98c379',
        yellow: '#e5c07b',
        brightYellow: '#e5c07b',
        blue: '#61afef',
        brightBlue: '#61afef',
        magenta: '#c678dd',
        brightMagenta: '#c678dd',
        cyan: '#56b6c2',
        brightCyan: '#56b6c2',
        white: '#d4d4d4',
        brightWhite: '#ffffff'
      }
    });

    // Create and attach addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    // Store refs for later use
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Render the terminal to the container
    term.open(terminalRef.current);
    fitAddon.fit();

    // Initial welcome message
    term.writeln('\x1b[1;32m# Terminal initialized for project: ' + project.name + '\x1b[0m');
    term.writeln('Type commands to interact with your application.');
    term.writeln('');
    
    // Connect to WebSocket for terminal sessions
    connectWebSocket(project.id);

    // Resize handler
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [project, minimized]);

  // Handle terminal resize on maximized state change
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isMaximized]);

  // Connect to terminal WebSocket
  const connectWebSocket = (projectId: number) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/terminal`;
    
    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      socket.onopen = () => {
        setIsConnected(true);
        // Send initial connection message with project ID
        socket.send(JSON.stringify({
          type: 'connect',
          projectId: projectId
        }));
        
        if (xtermRef.current) {
          xtermRef.current.writeln('\x1b[32mConnected to terminal server\x1b[0m');
        }
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'output' && xtermRef.current) {
            xtermRef.current.write(data.content);
            setOutput(prev => [...prev, data.content]);
          }
        } catch (err) {
          if (xtermRef.current) {
            xtermRef.current.write(event.data);
          }
        }
      };
      
      socket.onclose = () => {
        setIsConnected(false);
        if (xtermRef.current) {
          xtermRef.current.writeln('\x1b[31mDisconnected from terminal server\x1b[0m');
        }
      };
      
      socket.onerror = (error) => {
        console.error('Terminal WebSocket error:', error);
        if (xtermRef.current) {
          xtermRef.current.writeln('\x1b[31mError connecting to terminal server\x1b[0m');
        }
      };
      
      // Handle user input
      if (xtermRef.current) {
        xtermRef.current.onData((data) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'input',
              content: data,
              projectId: projectId
            }));
          }
        });
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  // Toggle maximized state
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    if (!isMaximized) {
      onMaximize();
    } else {
      onMinimize();
    }
  };

  if (minimized) {
    return (
      <Button 
        variant="outline" 
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4"
        onClick={onMinimize}
      >
        <TerminalIcon className="h-4 w-4" />
        <span>Terminal</span>
      </Button>
    );
  }

  return (
    <div 
      className={cn(
        "fixed bottom-0 right-0 z-50 bg-card border shadow-lg transition-all duration-200 overflow-hidden",
        isMaximized 
          ? "w-full h-full left-0 top-0 rounded-none" 
          : "w-2/3 h-2/5 max-h-80 mx-4 mb-4 rounded-md"
      )}
    >
      <div className="flex items-center justify-between bg-muted py-2 px-3 border-b">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="font-medium">{project?.name || 'Terminal'}</span>
          {isConnected && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMinimize} title="Minimize">
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleMaximize} title="Maximize">
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} title="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={terminalRef} 
        className="h-full w-full overflow-hidden p-2"
      />
    </div>
  );
}