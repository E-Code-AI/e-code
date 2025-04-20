import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Maximize2, Minimize2, X, RefreshCw } from 'lucide-react';

interface TerminalProps {
  project: {
    id: number;
    [key: string]: any;
  };
  onClose?: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ 
  project, 
  onClose, 
  minimized = false,
  onMinimize,
  onMaximize
}) => {
  const projectId = project.id;
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<XTerm | null>(null);
  const [fitAddon, setFitAddon] = useState<FitAddon | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState('term1');

  // Create and set up terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#1a1b26',
        foreground: '#c0caf5',
        cursor: '#c0caf5',
        black: '#414868',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5'
      }
    });

    // Add FitAddon for terminal resizing
    const fit = new FitAddon();
    term.loadAddon(fit);
    setFitAddon(fit);

    // Add WebLinks addon for clickable links
    const webLinks = new WebLinksAddon();
    term.loadAddon(webLinks);

    // Open terminal
    term.open(terminalRef.current);
    fit.fit();
    setTerminal(term);

    // Cleanup on unmount
    return () => {
      term.dispose();
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (!terminal) return;

    const connectWebSocket = () => {
      // Close existing connection if any
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }

      // Create WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/terminal?projectId=${projectId}`;

      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        terminal.clear();
        terminal.writeln('\x1b[32mTerminal connected. Ready for input.\x1b[0m');
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (event.wasClean) {
          terminal.writeln('\x1b[33mTerminal connection closed.\x1b[0m');
        } else {
          terminal.writeln('\x1b[31mTerminal connection lost. Click "Reconnect" to try again.\x1b[0m');
          setError('Connection lost');
        }
      };

      ws.onerror = () => {
        setError('Connection error');
        terminal.writeln('\x1b[31mError connecting to terminal. Please try again later.\x1b[0m');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'output':
              terminal.write(data.data);
              break;
            case 'connected':
              terminal.writeln(`\x1b[34m${data.data}\x1b[0m`);
              break;
            case 'error':
              terminal.writeln(`\x1b[31mError: ${data.data}\x1b[0m`);
              setError(data.data);
              break;
            case 'exit':
              terminal.writeln(`\x1b[33m${data.data}\x1b[0m`);
              break;
            case 'started':
              terminal.writeln(`\x1b[32m${data.data}\x1b[0m`);
              break;
            case 'stopped':
              terminal.writeln(`\x1b[33m${data.data}\x1b[0m`);
              break;
            default:
              terminal.writeln(`\x1b[90mReceived: ${JSON.stringify(data)}\x1b[0m`);
          }
        } catch (error) {
          console.error('Failed to parse message:', event.data, error);
        }
      };

      // Send terminal input to server
      terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      // Handle terminal resize
      terminal.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });
    };

    connectWebSocket();
  }, [terminal, projectId]);

  // Handle window resize
  useEffect(() => {
    if (!fitAddon) return;

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.error('Failed to resize terminal:', error);
      }
    };

    window.addEventListener('resize', handleResize);
    
    // Initial fit
    setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [fitAddon, minimized]);

  // Handle reconnect
  const handleReconnect = () => {
    if (terminal) {
      terminal.clear();
      terminal.writeln('\x1b[33mReconnecting...\x1b[0m');
    }
    setError(null);
    
    // Close existing connection
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    // Wait a moment before reconnecting
    setTimeout(() => {
      // Trigger WebSocket effect again
      if (terminal) {
        terminal.clear();
        terminal.writeln('\x1b[33mConnecting to terminal...\x1b[0m');
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/terminal?projectId=${projectId}`;
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;
      
      // Set up event handlers again
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        if (terminal) {
          terminal.clear();
          terminal.writeln('\x1b[32mTerminal reconnected. Ready for input.\x1b[0m');
        }
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        setError('Connection lost');
        if (terminal) {
          terminal.writeln('\x1b[31mTerminal connection lost. Click "Reconnect" to try again.\x1b[0m');
        }
      };
      
      ws.onerror = () => {
        setError('Connection error');
        if (terminal) {
          terminal.writeln('\x1b[31mError connecting to terminal. Please try again later.\x1b[0m');
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (terminal) {
            switch (data.type) {
              case 'output':
                terminal.write(data.data);
                break;
              case 'connected':
                terminal.writeln(`\x1b[34m${data.data}\x1b[0m`);
                break;
              case 'error':
                terminal.writeln(`\x1b[31mError: ${data.data}\x1b[0m`);
                setError(data.data);
                break;
              case 'exit':
                terminal.writeln(`\x1b[33m${data.data}\x1b[0m`);
                break;
              case 'started':
                terminal.writeln(`\x1b[32m${data.data}\x1b[0m`);
                break;
              case 'stopped':
                terminal.writeln(`\x1b[33m${data.data}\x1b[0m`);
                break;
              default:
                terminal.writeln(`\x1b[90mReceived: ${JSON.stringify(data)}\x1b[0m`);
            }
          }
        } catch (error) {
          console.error('Failed to parse message:', event.data, error);
        }
      };
      
      // Send terminal input to server
      if (terminal) {
        terminal.onData((data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'input', data }));
          }
        });
        
        // Handle terminal resize
        terminal.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols, rows }));
          }
        });
      }
    }, 500);
  };
  
  return (
    <div className={`flex flex-col border rounded-md overflow-hidden shadow-md bg-[#1a1b26] ${
      !minimized ? 'h-72' : 'fixed bottom-4 right-4 w-80 h-10 z-50'
    }`}>
      <div className="flex items-center justify-between bg-slate-900 p-2 border-b">
        <Tabs value={activeTerm} onValueChange={setActiveTerm} className="w-full">
          <div className="flex justify-between items-center">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="term1" className="data-[state=active]:bg-slate-700">Terminal</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-1">
              {error && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleReconnect}
                  className="h-6 w-6 text-yellow-500 hover:text-yellow-400 hover:bg-slate-800"
                  title="Reconnect Terminal"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              
              {minimized && onMaximize && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onMaximize}
                  className="h-6 w-6 hover:bg-slate-800"
                  title="Maximize Terminal"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              
              {!minimized && onMinimize && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onMinimize}
                  className="h-6 w-6 hover:bg-slate-800"
                  title="Minimize Terminal"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
              
              {onClose && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="h-6 w-6 hover:bg-slate-800 hover:text-red-400"
                  title="Close Terminal"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <TabsContent value="term1" className="m-0 p-0">
            <div 
              ref={terminalRef} 
              className={`terminal-container ${
                minimized ? 'h-0' : 'h-[calc(288px-40px)]'
              }`} 
              style={{ padding: 0 }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Terminal;