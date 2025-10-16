// @ts-nocheck
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect } from "react";

// Component to handle redirects safely
function RedirectToLogin({ path }: { path: string }) {
  useEffect(() => {
    console.log(`Redirecting to /login from ${path} - user not authenticated`);
    window.location.href = '/login';
  }, [path]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-border" />
      <div className="ml-2 text-sm text-muted-foreground">Redirecting to login...</div>
    </div>
  );
}

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading, error } = useAuth();
  const [location] = useLocation();
  
  // Debug logging
  useEffect(() => {
    console.log(`ProtectedRoute (${path}) state:`, { 
      user: user?.username || 'not logged in', 
      isLoading, 
      isAtPath: location === path,
      currentLocation: location,
      error: error?.message
    });
  }, [user, isLoading, path, location, error]);

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
          <div className="ml-2 text-sm text-muted-foreground">Loading authentication...</div>
        </div>
      ) : user ? (
        <Component />
      ) : (
        <RedirectToLogin path={path} />
      )}
    </Route>
  );
}