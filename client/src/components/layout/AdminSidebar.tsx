import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Home, 
  Settings,
  Users,
  Activity,
  Brain,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminSidebar() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const adminMenuItems = [
    {
      name: "Dashboard",
      icon: Home,
      href: "/admin",
    },
    {
      name: "AI Models",
      icon: Brain,
      href: "/admin/ai-models",
    },
    {
      name: "Performance",
      icon: Activity,
      href: "/admin/performance",
    },
    {
      name: "Users",
      icon: Users,
      href: "/admin/users",
    },
    {
      name: "Settings",
      icon: Settings,
      href: "/admin/settings",
    },
  ];
  
  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r",
      isCollapsed ? "w-14" : "w-52"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && <h2 className="text-lg font-semibold">Admin</h2>}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-accent"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      
      <nav className="flex-1 p-2">
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Tooltip key={item.name} delayDuration={0} side="right">
              <TooltipTrigger asChild>
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Icon size={16} />
                  {!isCollapsed && item.name}
                </a>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent>
                  <p>{item.name}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}