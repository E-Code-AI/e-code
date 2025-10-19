// @ts-nocheck
import { ReactNode } from "react";
import { ReplitHeader } from "./ReplitHeader";
import { ReplitSidebar } from "./ReplitSidebar";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { mobileNavigation, isActiveNavigationItem } from "@/constants/navigation";

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
  const [location] = useLocation();

  return (
    <div className="h-screen flex flex-col bg-[var(--ecode-background)] overflow-hidden">
      <ReplitHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <div className="hidden md:block">
            <ReplitSidebar projectId={projectId} />
          </div>
        )}
        
        <main className={`flex-1 flex flex-col overflow-auto ${className}`}>
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 safe-area-inset-bottom">
        <nav className="flex h-14 items-stretch justify-around">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveNavigationItem(location, item);

            return (
              <Button
                key={item.key}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 rounded-none px-2",
                  isActive && "bg-primary/10 text-primary"
                )}
                asChild
              >
                <Link href={item.path} aria-label={item.ctaLabel || item.label}>
                  <div className="flex h-full flex-col items-center justify-center gap-1">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}