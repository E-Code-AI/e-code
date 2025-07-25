import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { ThemeProvider } from "@/components/ThemeProvider";

// Lazy load all pages for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const Editor = lazy(() => import("@/pages/Editor"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const ProjectsPage = lazy(() => import("@/pages/ProjectsPage"));
const ProjectPage = lazy(() => import("@/pages/ProjectPage"));
const RuntimesPage = lazy(() => import("@/pages/RuntimesPage"));
const RuntimeDiagnosticsPage = lazy(() => import("@/pages/RuntimeDiagnosticsPage"));
const RuntimePublicPage = lazy(() => import("@/pages/RuntimePublicPage"));
const RuntimeTest = lazy(() => import("@/pages/RuntimeTest"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Explore = lazy(() => import("@/pages/Explore"));
const Teams = lazy(() => import("@/pages/Teams"));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const UserSettings = lazy(() => import("@/pages/UserSettings"));
const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
const Community = lazy(() => import("@/pages/Community"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
// Public pages
const Landing = lazy(() => import("@/pages/Landing"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Features = lazy(() => import("@/pages/Features"));
const About = lazy(() => import("@/pages/About"));
const Careers = lazy(() => import("@/pages/Careers"));
const Blog = lazy(() => import("@/pages/Blog"));
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
// User area pages
const Account = lazy(() => import("@/pages/Account"));
const Cycles = lazy(() => import("@/pages/Cycles"));
const Bounties = lazy(() => import("@/pages/Bounties"));
const Deployments = lazy(() => import("@/pages/Deployments"));
const Learn = lazy(() => import("@/pages/Learn"));
const Support = lazy(() => import("@/pages/Support"));
const Themes = lazy(() => import("@/pages/Themes"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const Subprocessors = lazy(() => import("@/pages/Subprocessors"));
const StudentDPA = lazy(() => import("@/pages/StudentDPA"));
const Languages = lazy(() => import("@/pages/Languages"));
// Newsletter pages
const NewsletterConfirm = lazy(() => import("@/pages/NewsletterConfirm"));
const NewsletterUnsubscribe = lazy(() => import("@/pages/NewsletterUnsubscribe"));

import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import { ReplitLayout } from "@/components/layout/ReplitLayout";
import { SpotlightSearch } from "@/components/SpotlightSearch";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" />
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
        <CommandPalette />
        <KeyboardShortcuts />
        <Suspense fallback={<PageLoader />}>
          <Switch>
          <Route path="/auth" component={AuthPage} />
          <Route path="/runtime-test" component={RuntimePublicPage} />
          <Route path="/runtime-dependencies" component={RuntimeTest} />
          {/* Public Routes */}
          <Route path="/" component={Landing} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/features" component={Features} />
          <Route path="/about" component={About} />
          <Route path="/careers" component={Careers} />
          <Route path="/blog" component={Blog} />
          <Route path="/docs" component={Docs} />
          <Route path="/contact-sales" component={ContactSales} />
          <Route path="/terms" component={Terms} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/status" component={Status} />
          <Route path="/mobile" component={Mobile} />
          <Route path="/ai" component={AI} />
          <Route path="/press" component={Press} />
          <Route path="/partners" component={Partners} />
          <Route path="/security" component={Security} />
          <Route path="/desktop" component={Desktop} />
          <Route path="/forum" component={Forum} />
          <Route path="/subprocessors" component={Subprocessors} />
          <Route path="/student-dpa" component={StudentDPA} />
          <Route path="/languages" component={Languages} />
          {/* Newsletter pages */}
          <Route path="/newsletter/confirm" component={NewsletterConfirm} />
          <Route path="/newsletter/unsubscribe" component={NewsletterUnsubscribe} />
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
          <ProtectedRoute path="/search" component={() => (
            <ReplitLayout>
              <SearchPage />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/admin" component={() => (
            <ReplitLayout>
              <AdminDashboard />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/account" component={() => (
            <ReplitLayout>
              <Account />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/cycles" component={() => (
            <ReplitLayout>
              <Cycles />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/bounties" component={() => (
            <ReplitLayout>
              <Bounties />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/deployments" component={() => (
            <ReplitLayout>
              <Deployments />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/learn" component={() => (
            <ReplitLayout>
              <Learn />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/support" component={() => (
            <ReplitLayout>
              <Support />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/themes" component={() => (
            <ReplitLayout>
              <Themes />
            </ReplitLayout>
          )} />
          <ProtectedRoute path="/referrals" component={() => (
            <ReplitLayout>
              <Referrals />
            </ReplitLayout>
          )} />
          <Route path="/@:username" component={(params) => (
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