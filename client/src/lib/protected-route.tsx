import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import { useEffect, useRef } from "react";

// Component to handle redirects safely with proper ?next= parameter
function RedirectToLogin({ path }: { path: string }) {
  const [, navigate] = useLocation();
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // Prevent double redirects
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    
    // Use wouter navigate for SPA navigation (no page reload)
    // Include next parameter to return to original page after login
    const nextPath = encodeURIComponent(path);
    navigate(`/login?next=${nextPath}`, { replace: true });
  }, [path, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
      <div className="ml-2 text-[13px] text-muted-foreground">Redirecting to login...</div>
    </div>
  );
}

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType<any>;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(params) => (
        isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
            <div className="ml-2 text-[13px] text-muted-foreground">Loading authentication...</div>
          </div>
        ) : user ? (
          <Component params={params} {...params} />
        ) : (
          <RedirectToLogin path={path} />
        )
      )}
    </Route>
  );
}