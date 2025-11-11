import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect } from "react";

// Component to handle redirects safely
function RedirectToLogin({ path }: { path: string }) {
  useEffect(() => {
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