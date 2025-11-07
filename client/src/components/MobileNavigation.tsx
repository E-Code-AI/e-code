import { useLocation } from 'wouter';
import { Home, Code2, Rocket, FolderOpen, Settings, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface MobileNavigationProps {
  projectId?: string;
  showNewProject?: boolean;
}

export function MobileNavigation({ projectId, showNewProject }: MobileNavigationProps) {
  const [location, navigate] = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);

  // Get current route to highlight active tab
  const isActive = (path: string) => {
    if (path === '/projects' && location === '/') return true;
    return location.startsWith(path);
  };

  // Fetch notifications count
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (notifications) {
      setNotificationCount(notifications.filter((n: any) => !n.read).length);
    }
  }, [notifications]);

  const navigationItems = [
    {
      path: '/projects',
      label: 'Projects',
      icon: FolderOpen,
      badge: notificationCount > 0 ? notificationCount : null,
    },
    {
      path: projectId ? `/editor/${projectId}` : null,
      label: 'Editor',
      icon: Code2,
      disabled: !projectId,
    },
    {
      path: projectId ? `/projects/${projectId}/deploy` : null,
      label: 'Deploy',
      icon: Rocket,
      disabled: !projectId,
    },
    {
      path: '/dashboard',
      label: 'Home',
      icon: Home,
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t h-16 flex items-center justify-around px-2 md:hidden z-40 safe-area-inset-bottom">
        {navigationItems.map((item) => {
          if (item.path === null) return null;
          const Icon = item.icon;
          const isCurrentActive = isActive(item.path || '');
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 flex flex-col items-center justify-center gap-1 relative",
                isCurrentActive && "text-[#F26207] bg-[#F26207]/10",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !item.disabled && item.path && navigate(item.path)}
              disabled={item.disabled}
              aria-label={item.label}
            >
              <Icon className={cn(
                "h-5 w-5",
                isCurrentActive && "text-[#F26207]"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isCurrentActive && "text-[#F26207]"
              )}>
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-1 right-1 bg-[#F26207] text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </Button>
          );
        })}
        
        {/* Floating Action Button for New Project */}
        {showNewProject && (
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-[#F26207] to-[#F99D25] hover:from-[#D04E00] hover:to-[#E88510] z-50"
            onClick={() => navigate('/projects/new')}
            aria-label="New Project"
          >
            <Plus className="h-6 w-6 text-white" />
          </Button>
        )}
      </div>
      
      {/* Add padding to the bottom of the page content to account for the navigation bar */}
      <div className="h-16 md:hidden" />
    </>
  );
}