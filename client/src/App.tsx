import { useEffect, useState, Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, queryPersister } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ECodeLoading } from "@/components/ECodeLoading";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConnectionStatusProvider } from "./hooks/use-connection-status";
import { GlobalErrorChannelProvider } from "./hooks/use-global-error-channel";
import { RateLimitProvider } from "@/components/ide/RateLimitExperience";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ReplitLayout } from "@/components/layout/ReplitLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { publicRoutes, protectedRoutes, placeholderRoutes, solarTechApps, Pages } from "./routes/config";
import { instrumentedLazy } from "@/utils/instrumented-lazy";

import { Toaster } from "@/components/ui/toaster";
import { AppToaster } from "@/components/ui/AppToaster";
const ScrollToTop = instrumentedLazy(() => import("@/components/ScrollToTop").then(m => ({ default: m.ScrollToTop })), 'ScrollToTop');
const LazyAnimatedRoutes = instrumentedLazy(() => import("@/components/LazyAnimatedRoutes").then(m => ({ default: m.LazyAnimatedRoutes })), 'LazyAnimatedRoutes');
const ConnectionStatusBanner = instrumentedLazy(() => import("./components/ConnectionStatusBanner").then(m => ({ default: m.ConnectionStatusBanner })), 'ConnectionStatusBanner');
const LazyShellWidgets = instrumentedLazy(() => import("@/components/LazyShellWidgets").then(m => ({ default: m.LazyShellWidgets })), 'LazyShellWidgets');
const OfflineFallback = instrumentedLazy(() => import("@/components/OfflineFallback").then(m => ({ default: m.OfflineFallback })), 'OfflineFallback');
const OptimizedMotionProvider = instrumentedLazy(() => import("@/lib/motion").then(m => ({ default: m.OptimizedMotionProvider })), 'OptimizedMotionProvider');
const AnimationMonitor = instrumentedLazy(() => import("@/lib/motion").then(m => ({ default: m.AnimationMonitor })), 'AnimationMonitor');

function PageLoader() {
  return <ECodeLoading fullScreen size="lg" text="Loading..." />;
}

function AtSymbolRedirectHandler({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (location.startsWith('/@') && !location.startsWith('/@vite') && !location.startsWith('/@fs') && !location.startsWith('/@id')) {
      const newPath = location.replace(/^\/@/, '/u/');
      navigate(`${newPath}${window.location.search}${window.location.hash}`, { replace: true });
    }
  }, [location, navigate]);

  if (location.startsWith('/@') && !location.startsWith('/@vite') && !location.startsWith('/@fs') && !location.startsWith('/@id')) {
    return <ECodeLoading fullScreen size="lg" text="Redirecting..." />;
  }

  return <>{children}</>;
}

function AgentRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    navigate(`/ai-agent?${searchParams.toString()}`);
  }, [navigate]);
  return null;
}

function AIAgentRedirect() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const projectId = searchParams.get('projectId');
    const prompt = searchParams.get('prompt');
    
    if (user && projectId) {
      const params = new URLSearchParams();
      params.set('panel', 'agent');
      if (prompt) params.set('prompt', prompt);
      navigate(`/ide/${projectId}?${params.toString()}`);
    } else if (user) {
      if (prompt) sessionStorage.setItem('pending-agent-prompt', prompt);
      navigate('/projects');
    } else {
      navigate('/');
    }
  }, [user, navigate]);
  
  return <div>Redirecting...</div>;
}

function ReplitAIAgentRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    navigate(`/ai-agent?${searchParams.toString()}`);
  }, [navigate]);
  return <div>Redirecting to AI Agent...</div>;
}

const layoutWrapperCache = new Map<React.ComponentType<any>, React.ComponentType<any>>();

function getLayoutWrappedComponent(Component: React.ComponentType<any>, layout?: string): React.ComponentType<any> {
  if (layout !== "replit") return Component;
  
  if (!layoutWrapperCache.has(Component)) {
    const WrappedComponent = ({ params, ...props }: any) => (
      <ReplitLayout showSidebar={false}>
        <Component params={params} {...params} {...props} />
      </ReplitLayout>
    );
    WrappedComponent.displayName = `LayoutWrapped(${Component.displayName || Component.name || 'Component'})`;
    layoutWrapperCache.set(Component, WrappedComponent);
  }
  return layoutWrapperCache.get(Component)!;
}

function AppContent() {
  const { isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (import.meta.env.PROD) {
      import("./utils/service-worker").then(({ registerServiceWorker }) => {
        registerServiceWorker().catch(console.error);
      });
      import("./utils/performance-budget").then(({ default: budgetMonitor }) => {
        budgetMonitor.startMonitoring();
      });
      import("./utils/image-optimization").then(({ addImagePreloadLinks }) => {
        addImagePreloadLinks(['/assets/logo.svg', '/assets/hero-image.svg']);
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <AtSymbolRedirectHandler>
          <div className="min-h-screen replit-layout-main">
            <ConnectionStatusBanner />
            <ScrollToTop />
            <Toaster />
            <AppToaster />
            <LazyShellWidgets />
            <LazyAnimatedRoutes>
              <Suspense fallback={<PageLoader />}>
                <Switch>
                  <Route path="/auth" component={() => <Redirect to="/login" />} />
                  <Route path="/agent" component={AgentRedirect} />
                  <Route path="/ai-agent" component={AIAgentRedirect} />
                  <ProtectedRoute path="/replit-ai-agent" component={ReplitAIAgentRedirect} />

                  {publicRoutes.map(({ path, component: Component, layout }) => (
                    <Route key={path} path={path} component={getLayoutWrappedComponent(Component, layout)} />
                  ))}

                  {solarTechApps.map(({ path, projectName, projectDescription, projectId, component: AppComponent }) => (
                    <ProtectedRoute key={path} path={path} component={() => (
                      <Pages.ApplicationIDEWrapper
                        projectName={projectName}
                        projectDescription={projectDescription}
                        projectId={projectId}
                        appComponent={<AppComponent />}
                      />
                    )} />
                  ))}

                  {placeholderRoutes.filter(r => r.path.startsWith("/teams")).map(route => (
                    <ProtectedRoute key={route.path} path={route.path} component={() => (
                      <ReplitLayout showSidebar={false}><Pages.FeaturePlaceholder featureKey={route.feature} /></ReplitLayout>
                    )} />
                  ))}

                  {protectedRoutes.map(({ path, component: Component, layout }) => (
                    <ProtectedRoute key={path} path={path} component={getLayoutWrappedComponent(Component, layout)} />
                  ))}

                  {placeholderRoutes.filter(r => !r.path.startsWith("/teams")).map(route => (
                    <ProtectedRoute key={route.path} path={route.path} component={() => (
                      <ReplitLayout showSidebar={false}><Pages.FeaturePlaceholder featureKey={route.feature} /></ReplitLayout>
                    )} />
                  ))}

                  <Route component={Pages.NotFound} />
                </Switch>
              </Suspense>
            </LazyAnimatedRoutes>
          </div>
        </AtSymbolRedirectHandler>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ persister: queryPersister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
      >
        <Suspense fallback={<ECodeLoading fullScreen size="lg" text="Loading..." />}>
          <OptimizedMotionProvider>
            <AnimationMonitor>
              <ThemeProvider>
                <ConnectionStatusProvider>
                  <GlobalErrorChannelProvider>
                    <RateLimitProvider>
                      <AuthProvider>
                        <OfflineFallback />
                        <AppContent />
                      </AuthProvider>
                    </RateLimitProvider>
                  </GlobalErrorChannelProvider>
                </ConnectionStatusProvider>
              </ThemeProvider>
            </AnimationMonitor>
          </OptimizedMotionProvider>
        </Suspense>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
