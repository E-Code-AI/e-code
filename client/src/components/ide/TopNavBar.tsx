import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Code, 
  Play, 
  Square, 
  Settings, 
  User, 
  LogOut, 
  Plus,
  X,
  Menu,
  Eye,
  FileCode,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { WorkspaceSettings } from '@/components/WorkspaceSettings';

interface Tab {
  id: string;
  label: string;
  icon?: any;
  closable?: boolean;
}

interface AvailableTool {
  id: string;
  label: string;
  icon: string;
}

interface TopNavBarProps {
  projectName: string;
  projectSlug: string;
  ownerUsername: string;
  isDeployed: boolean;
  onRun: () => void;
  isRunning: boolean;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddTab?: () => void;
  availableTools?: AvailableTool[];
  onAddTool?: (toolId: string) => void;
  showFileExplorer: boolean;
  onToggleFileExplorer: () => void;
}

export function TopNavBar({
  projectName,
  projectSlug,
  ownerUsername,
  isDeployed,
  onRun,
  isRunning,
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onAddTab,
  availableTools,
  onAddTool,
  showFileExplorer,
  onToggleFileExplorer
}: TopNavBarProps) {
  const { user, logoutMutation } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  
  const handleLogout = async () => {
    logoutMutation.mutate();
    window.location.href = '/login';
  };
  
  return (
    <div className="h-12 border-b bg-background flex items-center px-4 gap-4">
      {/* Logo & Project Name */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-primary rounded">
          <Code className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{projectName}</span>
          <span className="text-xs text-muted-foreground">
            @{ownerUsername}/{projectSlug}
          </span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {tabs.slice(0, 8).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                "hover:bg-accent",
                activeTab === tab.id ? "bg-accent" : "bg-transparent"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span className="max-w-[120px] truncate">{tab.label}</span>
              {tab.closable && (
                <X
                  className="h-3 w-3 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                />
              )}
            </button>
          );
        })}
        
        {/* More tabs indicator */}
        {tabs.length > 8 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {tabs.slice(8).map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                >
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* Add Tool/Tab Dropdown */}
        {availableTools && onAddTool ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-add-tab"
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Add Tool
              </div>
              <DropdownMenuSeparator />
              {availableTools.map((tool) => (
                <DropdownMenuItem
                  key={tool.id}
                  onClick={() => onAddTool(tool.id)}
                  className="gap-2"
                  data-testid={`add-tool-${tool.id}`}
                >
                  <span className="text-base">{tool.icon}</span>
                  <span>{tool.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTab}
            data-testid="button-add-tab"
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* File Explorer Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFileExplorer}
          data-testid="button-toggle-explorer"
        >
          <Menu className="h-4 w-4" />
        </Button>
        
        {/* Run/Stop Button */}
        <Button
          variant={isRunning ? "destructive" : "default"}
          size="sm"
          onClick={onRun}
          data-testid="button-run-stop"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Square className="h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run
            </>
          )}
        </Button>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full p-0"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              <span>{user?.username || 'User'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>User Settings</DialogTitle>
          </DialogHeader>
          <WorkspaceSettings />
        </DialogContent>
      </Dialog>
    </div>
  );
}
