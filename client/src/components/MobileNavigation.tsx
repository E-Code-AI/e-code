import { useLocation } from 'wouter';
import { Home, ChevronLeft, ChevronRight, Blocks, Terminal } from 'lucide-react';
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
    navigate('/');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t h-14 flex items-center justify-around px-4 md:hidden z-50">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={goBack}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={goForward}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full",
          location === '/' && "bg-primary/10 text-primary"
        )}
        onClick={goHome}
      >
        <Home className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-full",
          location.startsWith('/project/') && "bg-primary/10 text-primary"
        )}
        onClick={() => navigate('/projects')}
      >
        <Blocks className="h-5 w-5" />
      </Button>
    </div>
  );
}