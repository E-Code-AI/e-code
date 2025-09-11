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
      {/* Skip link for keyboard navigation - visible on focus */}
      <a 
        href="#main-content" 
        className="sr-only-focusable"
        aria-label="Skip to main content"
      >
        Skip to content
      </a>
      
      {/* Bottom border line */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-black md:hidden z-50" aria-hidden="true"></div>
      
      {/* Main mobile navigation */}
      <nav 
        className="fixed bottom-[1px] left-0 right-0 bg-green-400 border-t h-14 flex items-center justify-between px-6 md:hidden z-40"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="touch-target h-12 w-12 rounded-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            onClick={goBack}
            aria-label="Go back to previous page"
            type="button"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="touch-target h-12 w-12 rounded-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            onClick={goForward}
            aria-label="Go forward to next page"
            type="button"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="touch-target h-12 w-12 rounded-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            onClick={goHome}
            aria-label="Go to home page"
            type="button"
          >
            <Home className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="touch-target h-12 w-12 rounded-none relative focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            onClick={() => navigate('/projects')}
            aria-label="View projects (3 notifications)"
            type="button"
          >
            <SquareStack className="h-6 w-6" aria-hidden="true" />
            {/* Notification badge with proper accessibility */}
            <span 
              className="absolute top-2 right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
              aria-hidden="true"
            >
              3
            </span>
          </Button>
        </div>
      </nav>
    </>
  );
}