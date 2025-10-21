// @ts-nocheck
import { useMemo, useState } from "react";
import { Project, File } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  Bell,
  Settings,
  Share2,
  Play,
  Save,
  Database,
  Rocket,
  Package,
  Command,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  Terminal,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DeploymentManager } from "@/components/DeploymentManager";
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
}: TopNavbarProps) => {
  const { user, logoutMutation } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isDeploymentOpen, setIsDeploymentOpen] = useState(false);

  const runLabel = useMemo(() => (isRunning ? "Running" : "Run"), [isRunning]);

  const handleRun = () => {
    setIsRunning(true);

    setTimeout(() => {
      setIsRunning(false);
    }, 2000);
  };

  const handleSave = () => {
    // Save functionality would be implemented here
  };

  const handleOpenDeployment = () => {
    setIsDeploymentOpen(true);
  };

  const handleCloseDeployment = () => {
    setIsDeploymentOpen(false);
  };

  const projectTitle = isLoading ? "Loading..." : project?.name || "Untitled Project";
  const activeFileTitle = activeFile?.name || "No file selected";

  return (
    <>
      {project && (
        <DeploymentManager project={project} isOpen={isDeploymentOpen} onClose={handleCloseDeployment} />
      )}

      <div className="h-14 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)]/95 backdrop-blur-sm flex items-center justify-between px-4 shadow-[0_1px_0_rgba(12,18,32,0.05)]">
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleFiles}
                  disabled={!onToggleFiles}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  {filesOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{filesOpen ? "Hide files" : "Show files"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex flex-col leading-tight">
            <h1 className="font-semibold text-sm text-[var(--ecode-text)]">{projectTitle}</h1>
            <span className="text-xs text-[var(--ecode-text-muted)]">{activeFileTitle}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onCommandPaletteOpen}
            className="hidden sm:flex items-center h-8 gap-1 text-xs text-muted-foreground px-2"
          >
            <Command className="h-3.5 w-3.5" />
            <span>Ctrl+K</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="h-9 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-sm"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span className="ml-2 text-sm font-medium">{runLabel}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Run</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleSave} className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]">
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDatabaseOpen}
                  disabled={!project || !onDatabaseOpen}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  <Database className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Database</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNixConfigOpen}
                  disabled={!project || !onNixConfigOpen}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  <Package className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Nix Config</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onKeyboardShortcutsOpen}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  <Keyboard className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Keyboard Shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="hidden lg:flex items-center gap-1 pl-3 ml-3 border-l border-[var(--ecode-border)]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onTogglePreview}
                    disabled={!onTogglePreview}
                    className={cn(
                      "h-8 px-3 text-xs font-medium rounded-md transition-colors",
                      previewOpen
                        ? "bg-[var(--ecode-accent)]/12 text-[var(--ecode-accent)] border border-[var(--ecode-accent)]/40"
                        : "border border-transparent hover:bg-[var(--ecode-sidebar-hover)]"
                    )}
                  >
                    <Globe className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{previewOpen ? "Hide preview" : "Show preview"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleConsole}
                    disabled={!onToggleConsole}
                    className={cn(
                      "h-8 px-3 text-xs font-medium rounded-md transition-colors",
                      consoleOpen
                        ? "bg-[var(--ecode-accent)]/12 text-[var(--ecode-accent)] border border-[var(--ecode-accent)]/40"
                        : "border border-transparent hover:bg-[var(--ecode-sidebar-hover)]"
                    )}
                  >
                    <Terminal className="h-3.5 w-3.5 mr-1" />
                    Console
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{consoleOpen ? "Hide console" : "Show console"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCollaborationOpen}
                    disabled={!onCollaborationOpen}
                    className="h-8 px-3 text-xs font-medium rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    AI Agent
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open the AI agent panel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenDeployment}
                  disabled={!project}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  <Rocket className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Deploy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCollaborationOpen}
                  disabled={!project}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    window.location.href = "/support";
                  }}
                  className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]"
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-md hover:bg-[var(--ecode-sidebar-hover)]">
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || ""} alt={user?.username || ""} />
                  <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-red-500">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
};

export default TopNavbar;
