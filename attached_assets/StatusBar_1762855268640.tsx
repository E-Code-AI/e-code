import { Keyboard, Zap, Cpu, Wifi, GitBranch, Loader2, Play } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface StatusBarProps {
  onShowShortcuts?: () => void;
  branchName?: string;
  isOnline?: boolean;
  isRunning?: boolean;
}

export function StatusBar({
  onShowShortcuts,
  branchName = "main",
  isOnline = true,
  isRunning = false,
}: StatusBarProps) {
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdSymbol = isMac ? "⌘" : "Ctrl";

  return (
    <div className="h-6 bg-[#007ACC] text-white text-xs flex items-center justify-between px-3 border-t border-[#005A9E]">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Git Branch */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
                <GitBranch className="w-3 h-3" />
                <span>{branchName}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current Git branch</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Connection Status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Wifi className={`w-3 h-3 ${isOnline ? "text-green-300" : "text-red-300"}`} />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Connection status</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Project Status */}
        {isRunning ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Running</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Project is running - Click Stop to halt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-yellow-300" />
                  <span>AI Ready</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>E-Code AI Agent is ready</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Center - Quick shortcuts hint */}
      <div className="flex items-center gap-3 text-[10px] opacity-70">
        <span>{cmdSymbol}+K for commands</span>
        <span>·</span>
        <span>{cmdSymbol}+P for files</span>
        <span>·</span>
        <span>{cmdSymbol}+/ for shortcuts</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Performance */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3 h-3" />
                <span>12% CPU</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>System performance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Keyboard Shortcuts */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onShowShortcuts}
                className="flex items-center gap-1.5 hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
              >
                <Keyboard className="w-3 h-3" />
                <span>Shortcuts</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View all keyboard shortcuts ({cmdSymbol}+/)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
