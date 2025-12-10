/**
 * IDEPage - Web IDE with exact 3-panel layout as specified
 * 
 * Layout: AI Agent (30%) | Main Content (52%) | File Explorer (18%)
 * 
 * Reuses existing EditorPage components for functionality while
 * implementing the exact layout specified by the user.
 */

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
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
import { Brain, Zap, X, Layers, Rocket } from 'lucide-react';
import { ECodeLoading } from '@/components/ECodeLoading';
import { Button } from '@/components/ui/button';

// Core lightweight components (static imports)
import { TopNavBar } from '@/components/ide/TopNavBar';
import { StatusBar, type DeploymentStatus } from '@/components/ide/StatusBar';
import { ReplitActivityBar, type ActivityItem } from '@/components/ide/ReplitActivityBar';
import { ReplitTabBar, type Tab as EditorTab } from '@/components/ide/ReplitTabBar';
import { ReplitToolsSheet } from '@/components/ide/ReplitToolsSheet';
import { QuickFileSearch } from '@/components/ide/QuickFileSearch';
import { KeyboardShortcutsOverlay } from '@/components/ide/KeyboardShortcutsOverlay';
import { ReplitFileExplorer } from '@/components/editor/ReplitFileExplorer';
import { ShortcutHint, ShortcutTester } from '@/components/utilities';

// Heavy components - LAZY LOADED for bundle optimization
const ReplitMonacoEditor = lazy(() => import('@/components/editor/ReplitMonacoEditor').then(mod => ({ default: mod.ReplitMonacoEditor })));
const ReplitTerminalPanel = lazy(() => import('@/components/editor/ReplitTerminalPanel').then(mod => ({ default: mod.ReplitTerminalPanel })));
const ReplitDeploymentPanel = lazy(() => import('@/components/ide/ReplitDeploymentPanel').then(mod => ({ default: mod.ReplitDeploymentPanel })));
const ReplitAgentPanelV3 = lazy(() => import('@/components/ai/ReplitAgentPanelV3').then(mod => ({ default: mod.ReplitAgentPanelV3 })));
const AutonomousWorkspaceViewer = lazy(() => import('@/components/ide/AutonomousWorkspaceViewer').then(mod => ({ default: mod.AutonomousWorkspaceViewer })));
const ReplitGitPanel = lazy(() => import('@/components/editor/ReplitGitPanel').then(mod => ({ default: mod.ReplitGitPanel })));
const DatabasePanel = lazy(() => import('@/components/ide/DatabasePanel').then(mod => ({ default: mod.DatabasePanel })));
const ConsolePanel = lazy(() => import('@/components/ide/ConsolePanel').then(mod => ({ default: mod.ConsolePanel })));
const ResponsiveWebPreview = lazy(() => import('@/components/editor/ResponsiveWebPreview').then(mod => ({ default: mod.ResponsiveWebPreview })));

// Secondary panels - lazy loaded
const AgentActionsPanel = lazy(() => import('@/components/ide/AgentActionsPanel').then(mod => ({ default: mod.AgentActionsPanel })));
const ToolsPanel = lazy(() => import('@/components/ide/ToolsPanel').then(mod => ({ default: mod.ToolsPanel })));
const SecretsPanel = lazy(() => import('@/components/ide/SecretsPanel').then(mod => ({ default: mod.SecretsPanel })));
const ReplitPackagesPanel = lazy(() => import('@/components/editor/ReplitPackagesPanel').then(mod => ({ default: mod.ReplitPackagesPanel })));
const ReplitTestingPanel = lazy(() => import('@/components/editor/ReplitTestingPanel').then(mod => ({ default: mod.ReplitTestingPanel })));
const ReplitProblemsPanel = lazy(() => import('@/components/editor/ReplitProblemsPanel').then(mod => ({ default: mod.ReplitProblemsPanel })));
const ReplitSearchPanel = lazy(() => import('@/components/editor/ReplitSearchPanel').then(mod => ({ default: mod.ReplitSearchPanel })));
const ReplitDebuggerPanel = lazy(() => import('@/components/editor/ReplitDebuggerPanel').then(mod => ({ default: mod.ReplitDebuggerPanel })));
const ReplitSettingsPanel = lazy(() => import('@/components/editor/ReplitSettingsPanel').then(mod => ({ default: mod.ReplitSettingsPanel })));
const ReplitOutputPanel = lazy(() => import('@/components/editor/ReplitOutputPanel').then(mod => ({ default: mod.ReplitOutputPanel })));
const ReplitResourcesPanel = lazy(() => import('@/components/editor/ReplitResourcesPanel').then(mod => ({ default: mod.ReplitResourcesPanel })));
const ReplitSecurityPanel = lazy(() => import('@/components/editor/ReplitSecurityPanel').then(mod => ({ default: mod.ReplitSecurityPanel })));

// Priority 1 IDE Features - lazy loaded
const EnvVarsManager = lazy(() => import('@/components/ide/EnvVarsManager').then(mod => ({ default: mod.EnvVarsManager })));
const GlobalSearchPanel = lazy(() => import('@/components/ide/GlobalSearchPanel').then(mod => ({ default: mod.GlobalSearchPanel })));
const LogsViewerPanel = lazy(() => import('@/components/ide/LogsViewerPanel').then(mod => ({ default: mod.LogsViewerPanel })));

// Replit-style Progress & Video Replay - lazy loaded
const ProgressPanel = lazy(() => import('@/components/ai/ProgressPanel').then(mod => ({ default: mod.ProgressPanel })));
const VideoReplayPlayer = lazy(() => import('@/components/ai/VideoReplayPlayer').then(mod => ({ default: mod.VideoReplayPlayer })));

// Replit-style Visual Editor, Rewind, Resources, Workflows - lazy loaded
const VisualEditorPanel = lazy(() => import('@/components/ide/VisualEditorPanel').then(mod => ({ default: mod.VisualEditorPanel })));
const RewindPanel = lazy(() => import('@/components/ide/RewindPanel').then(mod => ({ default: mod.RewindPanel })));
const ResourcesPanel = lazy(() => import('@/components/ide/ResourcesPanel').then(mod => ({ default: mod.ResourcesPanel })));
const WorkflowsPanel = lazy(() => import('@/components/ide/WorkflowsPanel').then(mod => ({ default: mod.WorkflowsPanel })));
const EnhancedRunButton = lazy(() => import('@/components/ide/EnhancedRunButton').then(mod => ({ default: mod.EnhancedRunButton })));

// Additional components - lazy loaded
const CommandPalette = lazy(() => import('@/components/CommandPalette').then(mod => ({ default: mod.CommandPalette })));
const GlobalSearch = lazy(() => import('@/components/GlobalSearch').then(mod => ({ default: mod.GlobalSearch })));
const EnvironmentVariables = lazy(() => import('@/components/EnvironmentVariables').then(mod => ({ default: mod.EnvironmentVariables })));
const DatabaseBrowser = lazy(() => import('@/components/DatabaseBrowser').then(mod => ({ default: mod.DatabaseBrowser })));
const ReplitDB = lazy(() => import('@/components/ReplitDB').then(mod => ({ default: mod.ReplitDB })));
const ImportExport = lazy(() => import('@/components/ImportExport').then(mod => ({ default: mod.ImportExport })));
const AIAssistant = lazy(() => import('@/components/AIAssistant').then(mod => ({ default: mod.AIAssistant })));
const BillingSystem = lazy(() => import('@/components/BillingSystem').then(mod => ({ default: mod.BillingSystem })));
const ExtensionsMarketplace = lazy(() => import('@/components/ExtensionsMarketplace').then(mod => ({ default: mod.ExtensionsMarketplace })));
const CollaborationPresence = lazy(() => import('@/components/editor/CollaborationPresence').then(mod => ({ default: mod.CollaborationPresence })));
const CollaborationPanel = lazy(() => import('@/components/CollaborationPanel').then(mod => ({ default: mod.CollaborationPanel })));
const RealTimeCollaborators = lazy(() => import('@/components/RealTimeCollaborators').then(mod => ({ default: mod.RealTimeCollaborators })));
const TestRunner = lazy(() => import('@/components/TestRunner').then(mod => ({ default: mod.TestRunner })));
const Shell = lazy(() => import('@/components/Shell').then(mod => ({ default: mod.Shell })));

// Lazy load for performance (heavy components)
const DeploymentManager = lazy(() => import('@/components/DeploymentManager').then(module => ({ default: module.DeploymentManager })));
const WebPreview = lazy(() => import('@/components/WebPreview').then(module => ({ default: module.WebPreview })));
const PackageViewer = lazy(() => import('@/components/PackageViewer').then(module => ({ default: module.PackageViewer })));

// Unified responsive IDE layout (replaces separate mobile/tablet views)
const UnifiedIDELayout = lazy(() => import('@/components/ide/UnifiedIDELayout'));

interface Tab {
  id: string;
  label: string;
  closable?: boolean;
  pinned?: boolean;
  modified?: boolean;
  path?: string;
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
  // DEBUG: Track IDEPage mount/unmount
  useEffect(() => {
    console.log('[IDEPage] === COMPONENT MOUNTED ===');
    return () => {
      console.log('[IDEPage] === COMPONENT UNMOUNTED ===');
    };
  }, []);
  
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
  // Note: Bootstrap prompt is calculated below using project.description (requires project to load first)
  
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
  // ✅ FIX (Dec 1, 2025): Memoize callbacks to prevent WebSocket reconnection on re-renders
  const handleWorkspaceComplete = useCallback(() => {
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
  }, [projectId, toast]);
  
  const handleWorkspaceError = useCallback((error: string) => {
    toast({
      title: "Workspace Creation Failed",
      description: error,
      variant: "destructive",
    });
  }, [toast]);
  
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
  
  // Problems count for ActivityBar badge (could connect to LSP/diagnostics)
  const [problemsCount, setProblemsCount] = useState<{ errors: number; warnings: number }>({ errors: 0, warnings: 0 });
  
  // Git changes count for ActivityBar badge (could connect to git status)
  const [gitChangesCount, setGitChangesCount] = useState(0);
  
  // Lift Agent Tools settings to parent level with sessionStorage persistence to survive remounts
  const getStoredAgentToolsSettings = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(`agent-tools-settings-${projectId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[IDEPage] Loaded agentToolsSettings from sessionStorage:', stored);
        return parsed;
      }
    } catch (e) {
      console.error('[IDEPage] Failed to load agentToolsSettings from sessionStorage:', e);
    }
    return null;
  };
  
  const defaultAgentToolsSettings = {
    maxAutonomy: false,
    appTesting: true, // ON by default per Replit Agent 3
    extendedThinking: false,
    highPowerModels: false,
    webSearch: false
  };
  
  const [agentToolsSettings, setAgentToolsSettingsInternal] = useState(() => {
    return getStoredAgentToolsSettings() || defaultAgentToolsSettings;
  });
  
  // Wrapper that persists to sessionStorage
  const setAgentToolsSettings = useCallback((newSettings: typeof defaultAgentToolsSettings) => {
    console.log('[IDEPage] setAgentToolsSettings called with:', JSON.stringify(newSettings));
    setAgentToolsSettingsInternal(newSettings);
    try {
      sessionStorage.setItem(`agent-tools-settings-${projectId}`, JSON.stringify(newSettings));
      console.log('[IDEPage] Saved agentToolsSettings to sessionStorage');
    } catch (e) {
      console.error('[IDEPage] Failed to save agentToolsSettings to sessionStorage:', e);
    }
  }, [projectId]);
  
  // DEBUG: Track agentToolsSettings changes in parent
  useEffect(() => {
    console.log('[IDEPage] agentToolsSettings changed:', JSON.stringify(agentToolsSettings));
  }, [agentToolsSettings]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showReplitDB, setShowReplitDB] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  
  // Activity bar state - controls which sidebar panel is active
  const [activeActivityItem, setActiveActivityItem] = useState<ActivityItem>('files');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Editor tabs state for ReplitTabBar
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeEditorTabId, setActiveEditorTabId] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  
  // Deployment panel state - controlled by TopNavBar Publish button dropdown
  const [deploymentTab, setDeploymentTab] = useState<'deploy' | 'logs' | 'analytics' | null>(null);
  
  // Left panel tab state - controlled to allow switching from TopNavBar actions
  const [leftPanelTab, setLeftPanelTab] = useState<string>('agent');
  
  // Effect to switch to deployment tab when triggered from Publish button dropdown
  useEffect(() => {
    if (deploymentTab) {
      setLeftPanelTab('deployment');
    }
  }, [deploymentTab]);
  
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
  
  // ✅ FIX (Dec 7, 2025): Persist bootstrap prompt in sessionStorage to survive component remounts
  // Problem: React state resets when component remounts, causing prompt to become null
  // Solution: Use sessionStorage + useState to capture prompt once and persist across remounts
  // IMPORTANT: Use 'agent-prompt-${projectId}' key - this is the key that ReplitAgentPanelV3 reads!
  const bootstrapPromptKey = `agent-prompt-${projectId}`;
  
  // Initialize from sessionStorage on first mount
  const [persistedBootstrapPrompt, setPersistedBootstrapPrompt] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(bootstrapPromptKey);
      if (saved) {
        console.log('[IDEPage] ✅ Recovered bootstrap prompt from sessionStorage:', saved.substring(0, 50) + '...');
        return saved;
      }
    }
    return null;
  });
  
  // Capture bootstrap prompt once when project loads, save to sessionStorage
  useEffect(() => {
    if (bootstrapToken && project?.description && !persistedBootstrapPrompt) {
      console.log('[IDEPage] ✅ Persisting bootstrap prompt to sessionStorage (key: agent-prompt):', project.description.substring(0, 50) + '...');
      setPersistedBootstrapPrompt(project.description);
      sessionStorage.setItem(bootstrapPromptKey, project.description);
    }
  }, [bootstrapToken, project?.description, persistedBootstrapPrompt, bootstrapPromptKey]);
  
  // Calculate final prompt with priority chain
  const agentInitialPrompt = useMemo(() => {
    // Priority 1: URL ?prompt= parameter
    if (promptParam) return promptParam;
    // Priority 2: Stored prompt with autoStartAgent flag
    if (autoStartAgent && storedPrompt) return storedPrompt;
    // Priority 3: Persisted bootstrap prompt (survives refetches)
    if (persistedBootstrapPrompt) {
      console.log('[IDEPage] ✅ Using persisted bootstrap prompt:', persistedBootstrapPrompt.substring(0, 50) + '...');
      return persistedBootstrapPrompt;
    }
    // Priority 4: Direct from project (fallback for first load)
    if (bootstrapToken && project?.description) {
      console.log('[IDEPage] ✅ Using project.description as agentInitialPrompt:', project.description.substring(0, 50) + '...');
      return project.description;
    }
    return null;
  }, [promptParam, autoStartAgent, storedPrompt, persistedBootstrapPrompt, bootstrapToken, project?.description]);
  
  // Auto-start runtime when IDE loads (Replit-like behavior)
  // ✅ FIX (Dec 7, 2025): Start runtime even for empty projects - don't require files.length > 0
  const [runtimeAutoStarted, setRuntimeAutoStarted] = useState(false);
  
  useEffect(() => {
    // Auto-start once when project is loaded (even if empty)
    if (!runtimeAutoStarted && projectId && project && !isLoadingProject) {
      setRuntimeAutoStarted(true);
      
      // Start runtime automatically in the background
      apiRequest('POST', '/api/runtime/start', {
        projectId,
        mainFile: undefined, // Auto-detection
        timeout: 30000
      }).then(() => {
        setIsRunning(true);
        console.log('[IDEPage] Runtime auto-started successfully');
      }).catch((err) => {
        // Silent fail - user can manually start if needed
        console.log('[IDEPage] Auto-start runtime failed:', err.message);
      });
    }
  }, [projectId, project, isLoadingProject, runtimeAutoStarted]);
  
  // Query publish status for StatusBar deployment indicator
  interface PublishState {
    status: 'idle' | 'publishing' | 'live' | 'failed' | 'needs-republish';
    url?: string;
    deployedAt?: string;
    errorMessage?: string;
  }
  
  const { data: publishState } = useQuery<PublishState>({
    queryKey: ['/api/projects', projectId, 'publish', 'status'],
    enabled: !!projectId && !!user,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'publishing' ? 2000 : false;
    },
  });
  
  // Map publish status to DeploymentStatus for StatusBar
  const deploymentStatus: DeploymentStatus = publishState?.status === 'publishing' 
    ? 'deploying' 
    : publishState?.status === 'live' || publishState?.status === 'needs-republish'
    ? 'live'
    : publishState?.status === 'failed'
    ? 'failed'
    : 'idle';
  
  // Query git status for badge count on ActivityBar
  interface GitStatus {
    branch: string;
    ahead: number;
    behind: number;
    staged: string[];
    unstaged: string[];
    untracked: string[];
  }
  
  const { data: gitStatus } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
    enabled: !!projectId && !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Update gitChangesCount from git status query
  useEffect(() => {
    if (gitStatus) {
      const totalChanges = (gitStatus.staged?.length || 0) + 
                          (gitStatus.unstaged?.length || 0) + 
                          (gitStatus.untracked?.length || 0);
      setGitChangesCount(totalChanges);
      if (gitStatus.branch) {
        setGitBranch(gitStatus.branch);
      }
    }
  }, [gitStatus]);
  
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
    // Replit-style Visual Editor, Rewind, Workflows (Dec 2025)
    { id: 'visual-editor', label: 'Visual Editor', icon: '🎨' },
    { id: 'rewind', label: 'Rewind', icon: '⏪' },
    { id: 'workflows', label: 'Workflows', icon: '⚡' },
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
  
  // Handle tab reorder via drag and drop
  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);
  
  // Handle tab pin/unpin (Replit-style)
  const handleTabPin = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabIndex = prev.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;
      
      const tab = prev[tabIndex];
      const newTab = { ...tab, pinned: !tab.pinned };
      const newTabs = prev.filter(t => t.id !== tabId);
      
      // Pinned tabs go to the front
      if (newTab.pinned) {
        const pinnedCount = newTabs.filter(t => t.pinned).length;
        newTabs.splice(pinnedCount, 0, newTab);
      } else {
        // Unpinned tabs go after all pinned tabs
        const pinnedCount = newTabs.filter(t => t.pinned).length;
        newTabs.splice(pinnedCount, 0, newTab);
      }
      
      return newTabs;
    });
  }, []);
  
  // Handle tab duplicate (Replit-style)
  const handleTabDuplicate = useCallback((tabId: string) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === tabId);
      if (!tab) return prev;
      
      const duplicateId = `${tabId}-copy-${Date.now()}`;
      const duplicateTab: Tab = {
        ...tab,
        id: duplicateId,
        label: `${tab.label} (copy)`,
        pinned: false,
      };
      
      const tabIndex = prev.findIndex(t => t.id === tabId);
      const newTabs = [...prev];
      newTabs.splice(tabIndex + 1, 0, duplicateTab);
      
      return newTabs;
    });
    toast({
      title: "Tab duplicated",
      description: "A copy of the tab has been created.",
    });
  }, [toast]);
  
  // Handle split right (Replit-style) - placeholder for future implementation
  const handleSplitRight = useCallback((tabId: string) => {
    toast({
      title: "Split view",
      description: "Split view feature coming soon.",
    });
  }, [toast]);
  
  // Handle tools sheet tool selection
  const handleToolsSheetSelect = useCallback((toolId: string) => {
    // Map tools sheet IDs to available tools
    const toolMapping: Record<string, string> = {
      'search': 'search',
      'files': 'files',
      'agent': 'agent',
      'assistant': 'ai-assistant',
      'publishing': 'deployment',
      'app-storage': 'resources',
      'auth': 'auth',
      'console': 'terminal',
      'database': 'database',
      'developer': 'debugger',
      'git': 'git',
      'integrations': 'extensions',
      'multiplayer': 'multiplayer',
      'preview': 'preview',
      'kv-store': 'database-browser',
      'secrets': 'secrets',
      'security': 'security',
      'shell': 'shell',
      'settings': 'settings',
      'workflows': 'workflows',
    };
    
    const mappedToolId = toolMapping[toolId] || toolId;
    
    // Special cases
    if (toolId === 'search') {
      setShowGlobalSearch(true);
      return;
    }
    if (toolId === 'files') {
      setShowFileExplorer(true);
      return;
    }
    if (toolId === 'agent') {
      setLeftPanelTab('agent');
      setIsSidebarCollapsed(false);
      return;
    }
    if (toolId === 'preview') {
      setActiveTab('preview');
      return;
    }
    
    handleAddTool(mappedToolId);
  }, [handleAddTool]);
  
  const handleRunStop = () => {
    setIsRunning(prev => !prev);
    toast({
      title: isRunning ? 'Project stopped' : 'Project running',
      description: isRunning ? 'Server stopped' : 'Server started on port 5000',
    });
  };
  
  // Handle activity bar item click
  const handleActivityItemClick = (item: ActivityItem) => {
    if (activeActivityItem === item && !isSidebarCollapsed) {
      setIsSidebarCollapsed(true);
    } else {
      setActiveActivityItem(item);
      setIsSidebarCollapsed(false);
    }
    
    // Map activity items to left panel tabs or tools
    switch (item) {
      case 'agent':
        setLeftPanelTab('agent');
        break;
      case 'files':
        setShowFileExplorer(true);
        break;
      case 'search':
        setShowGlobalSearch(true);
        break;
      case 'git':
        handleAddTool('git');
        break;
      case 'packages':
        handleAddTool('packages');
        break;
      case 'debug':
        handleAddTool('debugger');
        break;
      case 'terminal':
        handleAddTool('terminal');
        break;
      case 'deploy':
        setLeftPanelTab('deployment');
        break;
      case 'secrets':
        handleAddTool('secrets');
        break;
      case 'database':
        handleAddTool('database');
        break;
      case 'preview':
        setActiveTab('preview');
        break;
      case 'workflows':
        handleAddTool('workflows');
        break;
      case 'history':
        handleAddTool('rewind');
        break;
      case 'settings':
        handleAddTool('settings');
        break;
      case 'extensions':
        handleAddTool('extensions');
        break;
    }
  };
  
  // Handle editor tab actions
  const handleEditorTabClick = (tabId: string) => {
    setActiveEditorTabId(tabId);
    setActiveTab(tabId);
  };
  
  const handleEditorTabClose = (tabId: string) => {
    setEditorTabs(prev => prev.filter(t => t.id !== tabId));
    handleTabClose(tabId);
  };
  
  const handleEditorTabReorder = (fromIndex: number, toIndex: number) => {
    setEditorTabs(prev => {
      const newTabs = [...prev];
      const [removed] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, removed);
      return newTabs;
    });
  };
  
  const handleEditorTabPin = (tabId: string) => {
    setEditorTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, pinned: !t.pinned } : t
    ));
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
        return <ConsolePanel projectId={projectId} userId={user?.id} />;
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
        return <ConsolePanel projectId={projectId} userId={user?.id} />;
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
      // Replit-style Visual Editor, Rewind, Resources, Workflows (Dec 2025)
      case 'visual-editor':
        return <VisualEditorPanel projectId={projectId} />;
      case 'rewind':
        return <RewindPanel projectId={projectId} />;
      case 'workflows':
        return <WorkflowsPanel projectId={projectId} />;
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
  
  // Use UnifiedIDELayout for mobile and tablet (responsive layout)
  if (deviceType === 'mobile' || deviceType === 'tablet') {
    return (
      <Suspense fallback={<ECodeLoading fullScreen size="lg" text="Loading workspace..." />}>
        <UnifiedIDELayout projectId={normalizedProjectId} />
      </Suspense>
    );
  }
  
  return (
    <div className="flex h-screen bg-[var(--ecode-background)] overflow-hidden">
      {/* Activity Bar - Left vertical icon rail (Replit style) */}
      <ReplitActivityBar
        activeItem={activeActivityItem}
        onItemClick={handleActivityItemClick}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        badgeCounts={{
          git: gitChangesCount > 0 ? gitChangesCount : undefined,
          debug: problemsCount.errors > 0 ? problemsCount.errors : undefined,
        }}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Navigation */}
        <TopNavBar
          projectName={project.name}
          projectSlug={project.slug || String(project.id)}
          ownerUsername={user?.username || ''}
          projectId={projectId}
          isDeployed={false}
          onRun={handleRunStop}
          isRunning={isRunning}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onTabClose={handleTabClose}
          onTabReorder={handleTabReorder}
          onOpenToolsSheet={() => setShowToolsSheet(true)}
          availableTools={availableTools}
          onAddTool={handleAddTool}
          showFileExplorer={showFileExplorer}
          onToggleFileExplorer={() => setShowFileExplorer((prev: boolean) => !prev)}
          showCollaboration={showCollaboration}
          onToggleCollaboration={() => setShowCollaboration((prev: boolean) => !prev)}
          collaboratorCount={0}
          onOpenDeployLogs={() => setDeploymentTab('logs')}
          onOpenDeployAnalytics={() => setDeploymentTab('analytics')}
          showTabs={false}
        />
        
        {/* Replit-style Tab Bar with context menus, pinning, file icons */}
        <ReplitTabBar
          tabs={tabs.map(tab => ({
            id: tab.id,
            label: tab.label,
            closable: tab.closable,
            pinned: tab.pinned,
            modified: tab.modified,
            path: tab.path,
          }))}
          activeTabId={activeTab}
          onTabClick={setActiveTab}
          onTabClose={handleTabClose}
          onTabReorder={handleTabReorder}
          onTabPin={handleTabPin}
          onTabDuplicate={handleTabDuplicate}
          onSplitRight={handleSplitRight}
          onAddTab={() => setShowToolsSheet(true)}
        />
        
        {/* 3-Panel Layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT: AI Agent Panel (30%) - collapsible */}
        {!isSidebarCollapsed && (
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col border-r">
              <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="h-full flex flex-col">
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
                <TabsTrigger 
                  value="deployment" 
                  className="gap-2" 
                  data-testid="tab-deployment"
                  onClick={() => setDeploymentTab('deploy')}
                >
                  <Rocket className="h-4 w-4" />
                  Deploy
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="agent" className="flex-1 mt-0 overflow-hidden" forceMount>
                {/* ✅ FIX (Dec 9, 2025): Stable key to prevent remounts during streaming - component handles prompt changes internally */}
                <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading AI Agent...</div>}>
                  <ReplitAgentPanelV3
                    key={`agent-${projectId}`}
                    projectId={projectId}
                    sessionId={agentSessionId}
                    externalConversationId={agentConversationId}
                    initialPrompt={agentInitialPrompt || undefined}
                    autoStart={!!bootstrapToken || autoStartAgent}
                    mode="desktop"
                    agentToolsSettings={agentToolsSettings}
                    onAgentToolsSettingsChange={setAgentToolsSettings}
                    onBuildComplete={async () => {
                    // REAL: Auto-start preview when build completes (Task 12)
                    setActiveTab('preview');
                    
                    // ✅ FIX (Dec 9, 2025): Call preview start API and invalidate cache
                    // This triggers the preview server to start and loads the iframe
                    try {
                      // Start the preview server - include projectId in body as required
                      await apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, { projectId });
                      
                      // Invalidate preview URL cache so ResponsiveWebPreview fetches new URL
                      queryClient.invalidateQueries({ queryKey: [`/api/preview/url?projectId=${projectId}`] });
                      
                      toast({
                        title: 'Build Complete',
                        description: 'Preview is starting...',
                      });
                    } catch (err) {
                      // Even if preview start fails, still switch to preview tab
                      // The ResponsiveWebPreview will show appropriate message
                      queryClient.invalidateQueries({ queryKey: [`/api/preview/url?projectId=${projectId}`] });
                      
                      toast({
                        title: 'Build Complete',
                        description: 'Files created. Click refresh to view preview.',
                        variant: 'default',
                      });
                    }
                  }}
                  />
                </Suspense>
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
              
              <TabsContent value="deployment" className="flex-1 mt-0 overflow-hidden">
                <ReplitDeploymentPanel
                  projectId={projectId}
                  defaultTab={deploymentTab || 'deploy'}
                />
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>
        )}
        
        {!isSidebarCollapsed && <ResizableHandle withHandle />}
        
        {/* CENTER: Main Content - adjusts based on sidebar visibility */}
        <ResizablePanel defaultSize={isSidebarCollapsed ? (showFileExplorer ? 82 : 100) : (showFileExplorer ? 52 : 70)} minSize={30}>
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
          isConnected={true}
          lastSaved={lastSaved}
          problems={problemsCount}
          deploymentStatus={deploymentStatus}
          deploymentUrl={publishState?.url}
          onDeployClick={() => {
            setLeftPanelTab('deployment');
            setDeploymentTab('logs');
          }}
        />
      </div>
      
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
      
      {/* Replit-style Tools Sheet */}
      <ReplitToolsSheet
        open={showToolsSheet}
        onClose={() => setShowToolsSheet(false)}
        onSelectTool={handleToolsSheetSelect}
      />
      
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
