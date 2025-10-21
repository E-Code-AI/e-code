// @ts-nocheck
import { useEffect, useState, lazy, Suspense } from "react";
import { Switch, Route, useLocation, useRoute } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ECodeLoading } from "@/components/ECodeLoading";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy load all pages for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const Editor = lazy(() => import("@/pages/Editor"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage"));
const RuntimesPage = lazy(() => import("@/pages/RuntimesPage"));
const RuntimeDiagnosticsPage = lazy(() => import("@/pages/RuntimeDiagnosticsPage"));
const RuntimePublicPage = lazy(() => import("@/pages/RuntimePublicPage"));

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Explore = lazy(() => import("@/pages/Explore"));
const Teams = lazy(() => import("@/pages/Teams"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Analytics = lazy(() => import("@/pages/Analytics"));

const Education = lazy(() => import("@/pages/Education"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));

const TeamPage = lazy(() => import("@/pages/TeamPage"));
const TeamSettings = lazy(() => import("@/pages/TeamSettings"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const UserSettings = lazy(() => import("@/pages/UserSettings"));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
const Community = lazy(() => import("@/pages/Community"));
const CommunityPost = lazy(() => import("@/pages/CommunityPost"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminUsage = lazy(() => import("@/pages/AdminUsage"));
const AdminBilling = lazy(() => import("@/pages/AdminBilling"));
const AdminAIModels = lazy(() => import("@/pages/admin/AIModels"));
const AdminFormRequests = lazy(() => import("@/pages/admin/FormRequests"));
const PitchDeck = lazy(() => import("@/pages/admin/PitchDeck"));
// Public pages
const Landing = lazy(() => import("@/pages/Landing"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Features = lazy(() => import("@/pages/Features"));
const About = lazy(() => import("@/pages/About"));
const Careers = lazy(() => import("@/pages/Careers"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogDetail = lazy(() => import("@/pages/BlogDetail"));
const Docs = lazy(() => import("@/pages/Docs"));
const ContactSales = lazy(() => import("@/pages/ContactSales"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Status = lazy(() => import("@/pages/Status"));
const Forum = lazy(() => import("@/pages/Forum"));
const ComparePage = lazy(() => import("@/pages/compare/ComparePage"));

const MobileAdmin = lazy(() => import("@/pages/mobile"));
const AI = lazy(() => import("@/pages/AI"));
const Press = lazy(() => import("@/pages/Press"));
const Partners = lazy(() => import("@/pages/Partners"));
const Security = lazy(() => import("@/pages/Security"));
const Desktop = lazy(() => import("@/pages/Desktop"));

const AIAgent = lazy(() => import("@/pages/AIAgent"));
const AIAgentStudio = lazy(() => import("@/pages/AIAgentStudio"));
const ReplitAIAgentPage = lazy(() => import("@/pages/ReplitAIAgentPage"));
const PublicTeamPage = lazy(() => import("@/pages/PublicTeamPage"));
const PublicDeploymentsPage = lazy(() => import("@/pages/PublicDeploymentsPage"));
const Scalability = lazy(() => import("@/pages/Scalability"));
const MarketingBounties = lazy(() => import("@/pages/marketing/Bounties"));

// Comparison Pages
const Compare = lazy(() => import("@/pages/marketing/Compare"));
const VsGitHubCodespaces = lazy(() => import("@/pages/marketing/VsGitHubCodespaces"));
const VsGlitch = lazy(() => import("@/pages/marketing/VsGlitch"));
const VsHeroku = lazy(() => import("@/pages/marketing/VsHeroku"));
const VsCodeSandbox = lazy(() => import("@/pages/marketing/VsCodeSandbox"));
const VsAwsCloud9 = lazy(() => import("@/pages/marketing/VsAwsCloud9"));

const AuthenticationDemo = lazy(() =>
  import("@/components/AuthenticationDemo").then((module) => ({
    default: module.AuthenticationDemo,
  }))
);
// User area pages
const Account = lazy(() => import("@/pages/Account"));

const Deployments = lazy(() => import("@/pages/Deployments"));
const Learn = lazy(() => import("@/pages/Learn"));
const Support = lazy(() => import("@/pages/Support"));
const Themes = lazy(() => import("@/pages/Themes"));

const Usage = lazy(() => import("@/pages/Usage"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const Plans = lazy(() => import("@/pages/Plans"));
const Cycles = lazy(() => import("@/pages/Cycles"));
const Bounties = lazy(() => import("@/pages/Bounties"));
const PowerUps = lazy(() => import("@/pages/PowerUps"));
const Badges = lazy(() => import("@/pages/Badges"));
// Enterprise pages
const SSOConfiguration = lazy(() => import("@/pages/SSOConfiguration"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const CustomRoles = lazy(() => import("@/pages/CustomRoles"));
const Subprocessors = lazy(() => import("@/pages/Subprocessors"));
const HealthDashboard = lazy(() => import("@/pages/HealthDashboard"));
const StudentDPA = lazy(() => import("@/pages/StudentDPA"));
const Languages = lazy(() => import("@/pages/Languages"));
const GitHubImport = lazy(() => import("@/pages/GitHubImport"));
const Git = lazy(() => import("@/pages/Git"));

const Secrets = lazy(() => import("@/pages/Secrets"));
const Workflows = lazy(() => import("@/pages/Workflows"));
const SSH = lazy(() => import("@/pages/SSH"));
const SecurityScanner = lazy(() => import("@/pages/SecurityScanner"));
const Dependencies = lazy(() => import("@/pages/Dependencies"));
const ObjectStorage = lazy(() => import("@/pages/ObjectStorage"));

const DatabaseManagement = lazy(() => import("@/pages/DatabaseManagement"));
const SecretManagement = lazy(() => import("@/pages/SecretManagement"));
const UsageAlerts = lazy(() => import("@/pages/UsageAlerts"));
// Newsletter pages
const NewsletterConfirmed = lazy(() => import("@/pages/NewsletterConfirmed"));
const NewsletterConfirm = lazy(() => import("@/pages/NewsletterConfirm"));
const NewsletterUnsubscribe = lazy(() => import("@/pages/NewsletterUnsubscribe"));

// Legal pages
const DPA = lazy(() => import("@/pages/DPA"));
const CommercialAgreement = lazy(() => import("@/pages/CommercialAgreement"));
const ReportAbuse = lazy(() => import("@/pages/ReportAbuse"));
// Shared snippet page
const SharedSnippet = lazy(() => import("@/pages/SharedSnippet"));
// AI Documentation page
const AIDocumentation = lazy(() => import("@/pages/AIDocumentation"));
// New feature pages
const APISDKPage = lazy(() => import("@/pages/APISDKPage"));
const MobileAppsPage = lazy(() => import("@/pages/MobileAppsPage"));
const FigmaImport = lazy(() => import("@/pages/FigmaImport"));
const BoltImport = lazy(() => import("@/pages/BoltImport"));
const LovableImport = lazy(() => import("@/pages/LovableImport"));

// Solutions pages
const AppBuilder = lazy(() => import("@/pages/solutions/AppBuilder"));
const WebsiteBuilder = lazy(() => import("@/pages/solutions/WebsiteBuilder"));
const GameBuilder = lazy(() => import("@/pages/solutions/GameBuilder"));
const DashboardBuilder = lazy(() => import("@/pages/solutions/DashboardBuilder"));
const ChatbotBuilder = lazy(() => import("@/pages/solutions/ChatbotBuilder"));
const InternalAIBuilder = lazy(() => import("@/pages/solutions/InternalAIBuilder"));
const PreviewWithDevTools = lazy(() => import("@/pages/PreviewWithDevTools"));

const CodeGeneration = lazy(() => import("@/pages/CodeGeneration"));
const MCPInterface = lazy(() => import("@/pages/MCPInterface"));
const PolyglotBackendPage = lazy(() => import("@/pages/PolyglotBackendPage"));
// Application Pages
const SolarTechAIChatApp = lazy(() => import("@/pages/SolarTechAIChatApp"));
const SolarTechCRMApp = lazy(() => import("@/pages/SolarTechCRMApp"));
const SolarTechStoreApp = lazy(() => import("@/pages/SolarTechStoreApp"));
// Advanced Feature Components

import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ReplitLayout } from "@/components/layout/ReplitLayout";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ApplicationIDEWrapper } from "@/components/ApplicationIDEWrapper";
const FeaturePlaceholder = lazy(() => import("@/pages/FeaturePlaceholder"));

const placeholderRoutes = [
  { path: "/assistant", feature: "assistant" },
  { path: "/database", feature: "database" },
  { path: "/console", feature: "console" },
  { path: "/authentication", feature: "authentication" },
  { path: "/preview", feature: "preview" },
  { path: "/agent", feature: "agent" },
  { path: "/code-search", feature: "code-search" },
  { path: "/packages", feature: "packages" },
  { path: "/extensions", feature: "extensions" },
  { path: "/integrations", feature: "integrations" },
  { path: "/networking", feature: "networking" },
  { path: "/problems", feature: "problems" },
  { path: "/kv-store", feature: "kv-store" },
  { path: "/shell", feature: "shell" },
  { path: "/threads", feature: "threads" },
  { path: "/vnc", feature: "vnc" },
  { path: "/referrals", feature: "referrals" },
  { path: "/teams/new", feature: "teams/new" },
];

// Loading fallback component
function PageLoader() {
  return <ECodeLoading fullScreen size="lg" text="Loading page..." />;
}


// Wrapper components for Replit-style routes
function ProjectPageWrapper() {
  return (
    <ReplitLayout showSidebar={false}>
      <ProjectPage />
    </ReplitLayout>
  );
}

function UserProfileWrapper() {
  return (
    <ReplitLayout showSidebar={false}>
      <UserProfile />
    </ReplitLayout>
  );
}

// Redirect handler for backward compatibility with @ URLs
// This component intercepts any path starting with /@ and redirects to /u/
function AtSymbolRedirectHandler({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Check if the current path starts with /@ but exclude Vite system routes
    if (location.startsWith('/@') && !location.startsWith('/@vite') && !location.startsWith('/@fs') && !location.startsWith('/@id')) {
      // Remove the /@ prefix and replace with /u/
      const newPath = location.replace(/^\/@/, '/u/');
      const search = window.location.search;
      const hash = window.location.hash;

      console.log('Redirecting from', location, 'to', newPath);
      navigate(`${newPath}${search}${hash}`, { replace: true });
    }
  }, [location, navigate]);

  // If we're on an @ route (but not a Vite system route), show loading while redirecting
  if (location.startsWith('/@') && !location.startsWith('/@vite') && !location.startsWith('/@fs') && !location.startsWith('/@id')) {
    return <ECodeLoading fullScreen size="lg" text="Redirecting..." />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [location] = useLocation();
  const { isLoading: authLoading } = useAuth();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Set a timeout to show content after 2 seconds if auth is still loading
    // This prevents indefinite loading states
    const timer = setTimeout(() => {
      if (authLoading) {
        console.log('Auth loading timeout reached, showing content');
        setShowContent(true);
      }
    }, 2000);

    // If auth loading finishes, show content immediately
    if (!authLoading) {
      setShowContent(true);
    }

    return () => clearTimeout(timer);
  }, [authLoading]);

  // Show loading state only for the first 2 seconds
  // After that, show the content even if auth is still loading
  if (authLoading && !showContent) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ECodeLoading fullScreen size="lg" text="Initializing..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <AtSymbolRedirectHandler>
          <div className="min-h-screen replit-layout-main">
            <ScrollToTop />
            <Toaster />
            <SpotlightSearch />
            <CommandPalette />
            <KeyboardShortcuts />

            <Suspense fallback={<PageLoader />}>
              <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />

          <Route path="/runtime-test" component={RuntimePublicPage} />

          {/* Public Routes */}
          <Route path="/" component={Landing} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/features" component={Features} />
          <Route path="/about" component={About} />
          <Route path="/careers" component={Careers} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogDetail} />
          <Route path="/docs" component={Docs} />
          <Route path="/contact-sales" component={ContactSales} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/dpa" component={DPA} />
          <Route path="/commercial-agreement" component={CommercialAgreement} />
          <Route path="/report-abuse" component={ReportAbuse} />
          <Route path="/status" component={Status} />
          <Route path="/forum" component={Forum} />
          <Route path="/compare/:slug" component={ComparePage} />

          <Route path="/marketing/bounties" component={MarketingBounties} />
          <Route path="/marketing/deployments" component={PublicDeploymentsPage} />
          <Route path="/marketing/teams" component={PublicTeamPage} />

          {/* Comparison Pages */}
          <Route path="/compare" component={Compare} />
          <Route path="/compare/github-codespaces" component={VsGitHubCodespaces} />
          <Route path="/compare/glitch" component={VsGlitch} />
          <Route path="/compare/heroku" component={VsHeroku} />
          <Route path="/compare/codesandbox" component={VsCodeSandbox} />
          <Route path="/compare/aws-cloud9" component={VsAwsCloud9} />

          {/* Solutions pages */}
          <Route path="/solutions/app-builder" component={AppBuilder} />
          <Route path="/solutions/website-builder" component={WebsiteBuilder} />
          <Route path="/solutions/game-builder" component={GameBuilder} />
          <Route path="/solutions/dashboard-builder" component={DashboardBuilder} />
          <Route path="/solutions/chatbot-builder" component={ChatbotBuilder} />
          <Route path="/solutions/internal-ai-builder" component={InternalAIBuilder} />

          <Route path="/mobile" component={MobileAdmin} />
          <Route path="/ai" component={AI} />
          <Route path="/ai-documentation" component={AIDocumentation} />
          <Route path="/ai-agent" component={AIAgent} />
          <ProtectedRoute path="/ai-agent/studio" component={() => (
            <ReplitLayout showSidebar={false}>
              <AIAgentStudio />
            </ReplitLayout>
          )} />
          <Route path="/code-generation" component={CodeGeneration} />
          <Route path="/mcp" component={MCPInterface} />
          <Route path="/polyglot" component={PolyglotBackendPage} />
          <Route path="/demo" component={AuthenticationDemo} />
          <Route path="/press" component={Press} />
          <Route path="/partners" component={Partners} />
          <Route path="/security" component={Security} />
          <Route path="/desktop" component={Desktop} />

          <Route path="/subprocessors" component={Subprocessors} />
          <Route path="/student-dpa" component={StudentDPA} />
          <Route path="/languages" component={Languages} />
          <Route path="/templates/languages" component={Languages} />
          <Route path="/team" component={PublicTeamPage} />
          <Route path="/collaboration" component={PublicTeamPage} />
          <Route path="/deployments" component={PublicDeploymentsPage} />

          <ProtectedRoute path="/github-import" component={() => (
            <ReplitLayout showSidebar={false}>
              <GitHubImport />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects/:id/import/figma" component={() => (
            <ReplitLayout showSidebar={false}>
              <FigmaImport />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects/:id/import/bolt" component={() => (
            <ReplitLayout showSidebar={false}>
              <BoltImport />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects/:id/import/lovable" component={() => (
            <ReplitLayout showSidebar={false}>
              <LovableImport />
            </ReplitLayout>
          )} />
          <Route path="/git" component={Git} />
          {/* Newsletter pages */}
          <Route path="/newsletter-confirmed" component={NewsletterConfirmed} />
          <Route path="/newsletter/confirm" component={NewsletterConfirm} />
          <Route path="/newsletter/unsubscribe" component={NewsletterUnsubscribe} />
          {/* Shared snippet page */}
          <Route path="/share/:shareId" component={SharedSnippet} />

          <ProtectedRoute path="/dashboard" component={() => (
            <ReplitLayout showSidebar={false}>
              <Dashboard />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/explore" component={() => (
            <ReplitLayout showSidebar={false}>
              <Explore />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/teams" component={() => (
            <ReplitLayout showSidebar={false}>
              <Teams />
            </ReplitLayout>
          )} />
          {placeholderRoutes
            .filter((route) => route.path.startsWith("/teams"))
            .map((route) => (
              <ProtectedRoute
                key={route.path}
                path={route.path}
                component={() => (
                  <ReplitLayout showSidebar={false}>
                    <FeaturePlaceholder featureKey={route.feature} />
                  </ReplitLayout>
                )}
              />
            ))}
          <ProtectedRoute path="/teams/:id" component={() => (
            <ReplitLayout showSidebar={false}>
              <TeamPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/teams/:id/settings" component={() => (
            <ReplitLayout showSidebar={false}>
              <TeamSettings />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/notifications" component={() => (
            <ReplitLayout showSidebar={false}>
              <Notifications />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/analytics" component={() => (
            <ReplitLayout showSidebar={false}>
              <Analytics />
            </ReplitLayout>
          )} />

          <ProtectedRoute path="/scalability" component={() => (
            <ReplitLayout showSidebar={false}>
              <Scalability />
            </ReplitLayout>
          )} />

          <ProtectedRoute path="/education" component={() => (
            <ReplitLayout showSidebar={false}>
              <Education />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/marketplace" component={() => (
            <ReplitLayout showSidebar={false}>
              <Marketplace />
            </ReplitLayout>
          )} />

          {/* New Feature Routes */}
          <ProtectedRoute path="/api-sdk" component={() => (
            <ReplitLayout showSidebar={false}>
              <APISDKPage />
            </ReplitLayout>
          )} />

          <ProtectedRoute path="/mobile-apps" component={() => (
            <ReplitLayout showSidebar={false}>
              <MobileAppsPage />
            </ReplitLayout>
          )} />
          {/* Advanced Feature Routes */}
          <ProtectedRoute path="/advanced/mobile" component={() => (
            <ReplitLayout showSidebar={false}>
              <MobileAdmin />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/advanced/sso" component={() => (
            <ReplitLayout showSidebar={false}>
              <SSOConfiguration />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/advanced/collaboration" component={() => (
            <ReplitLayout showSidebar={false}>
              <Community />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/advanced/storage" component={() => (
            <ReplitLayout showSidebar={false}>
              <Usage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/advanced/community" component={() => (
            <ReplitLayout showSidebar={false}>
              <Community />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/settings" component={() => (
            <ReplitLayout showSidebar={false}>
              <Settings />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/settings/notifications" component={() => (
            <ReplitLayout showSidebar={false}>
              <Notifications />
            </ReplitLayout>
          )} />
          {placeholderRoutes
            .filter((route) => !route.path.startsWith("/teams"))
            .map((route) => (
              <ProtectedRoute
                key={route.path}
                path={route.path}
                component={() => (
                  <ReplitLayout showSidebar={false}>
                    <FeaturePlaceholder featureKey={route.feature} />
                  </ReplitLayout>
                )}
              />
            ))}
          <ProtectedRoute path="/profile/:username?" component={() => (
            <ReplitLayout showSidebar={false}>
              <Profile />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/home" component={() => (
            <ReplitLayout showSidebar={false}>
              <Home />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects" component={() => (
            <ReplitLayout showSidebar={false}>
              <ProjectsPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects/:id" component={() => (
            <ReplitLayout showSidebar={false}>
              <ProjectPage />
            </ReplitLayout>
          )} />
          {/* Project Routes - Consolidated and properly ordered */}
          <ProtectedRoute path="/project/:id" component={() => (
            <ReplitLayout showSidebar={false}>
              <ProjectPage />
            </ReplitLayout>
          )} />

          {/* SolarTech Applications with specific Replit-style URLs (must come before generic patterns) */}
          <ProtectedRoute path="/u/admin/solartech-ai-chat" component={() => (
            <ApplicationIDEWrapper
              projectName="SolarTech AI Chat"
              projectDescription="Professional solar technology AI assistant"
              projectId={1001}
              appComponent={<SolarTechAIChatApp />}
            />
          )} />
          <ProtectedRoute path="/u/admin/solartech-crm" component={() => (
            <ApplicationIDEWrapper
              projectName="SolarTech CRM"
              projectDescription="Solar business customer relationship management"
              projectId={1002}
              appComponent={<SolarTechCRMApp />}
            />
          )} />
          <ProtectedRoute path="/u/admin/solartech-fortune500-store" component={() => (
            <ApplicationIDEWrapper
              projectName="Fortune500 Solar Store"
              projectDescription="E-commerce platform for solar technology products"
              projectId={1003}
              appComponent={<SolarTechStoreApp />}
            />
          )} />

          {/* Generic Replit-style project routes */}
          {/* Using /u/ prefix - @ routes are handled by AtSymbolRedirectHandler */}
          <Route path="/u/:username/:projectname" component={ProjectPageWrapper} />

          {/* User profile routes */}
          <Route path="/u/:username" component={UserProfileWrapper} />
          <ProtectedRoute path="/editor/:id" component={() => (
            <ReplitLayout showSidebar={false}>
              <Editor />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/runtimes" component={() => (
            <ReplitLayout showSidebar={false}>
              <RuntimesPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/runtime-diagnostics" component={() => (
            <ReplitLayout showSidebar={false}>
              <RuntimeDiagnosticsPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/user/:username" component={() => (
            <ReplitLayout showSidebar={false}>
              <UserProfile />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/user/settings" component={() => (
            <ReplitLayout showSidebar={false}>
              <UserSettings />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/templates" component={() => (
            <ReplitLayout showSidebar={false}>
              <TemplatesPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/community" component={() => (
            <ReplitLayout showSidebar={false}>
              <Community />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/community/post/:id" component={() => (
            <ReplitLayout showSidebar={false}>
              <CommunityPost />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/search" component={() => (
            <ReplitLayout showSidebar={false}>
              <SearchPage />
            </ReplitLayout>
          )} />

          <ProtectedRoute path="/secrets" component={() => (
            <ReplitLayout showSidebar={false}>
              <Secrets />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/workflows" component={() => (
            <ReplitLayout showSidebar={false}>
              <Workflows />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/ssh" component={() => (
            <ReplitLayout showSidebar={false}>
              <SSH />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/security-scanner" component={() => (
            <ReplitLayout showSidebar={false}>
              <SecurityScanner />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/dependencies" component={() => (
            <ReplitLayout showSidebar={false}>
              <Dependencies />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/object-storage" component={() => (
            <ReplitLayout showSidebar={false}>
              <ObjectStorage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/projects/:id/database" component={() => (
            <DatabaseManagement />
          )} />
          <ProtectedRoute path="/projects/:id/secrets" component={() => (
            <SecretManagement />
          )} />
          <ProtectedRoute path="/usage-alerts" component={() => (
            <UsageAlerts />
          )} />
          <ProtectedRoute path="/projects/:id/preview" component={() => (
            <PreviewWithDevTools />
          )} />
          <ProtectedRoute path="/mobile-admin" component={() => (
            <ReplitLayout showSidebar={false}>
              <MobileAdmin />
            </ReplitLayout>
          )} />
          {/* Application Routes - Using ApplicationIDEWrapper for full IDE interface */}
          <ProtectedRoute path="/solartech-ai-chat" component={() => (
            <ApplicationIDEWrapper
              projectName="SolarTech AI Chat"
              projectDescription="Professional solar technology AI assistant"
              projectId={1001}
              appComponent={<SolarTechAIChatApp />}
            />
          )} />
          <ProtectedRoute path="/solartech-crm" component={() => (
            <ApplicationIDEWrapper
              projectName="SolarTech CRM"
              projectDescription="Solar business customer relationship management"
              projectId={1002}
              appComponent={<SolarTechCRMApp />}
            />
          )} />
          <ProtectedRoute path="/salesforcepro-crm" component={() => (
            <ApplicationIDEWrapper
              projectName="SolarTech CRM"
              projectDescription="Solar business customer relationship management"
              projectId={1002}
              appComponent={<SolarTechCRMApp />}
            />
          )} />
          <ProtectedRoute path="/solartech-fortune500-store" component={() => (
            <ApplicationIDEWrapper
              projectName="Fortune500 Solar Store"
              projectDescription="E-commerce platform for solar technology products"
              projectId={1003}
              appComponent={<SolarTechStoreApp />}
            />
          )} />
          <ProtectedRoute path="/admin" component={() => (
            <ReplitLayout showSidebar={false}>
              <AdminDashboard />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin/usage" component={() => (
            <ReplitLayout showSidebar={false}>
              <AdminUsage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin/requests" component={() => (
            <ReplitLayout showSidebar={false}>
              <AdminFormRequests />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin/billing" component={() => (
            <ReplitLayout showSidebar={false}>
              <AdminBilling />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin/ai-models" component={() => (
            <ReplitLayout showSidebar={false}>
              <AdminAIModels />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin/pitch-deck" component={() => (
            <ReplitLayout showSidebar={false}>
              <PitchDeck />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/account" component={() => (
            <ReplitLayout showSidebar={false}>
              <Account />
            </ReplitLayout>
          )} />


          <ProtectedRoute path="/deployments" component={() => (
            <ReplitLayout showSidebar={false}>
              <Deployments />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/usage" component={() => (
            <ReplitLayout showSidebar={false}>
              <Usage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/cycles" component={() => (
            <ReplitLayout showSidebar={false}>
              <Cycles />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/bounties" component={() => (
            <ReplitLayout showSidebar={false}>
              <Bounties />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/powerups" component={() => (
            <ReplitLayout showSidebar={false}>
              <PowerUps />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/badges" component={() => (
            <ReplitLayout showSidebar={false}>
              <Badges />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/subscribe" component={() => (
            <ReplitLayout showSidebar={false}>
              <Subscribe />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/plans" component={() => (
            <ReplitLayout showSidebar={false}>
              <Plans />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/learn" component={() => (
            <ReplitLayout showSidebar={false}>
              <Learn />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/support" component={() => (
            <ReplitLayout showSidebar={false}>
              <Support />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/themes" component={() => (
            <ReplitLayout showSidebar={false}>
              <Themes />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/health" component={() => (
            <ReplitLayout showSidebar={false}>
              <HealthDashboard />
            </ReplitLayout>
          )} />

          <ProtectedRoute path="/sso-configuration" component={() => (
            <ReplitLayout showSidebar={false}>
              <SSOConfiguration />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/audit-logs" component={() => (
            <ReplitLayout showSidebar={false}>
              <AuditLogs />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/custom-roles" component={() => (
            <ReplitLayout showSidebar={false}>
              <CustomRoles />
            </ReplitLayout>
          )} />
          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
        </AtSymbolRedirectHandler>
    </TooltipProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;