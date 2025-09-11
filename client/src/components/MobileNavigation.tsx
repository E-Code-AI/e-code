import { useLocation } from 'wouter';
import { Home, ChevronLeft, ChevronRight, Menu, SquareStack } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [location, navigate] = useLocation();

  const goBack = () => {
    window.history.back();
  };

  const goForward = () => {
    window.history.forward();
  };

  const goHome = () => {
    navigate('/projects');
  };

  return (
    <>
      {/* Safe area for mobile devices with gesture navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-transparent md:hidden z-50 safe-bottom"></div>
      
      {/* Enhanced mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)] h-16 flex items-center justify-between px-4 md:hidden z-40 safe-bottom">
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-xl touch-target text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
            onClick={goBack}
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-xl touch-target text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
            onClick={goForward}
            aria-label="Go forward"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-xl touch-target text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
            onClick={goHome}
            aria-label="Home"
          >
            <Home className="h-6 w-6" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-xl touch-target text-[var(--ecode-text-secondary)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)] relative"
            onClick={() => navigate('/projects')}
            aria-label="Projects"
          >
            <SquareStack className="h-6 w-6" />
            {/* Notification badge */}
            <span className="absolute -top-1 -right-1 bg-[var(--ecode-accent)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              3
            </span>
          </Button>
        </div>
      </div>
    </>
  );
}