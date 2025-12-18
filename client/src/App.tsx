import { useEffect, useState, Suspense } from "react";
import { OptimizedMotionProvider, AnimationMonitor } from "@/lib/motion";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, queryPersister } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AppToaster } from "@/components/ui/AppToaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ECodeLoading } from "@/components/ECodeLoading";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";
import { LazyAnimatedRoutes } from "@/components/LazyAnimatedRoutes";
import { ConnectionStatusProvider } from "./hooks/use-connection-status";
import { ConnectionStatusBanner } from "./components/ConnectionStatusBanner";
import { GlobalErrorChannelProvider } from "./hooks/use-global-error-channel";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ReplitLayout } from "@/components/layout/ReplitLayout";
import { LazyShellWidgets } from "@/components/LazyShellWidgets";
import ErrorBoundary from "@/components/ErrorBoundary";

import performanceMonitor from "./utils/performance";
import { registerServiceWorker } from "./utils/service-worker";
import budgetMonitor from "./utils/performance-budget";
import { prefetchResources } from "./utils/network-optimization";
import { addImagePreloadLinks } from "./utils/image-optimization";

import { publicRoutes, protectedRoutes, placeholderRoutes, solarTechApps, Pages } from "./routes/config";

function PageLoader() {
  return <ECodeLoading fullScreen size="lg" text="Loading page..." />;
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
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (import.meta.env.PROD) {
      registerServiceWorker().catch(console.error);
    }
    if (process.env.NODE_ENV === 'production') {
      budgetMonitor.startMonitoring();
    }
    if (import.meta.env.PROD) {
      addImagePreloadLinks(['/assets/logo.svg', '/assets/hero-image.svg']);
    }
    const publicPaths = ['/', '/login', '/register', '/auth', '/pricing', '/features', '/about', '/docs', '/blog', '/terms', '/privacy', '/status', '/contact-sales', '/careers'];
    const isPublicPage = publicPaths.some(path => window.location.pathname === path || window.location.pathname.startsWith('/blog/'));
    if (!isPublicPage) {
      prefetchResources(['/api/projects', '/api/monitoring/health/summary']).catch(() => {});
    }
    performanceMonitor.mark('app-init');
    return () => {
      budgetMonitor.stopMonitoring();
      performanceMonitor.destroy();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (authLoading) setShowContent(true); }, 2000);
    if (!authLoading) {
      setShowContent(true);
      performanceMonitor.mark('auth-ready');
      performanceMonitor.measure('auth-init-time', 'app-init', 'auth-ready');
    }
    return () => clearTimeout(timer);
  }, [authLoading]);

  if (authLoading && !showContent) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><ECodeLoading fullScreen size="lg" text="Initializing..." /></div>;
  }

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
        <OptimizedMotionProvider>
          <AnimationMonitor>
            <ThemeProvider>
              <ConnectionStatusProvider>
                <GlobalErrorChannelProvider>
                  <AuthProvider>
                    <AppContent />
                  </AuthProvider>
                </GlobalErrorChannelProvider>
              </ConnectionStatusProvider>
            </ThemeProvider>
          </AnimationMonitor>
        </OptimizedMotionProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
