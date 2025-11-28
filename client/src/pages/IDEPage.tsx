/**
 * IDEPage - Web IDE with exact 3-panel layout as specified
 * 
 * Layout: AI Agent (30%) | Main Content (52%) | File Explorer (18%)
 * 
 * Reuses existing EditorPage components for functionality while
 * implementing the exact layout specified by the user.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useDeviceType } from '@/hooks/use-media-query';
import { apiRequest } from '@/lib/queryClient';
import { File, Project } from '@shared/schema';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, X, Layers } from 'lucide-react';
import { ECodeLoading } from '@/components/ECodeLoading';
import { Button } from '@/components/ui/button';

// Reuse existing components
import { TopNavBar } from '@/components/ide/TopNavBar';
import { StatusBar } from '@/components/ide/StatusBar';
import { QuickFileSearch } from '@/components/ide/QuickFileSearch';
import { KeyboardShortcutsOverlay } from '@/components/ide/KeyboardShortcutsOverlay';
import { AgentActionsPanel } from '@/components/ide/AgentActionsPanel';
import { ToolsPanel } from '@/components/ide/ToolsPanel';
import { ReplitAgentPanelV3 } from '@/components/ai/ReplitAgentPanelV3';
import { AutonomousWorkspaceViewer } from '@/components/ide/AutonomousWorkspaceViewer';
import { ReplitFileExplorer } from '@/components/editor/ReplitFileExplorer';
import { ReplitMonacoEditor } from '@/components/editor/ReplitMonacoEditor';
import { ResponsiveWebPreview } from '@/components/editor/ResponsiveWebPreview';
import { ReplitConsole } from '@/components/editor/ReplitConsole';
import { ReplitGitPanel } from '@/components/editor/ReplitGitPanel';
import { DatabasePanel } from '@/components/ide/DatabasePanel';
import { ReplitTerminalPanel } from '@/components/editor/ReplitTerminalPanel';
import { SecretsPanel } from '@/components/ide/SecretsPanel';
import { ReplitPackagesPanel } from '@/components/editor/ReplitPackagesPanel';
import { ReplitTestingPanel } from '@/components/editor/ReplitTestingPanel';
import { ReplitProblemsPanel } from '@/components/editor/ReplitProblemsPanel';
import { ReplitSearchPanel } from '@/components/editor/ReplitSearchPanel';
import { ReplitDebuggerPanel } from '@/components/editor/ReplitDebuggerPanel';
import { ReplitSettingsPanel } from '@/components/editor/ReplitSettingsPanel';
import { ReplitOutputPanel } from '@/components/editor/ReplitOutputPanel';
import { ReplitResourcesPanel } from '@/components/editor/ReplitResourcesPanel';
import { ReplitSecurityPanel } from '@/components/editor/ReplitSecurityPanel';
import { ShortcutHint, ShortcutTester } from '@/components/utilities';

// Priority 1 IDE Features (Production-ready)
import { EnvVarsManager } from '@/components/ide/EnvVarsManager';
import { GlobalSearchPanel } from '@/components/ide/GlobalSearchPanel';
import { LogsViewerPanel } from '@/components/ide/LogsViewerPanel';

// Replit-style Progress & Video Replay (Nov 2025)
import { ProgressPanel } from '@/components/ai/ProgressPanel';
import { VideoReplayPlayer } from '@/components/ai/VideoReplayPlayer';

// Additional missing components from EditorPage
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalSearch } from '@/components/GlobalSearch';
import { EnvironmentVariables } from '@/components/EnvironmentVariables';
import { DatabaseBrowser } from '@/components/DatabaseBrowser';
import { ReplitDB } from '@/components/ReplitDB';
import { ImportExport } from '@/components/ImportExport';
import { AIAssistant } from '@/components/AIAssistant';
import { BillingSystem } from '@/components/BillingSystem';
import { ExtensionsMarketplace } from '@/components/ExtensionsMarketplace';
import { CollaborationPresence } from '@/components/editor/CollaborationPresence';
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { RealTimeCollaborators } from '@/components/RealTimeCollaborators';
import { TestRunner } from '@/components/TestRunner';
import { Shell } from '@/components/Shell';

// Lazy load for performance (heavy components)
const DeploymentManager = lazy(() => import('@/components/DeploymentManager').then(module => ({ default: module.DeploymentManager })));
const WebPreview = lazy(() => import('@/components/WebPreview').then(module => ({ default: module.WebPreview })));
const PackageViewer = lazy(() => import('@/components/PackageViewer').then(module => ({ default: module.PackageViewer })));

// Device-specific views (lazy loaded)
// Import from index for tablet (has default export, avoids double-lazy-loading)
const LazyTabletIDEView = lazy(() => import('@/components/tablet'));
// Import from index for mobile (will add default export)
const MobileIDEView = lazy(() => import('@/components/mobile'));

interface Tab {
  id: string;
  label: string;
  closable?: boolean;
}

// Helper to get storage key for this project
const getStorageKey = (projectId: string) => `ide-state-${projectId}`;

// Helper to load state from sessionStorage
const loadPersistedState = (projectId: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(getStorageKey(projectId));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to save state to sessionStorage
const savePersistedState = (projectId: string, state: any) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getStorageKey(projectId), JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
};

export default function IDEPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deviceType = useDeviceType();
  
  const projectId = (params.projectId || params.id) as string;
  
  // REAL: Detect ?agent=true OR ?panel=agent for auto-start (Task 10a/10b + AI Agent integration)
  const searchParams = new URLSearchParams(window.location.search);
  const panelParam = searchParams.get('panel');
  const promptParam = searchParams.get('prompt'); // Already decoded by URLSearchParams.get
  const autoStartAgent = searchParams.get('agent') === 'true' || panelParam === 'agent';
  
  // NEW: Autonomous workspace creation - detect ?bootstrap=token
  const bootstrapToken = searchParams.get('bootstrap');

  // ✅ PHASE 1 FIX: Decode bootstrap token to extract sessionId
  const decodeBootstrapToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('[IDEPage] Invalid JWT format');
        return null;
      }

      // Base64url decode
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error('Invalid base64url string');
        }
        base64 += new Array(5 - pad).join('=');
      }

      const payload = JSON.parse(atob(base64));
      return {
        projectId: payload.projectId,
        sessionId: payload.sessionId,
        conversationId: payload.conversationId,
        userId: payload.userId
      };
    } catch (e) {
      console.error('[IDEPage] Failed to decode bootstrap token:', e);
      return null;
    }
  };

  const tokenData = bootstrapToken ? decodeBootstrapToken(bootstrapToken) : null;
  const agentSessionId = tokenData?.sessionId || null;
  const agentConversationId = tokenData?.conversationId || null;

  // NEW: Support ?prompt=... query param for direct agent invocation
  const storedPrompt = projectId ? sessionStorage.getItem(`agent-prompt-${projectId}`) : null;
  const agentInitialPrompt = promptParam || (autoStartAgent && storedPrompt ? storedPrompt : null);
  
  // NEW: If prompt is provided via query param, persist it to agent session
  useEffect(() => {
    if (promptParam && projectId) {
      // Store prompt in session for ReplitAgent to pick up (no need to decode, already decoded)
      sessionStorage.setItem(`agent-prompt-${projectId}`, promptParam);
      
      // Optional: Clean URL after prompt is stored (for better UX)
      const url = new URL(window.location.href);
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url);
    }
  }, [promptParam, projectId]);
  
  // Handle autonomous workspace viewer completion
  const handleWorkspaceComplete = () => {
    // Remove bootstrap token from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('bootstrap');
    window.history.replaceState({}, '', url);
    
    // Refresh project data with correct query keys
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
    
    toast({
      title: "Workspace Ready!",
      description: "Your AI-powered workspace has been created successfully.",
    });
  };
  
  const handleWorkspaceError = (error: string) => {
    toast({
      title: "Workspace Creation Failed",
      description: error,
      variant: "destructive",
    });
  };
  
  // Load persisted state on mount with validation
  const persistedState = loadPersistedState(projectId);
  
  // Validate file tab consistency: if selectedFileId exists, ensure corresponding tab exists
  const validatedState = persistedState ? {
    ...persistedState,
    selectedFileId: persistedState.selectedFileId && persistedState.tabs?.some((t: Tab) => t.id === `file:${persistedState.selectedFileId}`)
      ? persistedState.selectedFileId
      : undefined,
  } : null;
  
  // State with persistence restoration
  const [activeTab, setActiveTab] = useState(validatedState?.activeTab || 'preview');
  const [tabs, setTabs] = useState<Tab[]>(validatedState?.tabs || [
    { id: 'preview', label: 'Preview', closable: false }
  ]);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>(validatedState?.selectedFileId);
  const [showFileExplorer, setShowFileExplorer] = useState(validatedState?.showFileExplorer ?? true);
  const [isRunning, setIsRunning] = useState(false);
  const [gitBranch, setGitBranch] = useState('main');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showQuickFileSearch, setShowQuickFileSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showReplitDB, setShowReplitDB] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  
  // Keyboard utilities feature flags (SSR-safe)
  const [enableShortcutHint, setEnableShortcutHint] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('keyboard-shortcut-hint') !== 'false';
  });
  const [enableShortcutTester, setEnableShortcutTester] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('keyboard-shortcut-tester') === 'true';
  });
  
  // Persist state to sessionStorage on changes (fixes browser back/forward navigation)
  useEffect(() => {
    if (!projectId) return;
    savePersistedState(projectId, {
      activeTab,
      tabs,
      selectedFileId,
      showFileExplorer,
    });
  }, [projectId, activeTab, tabs, selectedFileId, showFileExplorer]);
  
  // Listen for keyboard settings changes
  useEffect(() => {
    const handleKeyboardSettingsChanged = () => {
      if (typeof window === 'undefined') return;
      setEnableShortcutHint(localStorage.getItem('keyboard-shortcut-hint') !== 'false');
      setEnableShortcutTester(localStorage.getItem('keyboard-shortcut-tester') === 'true');
    };
    
    window.addEventListener('keyboard-settings-changed', handleKeyboardSettingsChanged);
    return () => window.removeEventListener('keyboard-settings-changed', handleKeyboardSettingsChanged);
  }, []);
  
  // Load project
  // ✅ FIX (Nov 24, 2025): Allow anonymous access with bootstrap token
  // ✅ FIX (Nov 24, 2025): Use structured query key with custom queryFn for clean REST API
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ['/api/projects', projectId, { bootstrap: !!bootstrapToken }],
    queryFn: async () => {
      const url = `/api/projects/${projectId}${bootstrapToken ? `?bootstrap=${bootstrapToken}` : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch project: ${res.status} ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && (!!user || !!bootstrapToken),
  });
  
  // Load files
  // ✅ FIX (Nov 24, 2025): Allow anonymous access with bootstrap token using structured query key
  const { data: files = [] } = useQuery<File[]>({
    queryKey: ['/api/projects', projectId, 'files', { bootstrap: !!bootstrapToken }],
    queryFn: async () => {
      const url = `/api/projects/${projectId}/files${bootstrapToken ? `?bootstrap=${bootstrapToken}` : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch files: ${res.status} ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!projectId && (!!user || !!bootstrapToken),
  });
  
  // Available tools/panels that can be added (comprehensive list with all features)
  const availableTools = [
    { id: 'console', label: 'Console', icon: '🖥️' },
    { id: 'terminal', label: 'Terminal', icon: '⌨️' },
    { id: 'git', label: 'Git', icon: '🔀' },
    { id: 'database', label: 'Database', icon: '💾' },
    { id: 'secrets', label: 'Secrets', icon: '🔐' },
    { id: 'packages', label: 'Packages', icon: '📦' },
    { id: 'testing', label: 'Tests', icon: '🧪' },
    { id: 'problems', label: 'Problems', icon: '⚠️' },
    { id: 'search', label: 'Search', icon: '🔍' },
    { id: 'debugger', label: 'Debugger', icon: '🐛' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    // Additional tools from EditorPage
    { id: 'output', label: 'Output', icon: '📄' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'resources', label: 'Resources', icon: '📊' },
    { id: 'deployment', label: 'Deploy', icon: '🚀' },
    { id: 'env', label: 'Environment', icon: '🔑' },
    { id: 'import-export', label: 'Import/Export', icon: '📁' },
    { id: 'database-browser', label: 'DB Browser', icon: '🗄️' },
    { id: 'package-viewer', label: 'Package Viewer', icon: '📦' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: '🤖' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'extensions', label: 'Extensions', icon: '🧩' },
    { id: 'test-runner', label: 'Test Runner', icon: '🧪' },
    { id: 'shell', label: 'Shell', icon: '⌨️' },
    { id: 'webpreview', label: 'Web Preview', icon: '🌐' },
    // Priority 1 Production-Ready Features
    { id: 'env-vars', label: 'Env Vars Manager', icon: '🔐' },
    { id: 'global-search', label: 'Global Search', icon: '🔎' },
    { id: 'logs', label: 'Logs Viewer', icon: '📋' },
    // Replit-style Progress & Video Replay (Nov 2025)
    { id: 'progress', label: 'Progress', icon: '📊' },
    { id: 'video-replay', label: 'Video Replay', icon: '🎬' },
  ];
  
  // Validate tool registry in development
  if (import.meta.env.DEV) {
    import('@/lib/tool-registry').then(({ validateToolRegistry }) => {
      const validation = validateToolRegistry(availableTools);
      if (!validation.valid) {
        console.warn('[Tool Registry] Missing tools:', validation.missing);
      }
    });
  }

  // Handlers
  const handleFileSelect = (file: any) => {
    setSelectedFileId(file.id);
    const tabId = `file:${file.id}`;
    if (!tabs.find(t => t.id === tabId)) {
      setTabs(prev => [...prev, { id: tabId, label: file.name, closable: true }]);
    }
    setActiveTab(tabId);
  };
  
  const handleAddTool = (toolId: string) => {
    const tool = availableTools.find(t => t.id === toolId);
    if (!tool) return;
    
    // Don't add duplicate tabs
    if (tabs.find(t => t.id === toolId)) {
      setActiveTab(toolId);
      return;
    }
    
    setTabs(prev => [...prev, { id: toolId, label: tool.label, closable: true }]);
    setActiveTab(toolId);
  };
  
  const handleTabClose = (tabId: string) => {
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTab === tabId) {
      setActiveTab(tabs[0]?.id || 'preview');
    }
  };
  
  const handleRunStop = () => {
    setIsRunning(prev => !prev);
    toast({
      title: isRunning ? 'Project stopped' : 'Project running',
      description: isRunning ? 'Server stopped' : 'Server started on port 5000',
    });
  };
  
  // Keyboard shortcuts (comprehensive)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      // Cmd/Ctrl + P: Quick File Search
      if (modKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickFileSearch(true);
      }
      
      // Cmd/Ctrl + K: Command Palette
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // Cmd/Ctrl + Shift + F: Global Search
      if (modKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      
      // Cmd/Ctrl + Shift + E: Environment Variables
      if (modKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        handleAddTool('env');
      }
      
      // Cmd/Ctrl + /: Keyboard Shortcuts
      if (modKey && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Render main content based on active tab (comprehensive with all features)
  const renderContent = () => {
    switch (activeTab) {
      case 'preview':
        return <ResponsiveWebPreview projectId={projectId} />;
      case 'console':
        return <ReplitConsole projectId={projectId} />;
      case 'terminal':
        return <ReplitTerminalPanel projectId={projectId} />;
      case 'git':
        return <ReplitGitPanel projectId={projectId} />;
      case 'database':
        return <DatabasePanel projectId={projectId} />;
      case 'secrets':
        return <SecretsPanel projectId={projectId} />;
      case 'packages':
        return <ReplitPackagesPanel projectId={projectId} />;
      case 'testing':
        return <ReplitTestingPanel projectId={projectId} />;
      case 'problems':
        return <ReplitProblemsPanel projectId={projectId} />;
      case 'search':
        return <ReplitSearchPanel projectId={projectId} />;
      case 'debugger':
        return <ReplitDebuggerPanel projectId={projectId} />;
      case 'settings':
        return <ReplitSettingsPanel projectId={projectId} />;
      // Additional panels from EditorPage
      case 'output':
        return <ReplitOutputPanel projectId={projectId} />;
      case 'security':
        return <ReplitSecurityPanel projectId={projectId} />;
      case 'resources':
        return <ReplitResourcesPanel projectId={projectId} />;
      case 'deployment':
        return (
          <Suspense fallback={<ECodeLoading centered size="md" text="Loading deployment..." />}>
            <DeploymentManager projectId={parseInt(projectId, 10)} />
          </Suspense>
        );
      case 'env':
        return <EnvironmentVariables projectId={parseInt(projectId, 10)} />;
      case 'import-export':
        return <ImportExport projectId={parseInt(projectId, 10)} />;
      case 'database-browser':
        return <DatabaseBrowser projectId={projectId} />;
      case 'package-viewer':
        return (
          <Suspense fallback={<ECodeLoading centered size="md" text="Loading package viewer..." />}>
            <PackageViewer projectId={projectId} />
          </Suspense>
        );
      case 'ai-assistant':
        return <AIAssistant projectId={parseInt(projectId, 10)} />;
      case 'billing':
        return <BillingSystem userId={typeof user?.id === 'number' ? user.id : parseInt(String(user?.id || '0'), 10)} />;
      case 'extensions':
        return <ExtensionsMarketplace />;
      case 'test-runner':
        return <TestRunner projectId={projectId} />;
      case 'shell':
        return <Shell projectId={parseInt(projectId, 10)} />;
      case 'webpreview':
        return (
          <Suspense fallback={<ECodeLoading centered size="md" text="Loading web preview..." />}>
            <WebPreview projectId={parseInt(projectId, 10)} />
          </Suspense>
        );
      // Priority 1 Production-Ready Features
      case 'env-vars':
        return <EnvVarsManager projectId={projectId} />;
      case 'global-search':
        return <GlobalSearchPanel projectId={projectId} />;
      case 'logs':
        return <LogsViewerPanel projectId={projectId} />;
      // Replit-style Progress & Video Replay (Nov 2025)
      case 'progress':
        return <ProgressPanel projectId={projectId} onFileNavigate={(path) => console.log('Navigate to:', path)} />;
      case 'video-replay':
        return <VideoReplayPlayer 
          testSteps={[]} 
          duration={0} 
          testName="No recording selected" 
          testStatus="passed" 
        />;
      default:
        if (activeTab.startsWith('file:') && selectedFileId) {
          return (
            <ReplitMonacoEditor
              projectId={projectId}
              fileId={selectedFileId}
              onRunCode={handleRunStop}
              onStopCode={handleRunStop}
              isRunning={isRunning}
            />
          );
        }
        return <div className="flex items-center justify-center h-full text-muted-foreground">Select a file or tool</div>;
    }
  };
  
  // ✅ CRITICAL FIX: Load project FIRST before device-specific rendering
  // This ensures mobile/tablet views receive the real project UUID, not the URL slug
  if (isLoadingProject) {
    return <ECodeLoading fullScreen size="lg" text="Loading workspace..." />;
  }
  
  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }
  
  // ✅ Device-aware rendering: Route to optimized views for mobile/tablet
  // Use project.id (UUID) with fallback to projectId (URL param, which backend normalizes to UUID)
  // Optional chaining defends against guard regressions
  const normalizedProjectId = String(project?.id ?? projectId);
  
  if (deviceType === 'mobile') {
    return (
      <Suspense fallback={<ECodeLoading fullScreen size="lg" text="Loading mobile workspace..." />}>
        <MobileIDEView projectId={normalizedProjectId} />
      </Suspense>
    );
  }
  
  if (deviceType === 'tablet') {
    return (
      <Suspense fallback={<ECodeLoading fullScreen size="lg" text="Loading tablet workspace..." />}>
        <LazyTabletIDEView projectId={normalizedProjectId} />
      </Suspense>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <TopNavBar
        projectName={project.name}
        projectSlug={project.slug || String(project.id)}
        ownerUsername={user?.username || ''}
        isDeployed={false}
        onRun={handleRunStop}
        isRunning={isRunning}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTabClose={handleTabClose}
        availableTools={availableTools}
        onAddTool={handleAddTool}
        showFileExplorer={showFileExplorer}
        onToggleFileExplorer={() => setShowFileExplorer((prev: boolean) => !prev)}
        showCollaboration={showCollaboration}
        onToggleCollaboration={() => setShowCollaboration((prev: boolean) => !prev)}
        collaboratorCount={0}
      />
      
      {/* 3-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT: AI Agent Panel (30%) */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col border-r">
            <Tabs defaultValue="agent" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="agent" className="gap-2" data-testid="tab-agent">
                  <Brain className="h-4 w-4" />
                  Agent
                </TabsTrigger>
                <TabsTrigger value="actions" className="gap-2" data-testid="tab-actions">
                  <Zap className="h-4 w-4" />
                  Actions
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-2" data-testid="tab-tools">
                  <Layers className="h-4 w-4" />
                  Tools
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="agent" className="flex-1 mt-0 overflow-hidden">
                <ReplitAgentPanelV3
                  projectId={projectId}
                  sessionId={agentSessionId}
                  externalConversationId={agentConversationId}
                  initialPrompt={agentInitialPrompt || undefined}
                  autoStart={!!bootstrapToken || autoStartAgent}
                  mode="desktop"
                  onBuildComplete={async () => {
                    // REAL: Auto-start preview when build completes (Task 12)
                    setActiveTab('preview');
                    
                    // REAL: Auto-start runtime (Task 13) - Run button executes by default
                    try {
                      const res = await apiRequest('POST', '/api/runtime/start', {
                        projectId,
                        mainFile: undefined, // Auto-detection
                        timeout: 30000
                      });
                      
                      if (res.ok) {
                        toast({
                          title: 'Build Complete',
                          description: 'Preview is starting...',
                        });
                      } else {
                        const error = await res.json();
                        toast({
                          title: 'Build Complete',
                          description: 'Preview available (runtime start failed)',
                          variant: 'destructive',
                        });
                      }
                    } catch (err) {
                      toast({
                        title: 'Build Complete',
                        description: 'Preview available (runtime start failed)',
                        variant: 'destructive',
                      });
                    }
                  }}
                />
              </TabsContent>
              
              <TabsContent value="actions" className="flex-1 mt-0 overflow-hidden">
                <AgentActionsPanel projectId={projectId} />
              </TabsContent>
              
              <TabsContent value="tools" className="flex-1 mt-0 overflow-hidden">
                <ToolsPanel
                  availableTools={availableTools}
                  onSelectTool={handleAddTool}
                  activeTabs={tabs.map(t => t.id)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* CENTER: Main Content (52%) */}
        <ResizablePanel defaultSize={showFileExplorer ? 52 : 70} minSize={30}>
          <div className="h-full flex flex-col">
            {renderContent()}
          </div>
        </ResizablePanel>
        
        {showFileExplorer && (
          <>
            <ResizableHandle withHandle />
            
            {/* RIGHT: File Explorer (18%) */}
            <ResizablePanel defaultSize={18} minSize={15} maxSize={30}>
              <div className="h-full flex flex-col border-l">
                <div className="h-10 border-b flex items-center justify-between px-3">
                  <h3 className="font-semibold text-sm">Files</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFileExplorer(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ReplitFileExplorer
                  projectId={projectId}
                  onFileSelect={handleFileSelect}
                  selectedFileId={selectedFileId}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      
      {/* Status Bar */}
      <StatusBar
        gitBranch={gitBranch}
        isRunning={isRunning}
        cursorPosition={cursorPosition}
        language="TypeScript"
        encoding="UTF-8"
        onShowShortcuts={() => setShowKeyboardShortcuts(true)}
      />
      
      {/* Modals & Overlays */}
      <QuickFileSearch
        open={showQuickFileSearch}
        onOpenChange={setShowQuickFileSearch}
        files={files.map(f => ({
          id: f.id.toString(),
          name: f.name,
          type: 'file' as const,
          path: f.path,
          content: f.content || ''
        }))}
        onFileSelect={(file) => {
          const fileId = parseInt(file.id, 10);
          if (fileId) {
            setSelectedFileId(fileId);
            handleFileSelect({ id: fileId, name: file.name, path: file.path });
          }
          setShowQuickFileSearch(false);
        }}
      />
      
      <KeyboardShortcutsOverlay
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />
      
      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        files={files}
        onFileSelect={(file) => {
          setShowCommandPalette(false);
          handleFileSelect(file);
        }}
        onToolSelect={(tool) => {
          setShowCommandPalette(false);
          handleAddTool(tool);
        }}
      />
      
      {/* Global Search */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        projectId={projectId}
        onFileSelect={(file) => {
          handleFileSelect({ id: file.id, name: file.name, path: file.name });
          setShowGlobalSearch(false);
        }}
      />
      
      {/* Replit DB Modal */}
      {showReplitDB && (
        <ReplitDB
          projectId={parseInt(projectId, 10)}
        />
      )}
      
      {/* Collaboration Panel Modal */}
      {showCollaboration && user && (
        <div className="fixed inset-y-0 right-0 w-80 z-50 shadow-xl border-l bg-background" data-testid="collab-panel">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Collaboration</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowCollaboration(false)}
              className="h-7 w-7"
              data-testid="close-collab-panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CollaborationPanel
            projectId={parseInt(projectId, 10)}
            projectName={project?.name}
            currentUser={user}
            currentFile={selectedFileId ? files.find(f => f.id === selectedFileId)?.name : undefined}
            className="h-[calc(100%-48px)]"
          />
        </div>
      )}
      
      {/* Keyboard Utilities */}
      {enableShortcutHint && <ShortcutHint />}
      {enableShortcutTester && <ShortcutTester />}
      
      {/* Autonomous Workspace Creation Viewer */}
      <AutonomousWorkspaceViewer
        bootstrapToken={bootstrapToken}
        projectId={projectId}
        onComplete={handleWorkspaceComplete}
        onError={handleWorkspaceError}
      />
    </div>
  );
}
