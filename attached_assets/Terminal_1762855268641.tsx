import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Terminal as TerminalIcon, X, Minimize2, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface TerminalLine {
  id: string;
  type: "command" | "output" | "error" | "info" | "success";
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface TerminalHandle {
  addLog: (content: string, type?: TerminalLine["type"]) => void;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(({ onClose, isCollapsed, onToggleCollapse }, ref) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "1",
      type: "info",
      content: "E-Code Terminal v1.0.0",
      timestamp: new Date(),
    },
    {
      id: "2",
      type: "info",
      content: "Type 'help' for available commands",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose addLog method via ref
  useImperativeHandle(ref, () => ({
    addLog: (content: string, type: TerminalLine["type"] = "info") => {
      const newLine: TerminalLine = {
        id: Date.now().toString() + Math.random(),
        type,
        content,
        timestamp: new Date(),
      };
      setLines((prev) => [...prev, newLine]);
    },
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = (command: string) => {
    const trimmedCommand = command.trim();
    if (!trimmedCommand) return;

    // Add command to history
    setCommandHistory((prev) => [...prev, trimmedCommand]);
    setHistoryIndex(-1);

    // Add command to lines
    const commandLine: TerminalLine = {
      id: Date.now().toString(),
      type: "command",
      content: `$ ${trimmedCommand}`,
      timestamp: new Date(),
    };

    setLines((prev) => [...prev, commandLine]);

    // Execute command and add output
    setTimeout(() => {
      const output = processCommand(trimmedCommand);
      setLines((prev) => [...prev, ...output]);
    }, 100);

    setInput("");
  };

  const processCommand = (command: string): TerminalLine[] => {
    const parts = command.split(" ");
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case "help":
        return [
          {
            id: Date.now().toString(),
            type: "output",
            content: "Available commands:",
            timestamp: new Date(),
          },
          {
            id: (Date.now() + 1).toString(),
            type: "output",
            content: "  help      - Show this help message",
            timestamp: new Date(),
          },
          {
            id: (Date.now() + 2).toString(),
            type: "output",
            content: "  clear     - Clear terminal",
            timestamp: new Date(),
          },
          {
            id: (Date.now() + 3).toString(),
            type: "output",
            content: "  npm       - Run npm commands",
            timestamp: new Date(),
          },
          {
            id: (Date.now() + 4).toString(),
            type: "output",
            content: "  node      - Run node scripts",
            timestamp: new Date(),
          },
        ];
      
      case "clear":
        setLines([]);
        return [];
      
      case "npm":
        if (parts[1] === "install" || parts[1] === "i") {
          return [
            {
              id: Date.now().toString(),
              type: "output",
              content: `Installing ${parts.slice(2).join(" ") || "dependencies"}...`,
              timestamp: new Date(),
            },
            {
              id: (Date.now() + 1).toString(),
              type: "output",
              content: "✓ Installation complete",
              timestamp: new Date(),
            },
          ];
        }
        if (parts[1] === "run") {
          return [
            {
              id: Date.now().toString(),
              type: "output",
              content: `Running ${parts[2]}...`,
              timestamp: new Date(),
            },
            {
              id: (Date.now() + 1).toString(),
              type: "output",
              content: "Server started on port 3000",
              timestamp: new Date(),
            },
          ];
        }
        return [
          {
            id: Date.now().toString(),
            type: "error",
            content: `Unknown npm command: ${parts[1]}`,
            timestamp: new Date(),
          },
        ];
      
      case "node":
        return [
          {
            id: Date.now().toString(),
            type: "output",
            content: `Executing ${parts.slice(1).join(" ")}...`,
            timestamp: new Date(),
          },
        ];
      
      default:
        return [
          {
            id: Date.now().toString(),
            type: "error",
            content: `Command not found: ${cmd}`,
            timestamp: new Date(),
          },
        ];
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      executeCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = Math.min(commandHistory.length - 1, historyIndex + 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    }
  };

  const handleClear = () => {
    setLines([
      {
        id: "1",
        type: "info",
        content: "E-Code Terminal v1.0.0",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3e3e42]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4" />
          <span className="text-sm">Terminal</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-[#3e3e42]"
            onClick={handleClear}
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-[#3e3e42]"
              onClick={onToggleCollapse}
            >
              {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
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

      {/* Terminal Content */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1">
          {lines.map((line) => (
            <div
              key={line.id}
              className={
                line.type === "command"
                  ? "text-green-400"
                  : line.type === "error"
                  ? "text-red-400"
                  : line.type === "info"
                  ? "text-blue-400"
                  : line.type === "success"
                  ? "text-green-300"
                  : "text-gray-300"
              }
            >
              {line.content}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#252526] border-t border-[#3e3e42] font-mono text-sm">
        <span className="text-green-400">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-gray-100"
          placeholder="Type a command..."
          autoFocus
        />
      </div>
    </div>
  );
});

Terminal.displayName = "Terminal";
