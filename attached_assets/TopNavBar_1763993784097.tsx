import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { 
  Play, 
  Search, 
  UserCircle, 
  Smartphone, 
  ExternalLink,
  History,
  RotateCcw,
  PanelRightOpen,
  HelpCircle,
  Users,
  Gift,
  Globe,
  Menu,
  Home,
  User,
  Bell,
  UsersRound,
  Terminal,
  Palette,
  Sun,
  Moon,
  ChevronRight,
  LogOut,
  ChevronDown,
  Plus,
  Loader2,
  Square,
  Circle,
  Radio,
  AlertCircle,
  Shield,
  Crown,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { DraggableTab } from "./DraggableTab";
import { AddTabMenu } from "./AddTabMenu";
import { ProjectURLs } from "./ProjectURLs";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AutoBackendReconnectIndicator } from "./AutoBackendReconnectIndicator";

interface Tab {
  id: string;
  label: string;
  icon?: any;
  closable?: boolean;
}

interface TopNavBarProps {
  projectName: string;
  projectSlug?: string;
  ownerUsername?: string;
  isDeployed?: boolean;
  onRun?: () => void;
  isRunning?: boolean;
  showFileExplorer?: boolean;
  onToggleFileExplorer?: () => void;
  onAddTab?: (toolId: string) => void;
  onShowGuide?: () => void;
  // Tab management
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onTabsReorder?: (tabs: Tab[]) => void;
  // Navigation & Auth
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  // File management
  files?: any[];
  onOpenFile?: (file: any) => void;
}

export function TopNavBar({ 
  projectName,
  projectSlug,
  ownerUsername,
  isDeployed = false,
  onRun, 
  isRunning = false, 
  showFileExplorer, 
  onToggleFileExplorer, 
  onAddTab, 
  onShowGuide,
  tabs = [],
  activeTab = "",
  onTabChange,
  onTabClose,
  onTabsReorder,
  onNavigate,
  onLogout,
  files,
  onOpenFile,
}: TopNavBarProps) {
  const { profile } = useAuth();
  const { theme, actualTheme, setTheme } = useTheme();
  const [multiplayersOpen, setMultiplayersOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [showMoreRecent, setShowMoreRecent] = useState(false);
  const [currentProject, setCurrentProject] = useState(projectName);
  const [deployStatus, setDeployStatus] = useState<"published" | "error" | "idle">("idle");
  
  // Check if user is admin or super_admin
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  
  // Debug log for admin status
  useEffect(() => {
    if (profile) {
      console.log('🔐 TopNavBar - User Profile:', {
        email: profile.email,
        role: profile.role,
        isAdmin,
        fullProfile: profile
      });
    }
  }, [profile, isAdmin]);
  
  // Sync currentProject with projectName prop
  useEffect(() => {
    setCurrentProject(projectName);
  }, [projectName]);

  const recentProjects = [
    { name: "Avi Ben Ezra", icon: "🌐" },
    { name: "VoltWatt", icon: "⚡" },
    { name: "LibreOffice", icon: "📄" },
  ];

  const availableProjects = [
    { name: "E-Code Platform", icon: "💻", lastModified: "2 hours ago" },
    { name: "Avi Ben Ezra", icon: "🌐", lastModified: "5 hours ago" },
    { name: "VoltWatt", icon: "⚡", lastModified: "1 day ago" },
    { name: "LibreOffice", icon: "📄", lastModified: "3 days ago" },
    { name: "Portfolio Website", icon: "🎨", lastModified: "1 week ago" },
  ];

  const moveTab = (dragIndex: number, hoverIndex: number) => {
    if (!onTabsReorder) return;
    
    const newTabs = [...tabs];
    const draggedTab = newTabs[dragIndex];
    
    // Remove the dragged tab from its original position
    newTabs.splice(dragIndex, 1);
    
    // Insert it at the new position
    newTabs.splice(hoverIndex, 0, draggedTab);
    
    // Update the tabs order
    onTabsReorder(newTabs);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-10 border-b bg-background flex items-center justify-between px-2 gap-2 shadow-sm">
        {/* Left Section - Menu, Logo, Run Button, History */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-1.5 hover:bg-accent/80 transition-colors">
                <Menu className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="start">
              {/* Home */}
              <DropdownMenuItem 
                className="py-2"
                onClick={() => onNavigate?.("/dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Recent Projects */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Recent
              </DropdownMenuLabel>
              {recentProjects.map((project, idx) => (
                <DropdownMenuItem key={idx} className="py-2">
                  <span className="w-4 h-4 mr-2 text-center">{project.icon}</span>
                  {project.name}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {/* Admin Dashboard - Only for admins */}
              {isAdmin && (
                <>
                  <DropdownMenuItem 
                    className="py-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950"
                    onClick={() => onNavigate?.("/admin")}
                  >
                    {profile?.role === 'super_admin' ? (
                      <Crown className="w-4 h-4 mr-2 text-purple-600" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2 text-blue-600" />
                    )}
                    <span className="font-medium">Admin Dashboard</span>
                    <Badge 
                      variant={profile?.role === 'super_admin' ? "destructive" : "default"}
                      className="ml-auto text-xs"
                    >
                      {profile?.role === 'super_admin' ? 'SUPER' : 'ADMIN'}
                    </Badge>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Account Section */}
              <div className="px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarFallback className="text-xs">HE</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">Account</span>
                </div>
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  <Plus className="w-3 h-3 mr-1" />
                  Core
                </Badge>
              </div>

              <DropdownMenuItem 
                className="py-2" 
                onClick={() => onNavigate?.("/profile")}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem className="py-2" onClick={() => toast.info("Notifications", { description: "You have 3 new notifications" })}>
                <Bell className="w-4 h-4 mr-2" />
                Notifications
                <Badge variant="destructive" className="ml-auto text-xs h-5 w-5 flex items-center justify-center p-0">
                  3
                </Badge>
              </DropdownMenuItem>

              <DropdownMenuItem className="py-2" onClick={() => toast.info("Create team", { description: "Team creation form would open here" })}>
                <UsersRound className="w-4 h-4 mr-2" />
                Create Team
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem className="py-2" onClick={() => toast.info("CLUI", { description: "Command-line interface would open here" })}>
                <Terminal className="w-4 h-4 mr-2" />
                CLUI
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem 
                className="py-2 text-destructive" 
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    toast.error("Logging out...", { description: "You will be redirected to login page" });
                  }
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-xs bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">E-Code</span>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className={`h-7 px-2 gap-1 transition-all shadow-sm text-xs ${
                    isRunning 
                      ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700" 
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  }`}
                  onClick={() => {
                    if (onRun) {
                      onRun();
                    } else {
                      toast.success(isRunning ? "Stopping project..." : "Running project...", { 
                        description: isRunning ? "Development server stopping" : "Your code is being executed" 
                      });
                    }
                  }}
                >
                  {isRunning ? (
                    <Square className="w-3 h-3 fill-current" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  <span className="text-xs">{isRunning ? "Stop" : "Run"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRunning ? "Stop Project (Ctrl/Cmd+Enter)" : "Run Project (Ctrl/Cmd+Enter)"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="h-4 w-px bg-border" />
          
          <Button variant="ghost" size="sm" className="h-7 px-1.5 hover:bg-accent/80 transition-colors" onClick={() => toast.info("History", { description: "Version history would open here" })}>
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-1.5 hover:bg-accent/80 transition-colors" onClick={() => toast.success("Reloading project...")}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          
          <div className="h-4 w-px bg-border" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 max-w-[150px] hover:bg-accent/80 transition-colors">
                <span className="text-xs truncate">{currentProject}</span>
                <ChevronDown className="w-3 h-3 opacity-50 transition-transform duration-200" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="start">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Switch Project
              </DropdownMenuLabel>
              {availableProjects.map((project, idx) => (
                <DropdownMenuItem 
                  key={idx} 
                  className="py-2 flex items-center justify-between"
                  onClick={() => setCurrentProject(project.name)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base">{project.icon}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground">{project.lastModified}</span>
                    </div>
                  </div>
                  {currentProject === project.name && (
                    <ChevronRight className="w-4 h-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Project URLs - Show only if we have the data */}
          {projectSlug && ownerUsername && (
            <ProjectURLs
              projectSlug={projectSlug}
              ownerUsername={ownerUsername}
              isDeployed={isDeployed}
            />
          )}

          <div className="h-4 w-px bg-border" />
        </div>

        {/* Center Section - Tabs */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {tabs.length === 1 && (
            <div className="flex items-center gap-2 px-2 py-0.5 text-xs text-muted-foreground bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-md flex-shrink-0">
              <span>💡 Tip: Click "+ Add Tab" to explore 21 features</span>
            </div>
          )}
          {tabs.map((tab, index) => (
            <DraggableTab
              key={tab.id}
              tab={tab}
              index={index}
              isActive={activeTab === tab.id}
              onTabChange={onTabChange || (() => {})}
              onTabClose={onTabClose}
              onMoveTab={moveTab}
            />
          ))}
          {onAddTab && (
            <div className="flex-shrink-0">
              <AddTabMenu 
                onAddTab={onAddTab} 
                files={files}
                onOpenFile={onOpenFile}
              />
            </div>
          )}
        </div>

        {/* Right Section - Actions (Optimized spacing) */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onShowGuide && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-1.5 hover:bg-accent/80 transition-colors"
                    onClick={onShowGuide}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show Guide</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="sm" className="h-7 px-1.5 hover:bg-accent/80 transition-colors">
            <Search className="w-3.5 h-3.5" />
          </Button>
          
          {/* Auto Backend Reconnect Indicator */}
          <AutoBackendReconnectIndicator />
          
          {/* Theme Switcher */}
          <ThemeSwitcher />
          
          <Popover open={multiplayersOpen} onOpenChange={setMultiplayersOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-1.5 hover:bg-accent/80 transition-colors">
                <Users className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h3 className="text-sm">Multiplayers</h3>
                
                <Input
                  placeholder="Invite via email or username"
                  value={inviteValue}
                  onChange={(e) => setInviteValue(e.target.value)}
                />

                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Gift className="w-4 h-4" />
                    Copy invite link
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Globe className="w-4 h-4" />
                    Make public
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Add a permission to invite your friends.
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 hover:bg-accent/80 transition-colors gap-1.5"
            onClick={() => {
              // Simulate deployment cycle for demo
              if (deployStatus === "idle" || deployStatus === "error") {
                setDeployStatus("published");
                toast.success("Successfully deployed!");
              } else {
                setDeployStatus("idle");
              }
            }}
          >
            {deployStatus === "published" && (
              <>
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                <span className="text-xs">Published</span>
              </>
            )}
            {deployStatus === "error" && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-red-500">Error</span>
              </>
            )}
            {deployStatus === "idle" && (
              <>
                <Radio className="w-3.5 h-3.5" />
                <span className="text-xs">Republish</span>
              </>
            )}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-1.5 hover:bg-accent/80 transition-colors"
                  onClick={() => {
                    window.open(window.location.href, '_blank');
                    toast.success("Opening in new tab...");
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open in new tab</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {!showFileExplorer && onToggleFileExplorer && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-1.5 hover:bg-accent/80 transition-colors"
                    onClick={onToggleFileExplorer}
                  >
                    <PanelRightOpen className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show File Explorer</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </DndProvider>
  );
}