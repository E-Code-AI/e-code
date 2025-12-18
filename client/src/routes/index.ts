import { lazy } from "react";
import { instrumentedLazy } from "../utils/instrumented-lazy";

export const NotFound = instrumentedLazy(() => import("@/pages/not-found"), "NotFound");
export const Home = instrumentedLazy(() => import("@/pages/Home"), "Home");
export const Editor = instrumentedLazy(() => import("@/pages/Editor"), "Editor");
export const IDEPage = instrumentedLazy(() => import("@/pages/IDEPage"), "IDEPage");
export const EditorRedirect = instrumentedLazy(() => import("@/pages/EditorRedirect"), "EditorRedirect");
export const AuthPage = instrumentedLazy(() => import("@/pages/auth-page"), "AuthPage");
export const ProjectsPage = instrumentedLazy(() => import("@/pages/ProjectsPage"), "ProjectsPage");

export const Login = instrumentedLazy(() => import("@/pages/Login"), "Login");
export const Register = instrumentedLazy(() => import("@/pages/Register"), "Register");
export const ProjectPage = instrumentedLazy(() => import("@/pages/ProjectPage"), "ProjectPage");
export const RuntimesPage = lazy(() => import("@/pages/RuntimesPage"));
export const RuntimeDiagnosticsPage = lazy(() => import("@/pages/RuntimeDiagnosticsPage"));
export const RuntimePublicPage = lazy(() => import("@/pages/RuntimePublicPage"));

export const Dashboard = instrumentedLazy(() => import("@/pages/Dashboard"), "Dashboard");
export const Explore = instrumentedLazy(() => import("@/pages/Explore"), "Explore");
export const Teams = instrumentedLazy(() => import("@/pages/Teams"), "Teams");
export const Notifications = instrumentedLazy(() => import("@/pages/Notifications"), "Notifications");
export const Analytics = instrumentedLazy(() => import("@/pages/Analytics"), "Analytics");

export const Education = lazy(() => import("@/pages/Education"));
export const Marketplace = lazy(() => import("@/pages/Marketplace"));
export const TemplateMarketplace = lazy(() => import("@/pages/TemplateMarketplace"));

export const TeamPage = instrumentedLazy(() => import("@/pages/TeamPage"), "TeamPage");
export const TeamSettings = instrumentedLazy(() => import("@/pages/TeamSettings"), "TeamSettings");
export const Settings = instrumentedLazy(() => import("@/pages/Settings"), "Settings");
export const Profile = instrumentedLazy(() => import("@/pages/Profile"), "Profile");
export const UserProfile = instrumentedLazy(() => import("@/pages/UserProfile"), "UserProfile");
export const UserSettings = instrumentedLazy(() => import("@/pages/UserSettings"), "UserSettings");
export const TemplatesPage = lazy(() => import("@/pages/TemplatesPage"));
export const Community = lazy(() => import("@/pages/Community"));
export const CommunityPost = lazy(() => import("@/pages/CommunityPost"));
export const SearchPage = lazy(() => import("@/pages/SearchPage"));
export const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
export const AdminUsage = lazy(() => import("@/pages/AdminUsage"));
export const AdminAIUsage = lazy(() => import("@/pages/AdminAIUsage"));
export const AdminBilling = lazy(() => import("@/pages/AdminBilling"));
export const AdminAIModels = lazy(() => import("@/pages/admin/AIModels"));
export const AdminFormRequests = lazy(() => import("@/pages/admin/FormRequests"));
export const AdminAIOptimization = lazy(() => import("@/pages/admin/AIOptimizationDashboard"));
export const AdminSEOManagement = lazy(() => import("@/pages/admin/SEOManagement"));
export const AdminMonitoring = lazy(() => import("@/pages/admin/AdminMonitoring"));
export const PitchDeck = lazy(() => import("@/pages/admin/PitchDeck"));
export const ChatGPTAdmin = lazy(() => import("@/pages/ChatGPTAdmin"));

export const Landing = instrumentedLazy(() => import("@/pages/Landing"), "Landing");
export const Pricing = instrumentedLazy(() => import("@/pages/Pricing"), "Pricing");
export const Features = instrumentedLazy(() => import("@/pages/Features"), "Features");
export const About = instrumentedLazy(() => import("@/pages/About"), "About");
export const Careers = lazy(() => import("@/pages/Careers"));
export const Blog = lazy(() => import("@/pages/Blog"));
export const BlogDetail = lazy(() => import("@/pages/BlogDetail"));
export const Docs = lazy(() => import("@/pages/Docs"));
export const ContactSales = lazy(() => import("@/pages/ContactSales"));
export const Terms = lazy(() => import("@/pages/Terms"));
export const Privacy = lazy(() => import("@/pages/Privacy"));
export const Status = lazy(() => import("@/pages/Status"));
export const Forum = lazy(() => import("@/pages/Forum"));
export const ComparePage = lazy(() => import("@/pages/compare/ComparePage"));

export const MobileAdmin = lazy(() => import("@/pages/admin/MobileAdminDashboard"));
export const MobileWorkspace = lazy(() => import("@/pages/MobileWorkspace"));
export const MobileMarketingPage = lazy(() => import("@/pages/mobile"));
export const AI = lazy(() => import("@/pages/AI"));
export const Press = lazy(() => import("@/pages/Press"));
export const Partners = lazy(() => import("@/pages/Partners"));
export const Security = lazy(() => import("@/pages/Security"));
export const Desktop = lazy(() => import("@/pages/Desktop"));

export const AIAgentStudio = lazy(() => import("@/pages/AIAgentStudio"));
export const AgentActivity = lazy(() => import("@/pages/AgentActivity"));
export const PublicTeamPage = lazy(() => import("@/pages/PublicTeamPage"));
export const PublicDeploymentsPage = lazy(() => import("@/pages/PublicDeploymentsPage"));
export const Scalability = lazy(() => import("@/pages/Scalability"));
export const MarketingBounties = lazy(() => import("@/pages/marketing/Bounties"));

export const Compare = lazy(() => import("@/pages/marketing/Compare"));
export const VsGitHubCodespaces = lazy(() => import("@/pages/marketing/VsGitHubCodespaces"));
export const VsGlitch = lazy(() => import("@/pages/marketing/VsGlitch"));
export const VsHeroku = lazy(() => import("@/pages/marketing/VsHeroku"));
export const VsCodeSandbox = lazy(() => import("@/pages/marketing/VsCodeSandbox"));
export const VsAwsCloud9 = lazy(() => import("@/pages/marketing/VsAwsCloud9"));

export const AuthenticationDemo = lazy(() =>
  import("@/components/AuthenticationDemo").then((module) => ({
    default: module.AuthenticationDemo,
  }))
);

export const Account = lazy(() => import("@/pages/Account"));
export const ThemeValidation = lazy(() => import("@/pages/ThemeValidation"));
export const Deployments = lazy(() => import("@/pages/Deployments"));
export const Learn = lazy(() => import("@/pages/Learn"));
export const Support = lazy(() => import("@/pages/Support"));
export const Themes = lazy(() => import("@/pages/Themes"));
export const Usage = lazy(() => import("@/pages/Usage"));
export const Subscribe = lazy(() => import("@/pages/Subscribe"));
export const Plans = lazy(() => import("@/pages/Plans"));
export const Cycles = lazy(() => import("@/pages/Cycles"));
export const Bounties = lazy(() => import("@/pages/Bounties"));
export const PowerUps = lazy(() => import("@/pages/PowerUps"));
export const Badges = lazy(() => import("@/pages/Badges"));

export const SSOConfiguration = lazy(() => import("@/pages/SSOConfiguration"));
export const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
export const CustomRoles = lazy(() => import("@/pages/CustomRoles"));
export const Subprocessors = lazy(() => import("@/pages/Subprocessors"));
export const HealthDashboard = instrumentedLazy(() => import("@/pages/HealthDashboard"), "HealthDashboard");
export const StudentDPA = instrumentedLazy(() => import("@/pages/StudentDPA"), "StudentDPA");
export const Languages = instrumentedLazy(() => import("@/pages/Languages"), "Languages");
export const GitHubImport = instrumentedLazy(() => import("@/pages/GitHubImport"), "GitHubImport");

export const Secrets = instrumentedLazy(() => import("@/pages/Secrets"), "Secrets");
export const Workflows = instrumentedLazy(() => import("@/pages/Workflows"), "Workflows");
export const SSH = instrumentedLazy(() => import("@/pages/SSH"), "SSH");
export const SecurityScanner = instrumentedLazy(() => import("@/pages/SecurityScanner"), "SecurityScanner");
export const Dependencies = instrumentedLazy(() => import("@/pages/Dependencies"), "Dependencies");
export const ObjectStorage = instrumentedLazy(() => import("@/pages/ObjectStorage"), "ObjectStorage");

export const DatabaseManagement = instrumentedLazy(() => import("@/pages/DatabaseManagement"), "DatabaseManagement");
export const SecretManagement = instrumentedLazy(() => import("@/pages/SecretManagement"), "SecretManagement");
export const UsageAlerts = instrumentedLazy(() => import("@/pages/UsageAlerts"), "UsageAlerts");

export const NewsletterConfirmed = lazy(() => import("@/pages/NewsletterConfirmed"));
export const NewsletterConfirm = lazy(() => import("@/pages/NewsletterConfirm"));
export const NewsletterUnsubscribe = lazy(() => import("@/pages/NewsletterUnsubscribe"));

export const DPA = lazy(() => import("@/pages/DPA"));
export const CommercialAgreement = lazy(() => import("@/pages/CommercialAgreement"));
export const ReportAbuse = lazy(() => import("@/pages/ReportAbuse"));
export const SharedSnippet = lazy(() => import("@/pages/SharedSnippet"));
export const AIDocumentation = lazy(() => import("@/pages/AIDocumentation"));

export const APISDKPage = lazy(() => import("@/pages/APISDKPage"));
export const MobileAppsPage = lazy(() => import("@/pages/MobileAppsPage"));
export const Apps = lazy(() => import("@/pages/Apps"));
export const FigmaImport = lazy(() => import("@/pages/FigmaImport"));
export const BoltImport = lazy(() => import("@/pages/BoltImport"));
export const LovableImport = lazy(() => import("@/pages/LovableImport"));

export const PerformanceDashboard = lazy(() => import("@/pages/PerformanceDashboard"));

export const AppBuilder = lazy(() => import("@/pages/solutions/AppBuilder"));
export const WebsiteBuilder = lazy(() => import("@/pages/solutions/WebsiteBuilder"));
export const GameBuilder = lazy(() => import("@/pages/solutions/GameBuilder"));
export const DashboardBuilder = lazy(() => import("@/pages/solutions/DashboardBuilder"));
export const ChatbotBuilder = lazy(() => import("@/pages/solutions/ChatbotBuilder"));
export const InternalAIBuilder = lazy(() => import("@/pages/solutions/InternalAIBuilder"));
export const Enterprise = lazy(() => import("@/pages/solutions/Enterprise"));
export const Startups = lazy(() => import("@/pages/solutions/Startups"));
export const Freelancers = lazy(() => import("@/pages/solutions/Freelancers"));

export const Tutorials = lazy(() => import("@/pages/resources/Tutorials"));
export const Changelog = lazy(() => import("@/pages/resources/Changelog"));
export const CaseStudies = lazy(() => import("@/pages/resources/CaseStudies"));
export const HelpCenter = lazy(() => import("@/pages/resources/HelpCenter"));

export const Contact = lazy(() => import("@/pages/Contact"));
export const Accessibility = lazy(() => import("@/pages/Accessibility"));

export const PreviewWithDevTools = lazy(() => import("@/pages/PreviewWithDevTools"));
export const MCPInterface = lazy(() => import("@/pages/MCPInterface"));
export const PolyglotBackendPage = lazy(() => import("@/pages/PolyglotBackendPage"));

export const SolarTechAIChatApp = lazy(() => import("@/pages/SolarTechAIChatApp"));
export const SolarTechCRMApp = lazy(() => import("@/pages/SolarTechCRMApp"));
export const SolarTechStoreApp = lazy(() => import("@/pages/SolarTechStoreApp"));

export const ApplicationIDEWrapper = lazy(() => import("@/components/ApplicationIDEWrapper").then(mod => ({ default: mod.ApplicationIDEWrapper })));
export const FeaturePlaceholder = lazy(() => import("@/pages/FeaturePlaceholder"));

export const AssistantPage = lazy(() => import("@/pages/AssistantPage"));
export const CodeSearchPage = lazy(() => import("@/pages/CodeSearchPage"));
export const ProblemsPage = lazy(() => import("@/pages/ProblemsPage"));

export const DatabasePage = lazy(() => import("@/pages/DatabasePage"));
export const ConsolePage = lazy(() => import("@/pages/ConsolePage"));
export const ShellPage = lazy(() => import("@/pages/ShellPage"));

export const PackagesPage = lazy(() => import("@/pages/PackagesPage"));
export const KVStorePage = lazy(() => import("@/pages/KVStorePage"));
export const PreviewPage = lazy(() => import("@/pages/PreviewPage"));
