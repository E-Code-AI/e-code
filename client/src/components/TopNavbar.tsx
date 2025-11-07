import { useMemo, useState } from "react";
import { Project, File } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  Play,
  Square,
  MoreVertical,
  ChevronDown,
  Globe,
  Terminal,
  Search,
  Bell,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TopNavbarProps {
  project: Project | undefined;
  activeFile: File | undefined;
  isLoading: boolean;
  onNixConfigOpen?: () => void;
  onCommandPaletteOpen?: () => void;
  onKeyboardShortcutsOpen?: () => void;
  onDatabaseOpen?: () => void;
  onCollaborationOpen?: () => void;
  onToggleFiles?: () => void;
  onTogglePreview?: () => void;
  onToggleConsole?: () => void;
  filesOpen?: boolean;
  previewOpen?: boolean;
  consoleOpen?: boolean;
  onSidebarMenuToggle?: () => void;
}

const TopNavbar = ({
  project,
  activeFile,
  isLoading,
  onNixConfigOpen,
  onCommandPaletteOpen,
  onKeyboardShortcutsOpen,
  onDatabaseOpen,
  onCollaborationOpen,
  onToggleFiles,
  onTogglePreview,
  onToggleConsole,
  filesOpen = true,
  previewOpen = true,
  consoleOpen = true,
  onSidebarMenuToggle
}: TopNavbarProps) => {
  const { user, logoutMutation } = useAuth();
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    window.dispatchEvent(new CustomEvent("run-project"));
    setTimeout(() => {
      setIsRunning(false);
    }, 2000);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const projectTitle = isLoading ? "Loading..." : project?.name || "Untitled Project";

  return (
    <div className="h-9 border-b border-[#e1e4e8] bg-white flex items-center justify-between px-2">
      {/* Left Section - Just Project Name */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          {projectTitle}
        </span>
      </div>

      {/* Center Section - Empty */}
      <div className="flex-1" />

      {/* Right Section - Actions */}
      <div className="flex items-center gap-1">
        {/* Run Button */}
        {isRunning ? (
          <Button
            size="sm"
            onClick={handleStop}
            className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded"
          >
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleRun}
            className="h-7 px-3 bg-[#2ea043] hover:bg-[#268838] text-white text-xs font-medium rounded"
          >
            <Play className="h-3 w-3 mr-1" />
            Run
          </Button>
        )}

        {/* Invite Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs font-medium rounded border-gray-300"
        >
          Invite
        </Button>

        {/* Share Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs font-medium rounded border-gray-300"
        >
          Share
        </Button>

        {/* Three Dots Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onCommandPaletteOpen}>
              Command Palette
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onKeyboardShortcutsOpen}>
              Keyboard Shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDatabaseOpen}>
              Database
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onNixConfigOpen}>
              Packages
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Publishing
            </DropdownMenuItem>
            <DropdownMenuItem>
              Git
            </DropdownMenuItem>
            <DropdownMenuItem>
              Secrets
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TopNavbar;