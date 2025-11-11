import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Terminal as TerminalIcon, X, Minimize2, Maximize2, RotateCcw, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";
import { toast } from "sonner@2.0.3";

interface TerminalRealProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  projectId?: string;
  shell?: string;
}

export interface TerminalHandle {
  addLog: (content: string, type?: "command" | "output" | "error" | "info" | "success") => void;
}

/**
 * Real terminal component using xterm.js
 * Connects to backend terminal service via WebSocket
 */
export const TerminalReal = forwardRef<TerminalHandle, TerminalRealProps>(
  ({ onClose, isCollapsed, onToggleCollapse, projectId: propsProjectId, shell = "sh" }, ref) => {
    const { session } = useAuth();
    const { currentProject } = useProject();
    const terminalRef = useRef<HTMLDivElement>(null);
    const [xtermInstance, setXtermInstance] = useState<any>(null);
    const [fitAddon, setFitAddon] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const projectId = propsProjectId || currentProject?.id || "default-project";

    // Dynamically load xterm.js
    useEffect(() => {
      const loadXterm = async () => {
        try {
          // @ts-ignore - Dynamic import
          const { Terminal } = await import("xterm");
          // @ts-ignore - Dynamic import
          const { FitAddon } = await import("xterm-addon-fit");
          // @ts-ignore - Dynamic import
          const { WebLinksAddon } = await import("xterm-addon-web-links");

          if (!terminalRef.current) return;

          // Create terminal instance
          const term = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
              background: "#1e1e1e",
              foreground: "#d4d4d4",
              cursor: "#d4d4d4",
              black: "#1e1e1e",
              red: "#f44747",
              green: "#4ec9b0",
              yellow: "#ffcc00",
              blue: "#0d7bbc",
              magenta: "#bc3fbc",
              cyan: "#4ec9b0",
              white: "#d4d4d4",
              brightBlack: "#6a6a6a",
              brightRed: "#f48771",
              brightGreen: "#89d185",
              brightYellow: "#f0df84",
              brightBlue: "#5cb3e0",
              brightMagenta: "#d670d6",
              brightCyan: "#89d185",
              brightWhite: "#ffffff",
            },
            rows: 24,
            cols: 80,
            scrollback: 1000,
          });

          // Create fit addon for responsive sizing
          const fit = new FitAddon();
          term.loadAddon(fit);
          setFitAddon(fit);

          // Create web links addon
          const webLinks = new WebLinksAddon();
          term.loadAddon(webLinks);

          // Open terminal in DOM
          term.open(terminalRef.current);
          fit.fit();
          setXtermInstance(term);

          // Welcome message
          term.writeln("\x1b[1;34mE-Code Terminal\x1b[0m");
          term.writeln("Connecting to terminal server...\n");
        } catch (err) {
          console.error("Failed to load xterm:", err);
          setError("Failed to load terminal library. Please refresh the page.");
        }
      };

      loadXterm();

      return () => {
        if (xtermInstance) {
          xtermInstance.dispose();
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }, []);

    // Handle window resize
    useEffect(() => {
      if (!fitAddon || !xtermInstance) return;

      const handleResize = () => {
        try {
          fitAddon.fit();
          if (wsRef.current?.readyState === WebSocket.OPEN && xtermInstance) {
            wsRef.current.send(
              JSON.stringify({
                type: "resize",
                cols: xtermInstance.cols,
                rows: xtermInstance.rows,
              })
            );
          }
        } catch (err) {
          console.error("Resize error:", err);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [fitAddon, xtermInstance]);

    // Connect to terminal backend
    useEffect(() => {
      if (!session?.access_token || !xtermInstance || isConnecting) return;

      const connectTerminal = async () => {
        setIsConnecting(true);
        setError(null);

        try {
          // Create terminal session
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const response = await fetch(
            `${supabaseUrl}/functions/v1/make-server-d5e2ec87/terminal/create`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ projectId, shell }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to create terminal session");
          }

          const data = await response.json();
          setSessionId(data.sessionId);

          // Connect WebSocket
          const wsProtocol = supabaseUrl.startsWith("https") ? "wss" : "ws";
          const wsHost = supabaseUrl.replace("https://", "").replace("http://", "");
          const wsUrl = `${wsProtocol}://${wsHost}/functions/v1/make-server-d5e2ec87/terminal/ws/${data.sessionId}`;
          
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            setIsConnected(true);
            setIsConnecting(false);
            xtermInstance.writeln("\x1b[1;32m✓ Connected\x1b[0m\n");
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              
              if (message.type === "output") {
                xtermInstance.write(message.data);
              } else if (message.type === "error") {
                xtermInstance.write(`\x1b[1;31m${message.data}\x1b[0m`);
              } else if (message.type === "exit") {
                xtermInstance.writeln(
                  `\n\x1b[1;33mProcess exited with code ${message.code}\x1b[0m`
                );
                setIsConnected(false);
              }
            } catch (e) {
              console.error("Failed to parse WebSocket message:", e);
            }
          };

          ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            xtermInstance.writeln("\n\x1b[1;31m✗ Connection error\x1b[0m");
            setIsConnected(false);
            setIsConnecting(false);
            setError("WebSocket connection failed");
          };

          ws.onclose = () => {
            setIsConnected(false);
            setIsConnecting(false);
            xtermInstance.writeln("\n\x1b[1;33m✗ Connection closed\x1b[0m");
          };

          // Handle terminal input
          xtermInstance.onData((data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "input",
                  data,
                })
              );
            }
          });
        } catch (error: any) {
          console.error("Failed to connect terminal:", error);
          xtermInstance.writeln(
            `\n\x1b[1;31m✗ Failed to connect: ${error.message}\x1b[0m`
          );
          setIsConnecting(false);
          setError(error.message);
          toast.error(`Terminal connection failed: ${error.message}`);
        }
      };

      connectTerminal();

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }, [session?.access_token, projectId, shell, xtermInstance, isConnecting]);

    // Expose addLog method via ref (for backwards compatibility)
    useImperativeHandle(ref, () => ({
      addLog: (content: string, type: "command" | "output" | "error" | "info" | "success" = "info") => {
        if (!xtermInstance) return;
        
        let colorCode = "";
        switch (type) {
          case "command":
            colorCode = "\x1b[1;32m"; // Green
            break;
          case "error":
            colorCode = "\x1b[1;31m"; // Red
            break;
          case "info":
            colorCode = "\x1b[1;34m"; // Blue
            break;
          case "success":
            colorCode = "\x1b[1;32m"; // Green
            break;
          default:
            colorCode = "\x1b[0m"; // Default
        }
        xtermInstance.writeln(`${colorCode}${content}\x1b[0m`);
      },
    }));

    const handleClear = () => {
      if (xtermInstance) {
        xtermInstance.clear();
        toast.success("Terminal cleared");
      }
    };

    const handleReconnect = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
      
      // Will trigger reconnection via useEffect
      setTimeout(() => {
        if (xtermInstance) {
          xtermInstance.writeln("\nReconnecting...");
        }
      }, 100);
    };

    return (
      <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3e3e42]">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4" />
            <span className="text-sm">Terminal ({shell})</span>
            {isConnecting && (
              <span className="text-xs text-yellow-400 animate-pulse">Connecting...</span>
            )}
            {isConnected && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                Connected
              </span>
            )}
            {!isConnected && !isConnecting && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>
                Disconnected
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-[#3e3e42]"
              onClick={handleClear}
              title="Clear terminal"
              disabled={!xtermInstance}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            {!isConnected && !isConnecting && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[#3e3e42]"
                onClick={handleReconnect}
                title="Reconnect"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[#3e3e42]"
                onClick={onToggleCollapse}
              >
                {isCollapsed ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-[#3e3e42]"
                onClick={onClose}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 bg-red-900/20 border-b border-red-900/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Terminal Content */}
        <div
          ref={terminalRef}
          className="flex-1 p-2 overflow-hidden"
          style={{ height: "100%" }}
        />
      </div>
    );
  }
);

TerminalReal.displayName = "TerminalReal";
