import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  MoreHorizontal,
  Home,
  Shield,
  Crown,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Bell,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { WorkspaceSettings } from '@/components/WorkspaceSettings';
import { AddTabMenu } from './AddTabMenu';
import { useTheme } from '@/components/ThemeProvider';
import { useLocation } from 'wouter';

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
  showCollaboration?: boolean;
  onToggleCollaboration?: () => void;
  collaboratorCount?: number;
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
  onToggleFileExplorer,
  showCollaboration,
  onToggleCollaboration,
  collaboratorCount = 0
}: TopNavBarProps) {
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, navigate] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  
  const handleLogout = async () => {
    logoutMutation.mutate();
    navigate('/login');
  };
  
  // Check if user is admin (using role field)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  
  return (
    <div className="h-12 border-b bg-background flex items-center px-3 gap-2 shadow-sm">
      {/* Main Menu Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 hover:bg-accent/80 transition-colors">
            <Menu className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuItem onClick={() => navigate('/dashboard')}>
            <Home className="w-4 h-4 mr-2" />
            Home
          </DropdownMenuItem>
          
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950"
                onClick={() => navigate('/admin')}
              >
                <Shield className="w-4 h-4 mr-2 text-blue-600" />
                <span className="font-medium">Admin Dashboard</span>
                <Badge 
                  variant="default"
                  className="ml-auto text-xs h-5"
                >
                  ADMIN
                </Badge>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Logo & Project Name */}
      <div className="flex items-center gap-2">
        <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">E-Code</span>
        
        {/* Project Name */}
        <span className="text-xs font-medium truncate max-w-[150px]">{projectName}</span>
      </div>
      
      {/* Tabs */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {tabs.slice(0, 8).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all duration-200",
                "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/40 dark:hover:to-purple-950/40 hover:shadow-sm",
                activeTab === tab.id 
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 shadow-sm" 
                  : "bg-transparent"
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />}
              <span className="max-w-[120px] truncate font-medium">{tab.label}</span>
              {tab.closable && (
                <X
                  className="h-3 w-3 opacity-70 hover:opacity-100 hover:text-destructive transition-all"
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
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
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
        
        {/* Enhanced Add Tab Menu */}
        {onAddTool && <AddTabMenu onAddTool={onAddTool} availableTools={availableTools} />}
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-1.5">
        {/* Collaboration Toggle */}
        {onToggleCollaboration && (
          <Button
            variant={showCollaboration ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleCollaboration}
            data-testid="button-toggle-collaboration"
            className={cn(
              "h-7 px-2 gap-1.5",
              showCollaboration && "bg-primary/10"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {collaboratorCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] font-medium">
                {collaboratorCount}
              </Badge>
            )}
          </Button>
        )}
        
        {/* File Explorer Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFileExplorer}
          data-testid="button-toggle-explorer"
          className="h-7 px-2"
        >
          <Menu className="h-3.5 w-3.5" />
        </Button>
        
        {/* Run/Stop Button */}
        <Button
          variant={isRunning ? "destructive" : "default"}
          size="sm"
          onClick={onRun}
          data-testid="button-run-stop"
          className={cn(
            "h-7 px-2.5 gap-1.5 text-xs transition-all shadow-sm",
            isRunning 
              ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700" 
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          )}
        >
          {isRunning ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Run</span>
            </>
          )}
        </Button>
        
        {/* Theme Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5">
              {theme === "light" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : theme === "dark" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Monitor className="h-3.5 w-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="w-4 h-4 mr-2" />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="w-4 h-4 mr-2" />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="w-4 h-4 mr-2" />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-full p-0"
              data-testid="button-user-menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
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
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
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
