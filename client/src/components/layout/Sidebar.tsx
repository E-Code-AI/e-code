import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  Code,
  FileCode,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={cn(
        "h-screen border-r bg-background flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b h-14">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-primary h-6 w-6 flex items-center justify-center text-primary-foreground font-bold">P</div>
            <span className="font-bold">PLOT</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn("h-8 w-8", isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <ChevronRight /> : <Menu />}
        </Button>
      </div>

      {/* Main navigation */}
      <div className="flex-1 overflow-y-auto pt-2 px-2">
        {/* Create new project button */}
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className={cn(
            "mb-3 gap-2 w-full justify-start",
            isCollapsed ? "p-2 justify-center" : "pl-3 pr-8"
          )}
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span>New Project</span>}
        </Button>

        <div className="space-y-1">
          <NavigationItem
            icon={<Home className="h-4 w-4" />}
            href="/"
            label="Home"
            isActive={location === '/'}
            isCollapsed={isCollapsed}
          />
          <NavigationItem
            icon={<Code className="h-4 w-4" />}
            href="/projects"
            label="Projects"
            isActive={location.startsWith('/project')}
            isCollapsed={isCollapsed}
          />
          <NavigationItem
            icon={<FileCode className="h-4 w-4" />}
            href="/templates"
            label="Templates"
            isActive={location.startsWith('/templates')}
            isCollapsed={isCollapsed}
          />
          <NavigationItem
            icon={<Settings className="h-4 w-4" />}
            href="/settings"
            label="Settings"
            isActive={location.startsWith('/settings')}
            isCollapsed={isCollapsed}
          />
        </div>
      </div>

      {/* User section */}
      <div className="border-t p-3">
        <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.username}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className={cn(isCollapsed && "h-8 w-8")}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface NavigationItemProps {
  icon: React.ReactNode;
  href: string;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavigationItem({ icon, href, label, isActive, isCollapsed }: NavigationItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center py-2 px-3 rounded-md text-sm group",
          isActive
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent/50 text-muted-foreground",
          isCollapsed && "justify-center px-2"
        )}
      >
        <span className="mr-3">{icon}</span>
        {!isCollapsed && <span>{label}</span>}
      </a>
    </Link>
  );
}