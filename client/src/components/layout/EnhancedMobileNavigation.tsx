import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Code, 
  Users, 
  User, 
  Search,
  Plus,
  Bell,
  Settings,
  FolderOpen,
  Terminal,
  Play,
  Zap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface EnhancedMobileNavigationProps {
  currentPath: string;
  isMobile: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  primary?: boolean;
}

export function EnhancedMobileNavigation({ currentPath, isMobile }: EnhancedMobileNavigationProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(3);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Handle keyboard visibility on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      
      // If viewport is significantly smaller, keyboard is likely open
      setIsKeyboardVisible(viewportHeight < windowHeight * 0.75);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport.removeEventListener('resize', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobile]);

  // Don't show navigation on desktop or when keyboard is visible
  if (!isMobile || isKeyboardVisible) {
    return null;
  }

  const mainNavItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="h-5 w-5" />,
      href: '/dashboard'
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderOpen className="h-5 w-5" />,
      href: '/projects'
    },
    {
      id: 'create',
      label: 'Create',
      icon: <Plus className="h-6 w-6" />,
      href: '/projects?action=new',
      primary: true
    },
    {
      id: 'community',
      label: 'Community',
      icon: <Users className="h-5 w-5" />,
      href: '/community'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="h-5 w-5" />,
      href: user ? `/@${user.username}` : '/account'
    }
  ];

  const quickActionItems: NavItem[] = [
    {
      id: 'search',
      label: 'Search',
      icon: <Search className="h-5 w-5" />,
      href: '/search'
    },
    {
      id: 'terminal',
      label: 'Terminal',
      icon: <Terminal className="h-5 w-5" />,
      href: '/terminal'
    },
    {
      id: 'deploy',
      label: 'Deploy',
      icon: <Play className="h-5 w-5" />,
      href: '/deployments'
    },
    {
      id: 'ai',
      label: 'AI',
      icon: <Zap className="h-5 w-5" />,
      href: '/ai-agent'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' && (currentPath === '/' || currentPath === '/dashboard')) {
      return true;
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const handleNavClick = (href: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    
    // Add haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    navigate(href);
  };

  return (
    <>
      {/* Quick Actions Bar - Top of screen */}
      <div className="fixed top-16 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-1">
            {quickActionItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-2 text-xs",
                  isActive(item.href) && "bg-primary/10 text-primary"
                )}
                onClick={() => handleNavClick(item.href)}
              >
                {item.icon}
                <span className="ml-1 hidden xs:inline">{item.label}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              onClick={() => handleNavClick('/notifications')}
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Badge>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleNavClick('/settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - Bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
        {/* Safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]">
          <nav className="flex items-center justify-around h-16 px-2">
            {mainNavItems.map((item) => {
              const active = isActive(item.href);
              
              if (item.primary) {
                // Primary action button (Create)
                return (
                  <Button
                    key={item.id}
                    className={cn(
                      "h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg",
                      "hover:bg-primary/90 transition-all duration-200",
                      "active:scale-95"
                    )}
                    onClick={() => handleNavClick(item.href)}
                  >
                    {item.icon}
                  </Button>
                );
              }

              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "flex-1 h-full flex flex-col items-center justify-center gap-1 px-1",
                    "transition-colors duration-200",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                  onClick={() => handleNavClick(item.href)}
                >
                  <div className={cn(
                    "transition-transform duration-200",
                    active && "scale-110"
                  )}>
                    {item.icon}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    active && "text-primary"
                  )}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 right-2 h-4 w-4 p-0 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}