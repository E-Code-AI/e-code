import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  Menu, X, Home, Code, Zap, Globe, Users, Database, Book, 
  Settings, User, HelpCircle, Crown, Plus, Search, FileCode,
  Terminal, GitBranch, Sparkles, Package, Shield, LogOut,
  ChevronRight, Heart, Star, Briefcase, GraduationCap, Workflow, HardDrive, BarChart3
} from 'lucide-react';

interface MobileMenuProps {
  onOpenSpotlight?: () => void;
}

export function MobileMenu({ onOpenSpotlight }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleNavigate = (path: string) => {
    // Close the menu immediately
    setOpen(false);
    // Navigate after a small delay to ensure smooth animation
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const handleLogout = () => {
    setOpen(false);
    setTimeout(() => {
      logoutMutation.mutate();
    }, 150);
  };

  const primaryLinks = [
    { icon: Plus, label: 'Create App', path: '/agent', action: 'create' },
    { icon: Code, label: 'Import code or design', path: '/github-import' },
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Globe, label: 'Apps', path: '/projects' },
    { icon: Package, label: 'Deployments', path: '/deployments' },
    { icon: BarChart3, label: 'Usage', path: '/usage', badge: 'Action required' },
    { icon: Users, label: 'Teams', path: '/teams' },
  ];

  const handlePrimaryLinkClick = (link: any) => {
    if (link.action === 'create') {
      // Close menu and navigate to projects with create action
      setOpen(false);
      setTimeout(() => {
        navigate('/projects');
        // Trigger create modal after navigation
        setTimeout(() => {
          const createButton = document.querySelector('[data-create-project]');
          if (createButton) {
            (createButton as HTMLElement).click();
          }
        }, 300);
      }, 150);
    } else {
      handleNavigate(link.path);
    }
  };



  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-10 w-10"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[300px] sm:w-[380px] p-0 bg-[var(--ecode-background)] border-[var(--ecode-border)]"
      >
        <SheetHeader className="px-6 py-4 border-b border-[var(--ecode-border)]">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-[var(--ecode-text)]">E-Code</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="px-6 py-4">
            {/* Search */}
            <Button
              variant="outline"
              className="w-full justify-start mb-4"
              onClick={() => {
                setOpen(false);
                onOpenSpotlight?.();
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Search or run a command...
            </Button>

            {/* User Info */}
            {user && (
              <>
                <div 
                  className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-[var(--ecode-surface)] cursor-pointer hover:bg-[var(--ecode-sidebar-hover)] transition-colors"
                  onClick={() => handleNavigate(`/@${user.username}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-[var(--ecode-accent)] text-white flex items-center justify-center font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--ecode-text)]">{user.displayName || user.username}</p>
                    <p className="text-sm text-[var(--ecode-text-secondary)]">{user.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
                </div>
                <Separator className="mb-4" />
              </>
            )}

            {/* Primary Navigation */}
            <div className="space-y-1 mb-6">
              {primaryLinks.map((link) => (
                <Button
                  key={link.label}
                  variant="ghost"
                  className="w-full justify-start relative"
                  onClick={() => handlePrimaryLinkClick(link)}
                >
                  <link.icon className="mr-3 h-4 w-4" />
                  {link.label}
                  {link.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 bg-orange-500 text-white rounded font-medium">
                      {link.badge}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Explore E-Code */}
            <div className="space-y-1 mb-6">
              <h3 className="text-xs font-semibold text-[var(--ecode-text-secondary)] uppercase tracking-wider mb-2">
                Explore E-Code
              </h3>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigate('/bounties')}
              >
                <Database className="mr-3 h-4 w-4" />
                Bounties
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigate('/templates')}
              >
                <Package className="mr-3 h-4 w-4" />
                Templates
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigate('/learn')}
              >
                <GraduationCap className="mr-3 h-4 w-4" />
                Learn
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigate('/docs')}
              >
                <Book className="mr-3 h-4 w-4" />
                Documentation
              </Button>
            </div>

            {/* Install E-Code on */}
            <div className="mt-auto pt-6 pb-4">
              <h3 className="text-xs font-semibold text-[var(--ecode-text-secondary)] uppercase tracking-wider mb-3">
                Install E-Code on
              </h3>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => window.open('https://apps.apple.com/app/e-code', '_blank')}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => window.open('https://play.google.com/store/apps/details?id=com.ecode', '_blank')}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => window.open('https://e-code.com/desktop', '_blank')}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M4 6H20V16H4M20 18C21.1 18 22 17.1 22 16V6C22 4.89 21.1 4 20 4H4C2.89 4 2 4.89 2 6V16C2 17.1 2.89 18 4 18H0V20H24V18H20Z" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => window.open('https://e-code.com/mobile', '_blank')}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z" />
                  </svg>
                </Button>
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Actions */}
            <div className="space-y-2">
              {!user ? (
                <Button
                  className="w-full"
                  onClick={() => handleNavigate('/auth')}
                >
                  Sign In
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-[var(--ecode-warning)] text-[var(--ecode-warning)]"
                    onClick={() => handleNavigate('/pricing')}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}