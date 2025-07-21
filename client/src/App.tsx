import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";
import AuthPage from "@/pages/auth-page";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectPage from "@/pages/ProjectPage";
import RuntimesPage from "@/pages/RuntimesPage";
import RuntimeDiagnosticsPage from "@/pages/RuntimeDiagnosticsPage";
import RuntimePublicPage from "@/pages/RuntimePublicPage";
import RuntimeTest from "@/pages/RuntimeTest";
import Dashboard from "@/pages/Dashboard";
import Explore from "@/pages/Explore";
import Teams from "@/pages/Teams";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ReplitLayout } from "@/components/layout/ReplitLayout";
import { SpotlightSearch } from "@/components/SpotlightSearch";

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
  const [spotlightOpen, setSpotlightOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="min-h-screen replit-layout-main">
        <Toaster />
        <SpotlightSearch open={spotlightOpen} onOpenChange={setSpotlightOpen} />
        <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/runtime-test" component={RuntimePublicPage} />
          <Route path="/runtime-dependencies" component={RuntimeTest} />
          <Route path="/" component={() => {
            const [, navigate] = useLocation();
            
            useEffect(() => {
              if (window.location.pathname === '/') {
                navigate('/dashboard');
              }
            }, [navigate]);
            
            return null;
          }} />
          <ProtectedRoute path="/dashboard" component={() => (
            <ReplitLayout>
              <Dashboard />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/explore" component={() => (
            <ReplitLayout>
              <Explore />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/teams" component={() => (
            <ReplitLayout>
              <Teams />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/settings" component={() => (
            <ReplitLayout>
              <Settings />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/profile/:username?" component={() => (
            <ReplitLayout>
              <Profile />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/home" component={() => (
            <ReplitLayout>
              <Home />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects" component={() => (
            <ReplitLayout>
              <ProjectsPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/project/:id" component={() => (
            <ReplitLayout showSidebar={true}>
              <ProjectPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/editor/:id" component={() => (
            <ReplitLayout showSidebar={true}>
              <Editor />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/runtimes" component={() => (
            <ReplitLayout>
              <RuntimesPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/runtime-diagnostics" component={() => (
            <ReplitLayout>
              <RuntimeDiagnosticsPage />
            </ReplitLayout>
          )} />
          <Route component={NotFound} />
        </Switch>
        <AuthDebug />
      </div>
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