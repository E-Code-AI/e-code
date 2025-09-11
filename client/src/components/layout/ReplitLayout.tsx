import { ReactNode } from "react";
import { ReplitHeader } from "./ReplitHeader";
import { ReplitSidebar } from "./ReplitSidebar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, Code, Users, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-media-query";

interface ReplitLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  projectId?: number;
  className?: string;
}

export function ReplitLayout({ 
  children, 
  showSidebar = true, 
  projectId,
  className = ""
}: ReplitLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="h-screen flex flex-col bg-[var(--ecode-background)] overflow-hidden safe-area">
      <ReplitHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && !isMobile && (
          <div className="flex-shrink-0">
            <ReplitSidebar projectId={projectId} />
          </div>
        )}
        
        <main className={`flex-1 flex flex-col overflow-auto ${className}`}>
          {children}
        </main>
      </div>
      
      {/* Enhanced mobile bottom navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--ecode-surface)] border-t border-[var(--ecode-border)] z-50 safe-bottom">
          <nav className="flex items-center justify-around h-16 px-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 h-full px-1 touch-target flex-col gap-1 text-xs" 
              asChild
            >
              <Link href="/dashboard">
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 h-full px-1 touch-target flex-col gap-1 text-xs" 
              asChild
            >
              <Link href="/projects">
                <Code className="h-5 w-5" />
                <span>Projects</span>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 h-full px-1 touch-target flex-col gap-1 text-xs" 
              asChild
            >
              <Link href="/community">
                <Users className="h-5 w-5" />
                <span>Community</span>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-1 h-full px-1 touch-target flex-col gap-1 text-xs" 
              asChild
            >
              <Link href="/account">
                <User className="h-5 w-5" />
                <span>Account</span>
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}