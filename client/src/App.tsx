import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ECodeLoading } from "@/components/ECodeLoading";
import { ThemeProvider } from "@/components/ThemeProvider";

// Lazy load all pages for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const Editor = lazy(() => import("@/pages/Editor"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const DevLogin = lazy(() => import("@/pages/DevLogin"));
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ProjectPage = lazy(() => import("@/pages/ReplitProjectPage"));
const RuntimesPage = lazy(() => import("@/pages/RuntimesPage"));
const RuntimeDiagnosticsPage = lazy(() => import("@/pages/RuntimeDiagnosticsPage"));
const RuntimePublicPage = lazy(() => import("@/pages/RuntimePublicPage"));
const RuntimeTest = lazy(() => import("@/pages/RuntimeTest"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Explore = lazy(() => import("@/pages/Explore"));
const Teams = lazy(() => import("@/pages/Teams"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Badges = lazy(() => import("@/pages/Badges"));
const Education = lazy(() => import("@/pages/Education"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const PowerUps = lazy(() => import("@/pages/PowerUps"));
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
const Mobile = lazy(() => import("@/pages/Mobile"));
const AI = lazy(() => import("@/pages/AI"));
const Press = lazy(() => import("@/pages/Press"));
const Partners = lazy(() => import("@/pages/Partners"));
const Security = lazy(() => import("@/pages/Security"));
const Desktop = lazy(() => import("@/pages/Desktop"));
const Forum = lazy(() => import("@/pages/Forum"));
const AIAgent = lazy(() => import("@/pages/AIAgent"));
const ReplitAIAgentPage = lazy(() => import("@/pages/ReplitAIAgentPage"));
// User area pages
const Account = lazy(() => import("@/pages/Account"));
const Cycles = lazy(() => import("@/pages/Cycles"));
const Bounties = lazy(() => import("@/pages/Bounties"));
const Deployments = lazy(() => import("@/pages/Deployments"));
const Learn = lazy(() => import("@/pages/Learn"));
const Support = lazy(() => import("@/pages/Support"));
const Themes = lazy(() => import("@/pages/Themes"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const Usage = lazy(() => import("@/pages/Usage"));
const Subprocessors = lazy(() => import("@/pages/Subprocessors"));
const HealthDashboard = lazy(() => import("@/pages/HealthDashboard"));
const StudentDPA = lazy(() => import("@/pages/StudentDPA"));
const Languages = lazy(() => import("@/pages/Languages"));
const GitHubImport = lazy(() => import("@/pages/GitHubImport"));
const Git = lazy(() => import("@/pages/Git"));
const Shell = lazy(() => import("@/pages/ResponsiveShell"));
const Secrets = lazy(() => import("@/pages/Secrets"));
const Workflows = lazy(() => import("@/pages/Workflows"));
const SSH = lazy(() => import("@/pages/SSH"));
const SecurityScanner = lazy(() => import("@/pages/SecurityScanner"));
const Dependencies = lazy(() => import("@/pages/Dependencies"));
const ObjectStorage = lazy(() => import("@/pages/ObjectStorage"));
const ReplitDemo = lazy(() => import("@/pages/ReplitDemo"));
// Newsletter pages
const NewsletterConfirmed = lazy(() => import("@/pages/NewsletterConfirmed"));
// Comparison pages
const AWSCloud9Comparison = lazy(() => import("@/pages/compare/AWSCloud9"));
const GitHubCodespacesComparison = lazy(() => import("@/pages/compare/GitHubCodespaces"));
const GlitchComparison = lazy(() => import("@/pages/compare/Glitch"));
const HerokuComparison = lazy(() => import("@/pages/compare/Heroku"));
const CodeSandboxComparison = lazy(() => import("@/pages/compare/CodeSandbox"));
// Legal pages
const DPA = lazy(() => import("@/pages/DPA"));
const CommercialAgreement = lazy(() => import("@/pages/CommercialAgreement"));
const ReportAbuse = lazy(() => import("@/pages/ReportAbuse"));
// Shared snippet page
const SharedSnippet = lazy(() => import("@/pages/SharedSnippet"));

import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { ReplitLayout } from "@/components/layout/ReplitLayout";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

// Loading fallback component
function PageLoader() {
  return <ECodeLoading fullScreen size="lg" text="Loading page..." />;
}

function AppContent() {


  return (
    <TooltipProvider>
      <div className="min-h-screen replit-layout-main">
        <Toaster />
        <SpotlightSearch />
        <CommandPalette />
        <KeyboardShortcuts />
        <Suspense fallback={<PageLoader />}>
          <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/dev-login" component={DevLogin} />
          <Route path="/runtime-test" component={RuntimePublicPage} />
          <Route path="/runtime-dependencies" component={RuntimeTest} />
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
          <Route path="/mobile" component={Mobile} />
          <Route path="/ai" component={AI} />
          <Route path="/ai-agent" component={AIAgent} />
          <Route path="/press" component={Press} />
          <Route path="/partners" component={Partners} />
          <Route path="/security" component={Security} />
          <Route path="/desktop" component={Desktop} />
          <Route path="/forum" component={Forum} />
          <Route path="/subprocessors" component={Subprocessors} />
          <Route path="/student-dpa" component={StudentDPA} />
          <Route path="/languages" component={Languages} />
          <ProtectedRoute path="/github-import" component={() => (
            <ReplitLayout showSidebar={false}>
              <GitHubImport />
            </ReplitLayout>
          )} />
          <Route path="/git" component={Git} />
          {/* Newsletter pages */}
          <Route path="/newsletter-confirmed" component={NewsletterConfirmed} />
          {/* Shared snippet page */}
          <Route path="/share/:shareId" component={SharedSnippet} />
          {/* Comparison pages */}
          <Route path="/compare/aws-cloud9" component={AWSCloud9Comparison} />
          <Route path="/compare/github-codespaces" component={GitHubCodespacesComparison} />
          <Route path="/compare/glitch" component={GlitchComparison} />
          <Route path="/compare/heroku" component={HerokuComparison} />
          <Route path="/compare/codesandbox" component={CodeSandboxComparison} />
          <ProtectedRoute path="/dashboard" component={() => (
            <ReplitLayout showSidebar={false}>
              <Dashboard />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/explore" component={() => (
            <ReplitLayout>
              <Explore />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/teams" component={() => (
            <ReplitLayout showSidebar={false}>
              <Teams />
            </ReplitLayout>
          )} />
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
          <ProtectedRoute path="/badges" component={() => (
            <ReplitLayout showSidebar={false}>
              <Badges />
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
          <ProtectedRoute path="/powerups" component={() => (
            <ReplitLayout showSidebar={false}>
              <PowerUps />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/settings" component={() => (
            <ReplitLayout>
              <Settings />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/settings/notifications" component={() => (
            <ReplitLayout showSidebar={false}>
              <Notifications />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/profile/:username?" component={() => (
            <ReplitLayout>
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
          <ProtectedRoute path="/project/:id" component={() => (
            <ProjectPage />
          )} />
          <ProtectedRoute path="/@:username/:projectname" component={() => (
            <ProjectPage />
          )} />
          <Route path="/@:username" component={() => (
            <ReplitLayout showSidebar={false}>
              <UserProfile />
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
          <ProtectedRoute path="/user/:username" component={() => (
            <ReplitLayout>
              <UserProfile />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/user/settings" component={() => (
            <ReplitLayout>
              <UserSettings />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/templates" component={() => (
            <ReplitLayout>
              <TemplatesPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/community" component={() => (
            <ReplitLayout>
              <Community />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/community/post/:id" component={() => (
            <ReplitLayout>
              <CommunityPost />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/search" component={() => (
            <ReplitLayout>
              <SearchPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/shell" component={() => (
            <ReplitLayout>
              <Shell />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/secrets" component={() => (
            <ReplitLayout>
              <Secrets />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/workflows" component={() => (
            <ReplitLayout>
              <Workflows />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/ssh" component={() => (
            <ReplitLayout>
              <SSH />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/security-scanner" component={() => (
            <ReplitLayout>
              <SecurityScanner />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/dependencies" component={() => (
            <ReplitLayout>
              <Dependencies />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/object-storage" component={() => (
            <ReplitLayout>
              <ObjectStorage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin" component={() => (
            <ReplitLayout>
              <AdminDashboard />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/account" component={() => (
            <ReplitLayout showSidebar={false}>
              <Account />
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
          <ProtectedRoute path="/referrals" component={() => (
            <ReplitLayout>
              <Referrals />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/@:username" component={() => (
            <ReplitLayout>
              <UserProfile />
            </ReplitLayout>
          )} />
          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </div>
    </TooltipProvider>
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