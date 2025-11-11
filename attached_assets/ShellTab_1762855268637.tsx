import { TerminalReal, TerminalHandle } from "./TerminalReal";
import { Terminal } from "./Terminal";
import { Button } from "./ui/button";
import { Plus, Settings, Trash2, History } from "lucide-react";
import { useState, forwardRef, useImperativeHandle, useRef, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";

export interface ShellTabHandle {
  addLog: (content: string, type?: "command" | "output" | "error" | "info" | "success") => void;
}

export const ShellTab = forwardRef<ShellTabHandle, {}>((props, ref) => {
  const { session } = useAuth();
  const { currentProject } = useProject();
  const [terminals, setTerminals] = useState([
    { id: "term-1", name: "sh", shell: "sh", active: true, useReal: true },
  ]);
  const [activeTerminal, setActiveTerminal] = useState("term-1");
  const terminalRef = useRef<TerminalHandle>(null);

  const projectId = currentProject?.id || "default-project";

  // Expose addLog method via ref
  useImperativeHandle(ref, () => ({
    addLog: (content: string, type = "info" as const) => {
      terminalRef.current?.addLog(content, type);
    },
  }));

  const addTerminal = (shell: string, useReal: boolean = true) => {
    const newId = `term-${Date.now()}`;
    setTerminals([
      ...terminals.map(t => ({ ...t, active: false })),
      { id: newId, name: shell, shell, active: true, useReal }
    ]);
    setActiveTerminal(newId);
    toast.success(`New ${shell} terminal opened`);
  };

  const closeTerminal = (id: string) => {
    const filtered = terminals.filter(t => t.id !== id);
    setTerminals(filtered);
    if (activeTerminal === id && filtered.length > 0) {
      setActiveTerminal(filtered[0].id);
    }
    toast.info("Terminal closed");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Terminal Tabs Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {terminals.map((term) => (
            <div
              key={term.id}
              className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer ${
                activeTerminal === term.id
                  ? "bg-accent"
                  : "hover:bg-accent/50"
              }`}
              onClick={() => setActiveTerminal(term.id)}
            >
              <span className="text-sm">{term.name}</span>
              {terminals.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(term.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => addTerminal("sh", true)}>
                New Shell Terminal (Real)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addTerminal("bash", true)}>
                New Bash Terminal (Real)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addTerminal("zsh", true)}>
                New Zsh Terminal (Real)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addTerminal("bash", false)}>
                New Mock Terminal (Dev)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info("Terminal settings coming soon")}>
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        {terminals.map((term) => (
          <div
            key={term.id}
            className={`h-full ${activeTerminal === term.id ? "block" : "hidden"}`}
          >
            {term.useReal ? (
              <TerminalReal
                ref={activeTerminal === term.id ? terminalRef : null}
                projectId={projectId}
                shell={term.shell}
              />
            ) : (
              <Terminal ref={activeTerminal === term.id ? terminalRef : null} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

ShellTab.displayName = "ShellTab";
