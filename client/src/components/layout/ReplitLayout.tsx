import { ReactNode } from "react";
import { ReplitHeader } from "./ReplitHeader";
import { ReplitSidebar } from "./ReplitSidebar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, Code, Users, User } from "lucide-react";

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
    <div className="min-h-screen flex flex-col bg-background text-foreground safe-area">
      <ReplitHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && !isMobile && (
          <div className="hidden md:block">
            <ReplitSidebar projectId={projectId} />
          </div>
        )}
        
        <main className={`flex-1 flex flex-col overflow-auto px-responsive py-responsive ${className}`}>
          {children}
        </main>
      </div>
      
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
          <nav className="flex items-center justify-around h-14 px-responsive py-2">
            <Button variant="ghost" size="sm" className="flex-1 h-full px-2 touch-target" asChild>
              <Link href="/dashboard">
                <div className="flex flex-col items-center gap-1">
                  <Home className="h-4 w-4" />
                  <span className="text-[10px]">Home</span>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 h-full px-2 touch-target" asChild>
              <Link href="/projects">
                <div className="flex flex-col items-center gap-1">
                  <Code className="h-4 w-4" />
                  <span className="text-[10px]">Projects</span>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 h-full px-2 touch-target" asChild>
              <Link href="/community">
                <div className="flex flex-col items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="text-[10px]">Community</span>
                </div>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 h-full px-2 touch-target" asChild>
              <Link href="/account">
                <div className="flex flex-col items-center gap-1">
                  <User className="h-4 w-4" />
                  <span className="text-[10px]">Account</span>
                </div>
              </Link>
            </Button>
          </nav>
        </div>
      )}
    </div>
  );
}