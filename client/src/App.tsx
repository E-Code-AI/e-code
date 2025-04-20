import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import AuthPage from "@/pages/auth-page";
import RuntimesPage from "@/pages/RuntimesPage";
import RuntimePublicPage from "@/pages/RuntimePublicPage";
import RuntimeTest from "@/pages/RuntimeTest";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

// Debug component to show authentication status
function AuthDebug() {
  const { user, isLoading, error, loginMutation, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();

  const testLogin = () => {
    loginMutation.mutate({ username: "demo", password: "password" });
  };

  const testLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white p-2 text-xs z-50">
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <strong>Auth Status:</strong>{" "}
          {isLoading ? "Loading..." : user ? `Logged in as ${user.username}` : "Not logged in"}
        </div>
        <div>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs mr-2" 
            onClick={testLogin}
            disabled={loginMutation.isPending}
          >
            Test Login
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs mr-2" 
            onClick={testLogout}
            disabled={logoutMutation.isPending}
          >
            Test Logout
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs" 
            onClick={() => navigate("/auth")}
          >
            Go to Auth Page
          </Button>
        </div>
      </div>
      {error && (
        <div className="text-red-400 mt-1">Error: {error.message}</div>
      )}
    </div>
  );
}

function AppContent() {
  return (
    <TooltipProvider>
      <Toaster />
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/runtime-test" component={RuntimePublicPage} />
        <Route path="/runtime-dependencies" component={RuntimeTest} />
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/project/:id" component={Editor} />
        <ProtectedRoute path="/runtimes" component={RuntimesPage} />
        <Route component={NotFound} />
      </Switch>
      <AuthDebug />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
