import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ReplitHeader } from "./ReplitHeader";
import { ReplitSidebar } from "./ReplitSidebar";
import { EnhancedMobileNavigation } from "./EnhancedMobileNavigation";
import { ResponsiveBreakpointProvider } from "@/hooks/use-responsive";
import { cn } from "@/lib/utils";

interface ResponsiveLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  projectId?: number;
  className?: string;
  mobileOptimized?: boolean;
}

export function ResponsiveLayout({ 
  children, 
  showSidebar = true, 
  projectId,
  className = "",
  mobileOptimized = true
}: ResponsiveLayoutProps) {
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close sidebar when location changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location, isMobile]);

  // Handle mobile viewport height
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);

  const layoutClasses = cn(
    "h-screen flex flex-col bg-[var(--ecode-background)] overflow-hidden",
    "relative", // For mobile positioning
    isMobile && "min-h-[calc(var(--vh,1vh)*100)]", // Dynamic viewport height
    className
  );

  const mainClasses = cn(
    "flex-1 flex flex-col overflow-hidden",
    "transition-all duration-300 ease-in-out",
    isMobile && sidebarOpen && "transform translate-x-64",
    isTablet && "px-2"
  );

  const contentClasses = cn(
    "flex-1 overflow-auto",
    "relative",
    // Safe area handling for mobile
    isMobile && "pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
    // Touch optimization
    mobileOptimized && isMobile && "touch-pan-y"
  );

  return (
    <ResponsiveBreakpointProvider>
      <div className={layoutClasses}>
        {/* Header - always visible */}
        <ReplitHeader 
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          showMobileMenuButton={showSidebar && isMobile}
          isMobile={isMobile}
        />
        
        <div className="flex flex-1 overflow-hidden relative">
          {/* Sidebar - Desktop always visible, Mobile overlay */}
          {showSidebar && (
            <>
              {/* Desktop Sidebar */}
              <div className="hidden md:block">
                <ReplitSidebar projectId={projectId} />
              </div>
              
              {/* Mobile Sidebar Overlay */}
              {isMobile && (
                <>
                  {/* Backdrop */}
                  <div 
                    className={cn(
                      "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
                      sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  />
                  
                  {/* Sliding Sidebar */}
                  <div 
                    className={cn(
                      "fixed left-0 top-0 bottom-0 z-50 w-64 bg-background border-r border-border",
                      "transform transition-transform duration-300 ease-in-out",
                      sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                  >
                    <ReplitSidebar 
                      projectId={projectId} 
                      onItemClick={() => setSidebarOpen(false)}
                      isMobile={true}
                    />
                  </div>
                </>
              )}
            </>
          )}
          
          {/* Main Content */}
          <main className={mainClasses}>
            <div className={contentClasses}>
              {children}
            </div>
          </main>
        </div>
        
        {/* Enhanced Mobile Navigation */}
        {mobileOptimized && (
          <EnhancedMobileNavigation 
            currentPath={location}
            isMobile={isMobile}
          />
        )}
      </div>
    </ResponsiveBreakpointProvider>
  );
}