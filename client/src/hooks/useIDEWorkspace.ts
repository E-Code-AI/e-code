/**
 * useIDEWorkspace - Centralized IDE state management hook
 * 
 * Extracts all shared IDE state from IDEPage.tsx into a reusable hook
 * that desktop, tablet, and mobile views can consume.
 * 
 * @param projectId - The project ID to load
 * @returns All IDE state, queries, and action handlers
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { File, Project } from '@shared/schema';
import type { ActivityItem } from '@/components/ide/ReplitActivityBar';
import type { Tab as EditorTab } from '@/components/ide/ReplitTabBar';

export interface Tab {
  id: string;
  label: string;
  closable?: boolean;
  pinned?: boolean;
  modified?: boolean;
  path?: string;
}

export interface AgentToolsSettings {
  maxAutonomy: boolean;
  appTesting: boolean;
  extendedThinking: boolean;
  highPowerModels: boolean;
  webSearch: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface ProblemsCount {
  errors: number;
  warnings: number;
}

export interface PublishState {
  status: 'idle' | 'publishing' | 'live' | 'failed' | 'needs-republish';
  url?: string;
  deployedAt?: string;
  errorMessage?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export type DeploymentStatus = 'idle' | 'deploying' | 'live' | 'failed';

export interface AvailableTool {
  id: string;
  label: string;
  icon: string;
}

const getStorageKey = (projectId: string) => `ide-state-${projectId}`;

const loadPersistedState = (projectId: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(getStorageKey(projectId));
    return stored ? JSON.parse(stored) : null;
  } catch { /* Storage check - expected to fail in some environments */
    return null;
  }
};

const savePersistedState = (projectId: string, state: Record<string, unknown>) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getStorageKey(projectId), JSON.stringify(state));
  } catch { /* Storage quota - expected to fail when storage is full */
  }
};

const decodeBootstrapToken = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[useIDEWorkspace] Invalid JWT format');
      return null;
    }

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
    console.error('[useIDEWorkspace] Failed to decode bootstrap token:', e);
    return null;
  }
};

const defaultAgentToolsSettings: AgentToolsSettings = {
  maxAutonomy: false,
  appTesting: true,
  extendedThinking: false,
  highPowerModels: false,
  webSearch: false
};

const getStoredAgentToolsSettings = (projectId: string): AgentToolsSettings | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(`agent-tools-settings-${projectId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[useIDEWorkspace] Failed to load agentToolsSettings:', e);
  }
  return null;
};

export const availableTools: AvailableTool[] = [
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
  { id: 'env-vars', label: 'Env Vars Manager', icon: '🔐' },
  { id: 'global-search', label: 'Global Search', icon: '🔎' },
  { id: 'logs', label: 'Logs Viewer', icon: '📋' },
  { id: 'progress', label: 'Progress', icon: '📊' },
  { id: 'video-replay', label: 'Video Replay', icon: '🎬' },
  { id: 'visual-editor', label: 'Visual Editor', icon: '🎨' },
  { id: 'rewind', label: 'Rewind', icon: '⏪' },
  { id: 'workflows', label: 'Workflows', icon: '⚡' },
];

export function useIDEWorkspace(projectId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Parse URL params
  const searchParams = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search) 
    : new URLSearchParams();
  const panelParam = searchParams.get('panel');
  const promptParam = searchParams.get('prompt');
  const autoStartAgent = searchParams.get('agent') === 'true' || panelParam === 'agent';
  const bootstrapToken = searchParams.get('bootstrap');

  // Decode bootstrap token
  const tokenData = bootstrapToken ? decodeBootstrapToken(bootstrapToken) : null;
  const agentSessionId = tokenData?.sessionId || null;
  const agentConversationId = tokenData?.conversationId || null;

  // Load persisted state
  const persistedState = loadPersistedState(projectId);
  const validatedState = persistedState ? {
    ...persistedState,
    selectedFileId: persistedState.selectedFileId && persistedState.tabs?.some((t: Tab) => t.id === `file:${persistedState.selectedFileId}`)
      ? persistedState.selectedFileId
      : undefined,
  } : null;

  // ========== BASE STATES ==========
  const [activeTab, setActiveTab] = useState(validatedState?.activeTab || 'preview');
  const [tabs, setTabs] = useState<Tab[]>(validatedState?.tabs || [
    { id: 'preview', label: 'Preview', closable: false }
  ]);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>(validatedState?.selectedFileId);
  const [showFileExplorer, setShowFileExplorer] = useState(validatedState?.showFileExplorer ?? true);
  const [isRunning, setIsRunning] = useState(false);

  // ========== ACTIVITY STATES ==========
  const [activeActivityItem, setActiveActivityItem] = useState<ActivityItem>('files');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([]);
  const [activeEditorTabId, setActiveEditorTabId] = useState<string>('');

  // ========== PANEL STATES ==========
  const [leftPanelTab, setLeftPanelTab] = useState<string>('agent');
  const [deploymentTab, setDeploymentTab] = useState<'deploy' | 'logs' | 'analytics' | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showReplitDB, setShowReplitDB] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const [showQuickFileSearch, setShowQuickFileSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // ========== AGENT STATES ==========
  const [agentToolsSettings, setAgentToolsSettingsInternal] = useState<AgentToolsSettings>(() => {
    return getStoredAgentToolsSettings(projectId) || defaultAgentToolsSettings;
  });

  const setAgentToolsSettings = useCallback((newSettings: AgentToolsSettings) => {
    setAgentToolsSettingsInternal(newSettings);
    try {
      sessionStorage.setItem(`agent-tools-settings-${projectId}`, JSON.stringify(newSettings));
    } catch (e) {
      console.error('[useIDEWorkspace] Failed to save agentToolsSettings:', e);
    }
  }, [projectId]);

  // ========== GIT STATES ==========
  const [gitBranch, setGitBranch] = useState('main');
  const [gitChangesCount, setGitChangesCount] = useState(0);

  // ========== EDITOR STATES ==========
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 });
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [problemsCount, setProblemsCount] = useState<ProblemsCount>({ errors: 0, warnings: 0 });

  // ========== RUNTIME STATE ==========
  const [runtimeAutoStarted, setRuntimeAutoStarted] = useState(false);

  // ========== BOOTSTRAP PROMPT STATE ==========
  const bootstrapPromptKey = `agent-prompt-${projectId}`;
  const [persistedBootstrapPrompt, setPersistedBootstrapPrompt] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(bootstrapPromptKey);
      if (saved) return saved;
    }
    return null;
  });

  // ========== QUERIES ==========
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

  const { data: files = [], isLoading: isLoadingFiles } = useQuery<File[]>({
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

  const { data: publishState } = useQuery<PublishState>({
    queryKey: ['/api/projects', projectId, 'publish', 'status'],
    enabled: !!projectId && !!user,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'publishing' ? 2000 : false;
    },
  });

  // RATE LIMIT FIX: Increased refetchInterval from 30s to 60s
  const { data: gitStatus } = useQuery<GitStatus>({
    queryKey: ['/api/git/status'],
    enabled: !!projectId && !!user,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  // ========== DERIVED STATE ==========
  const deploymentStatus: DeploymentStatus = publishState?.status === 'publishing' 
    ? 'deploying' 
    : publishState?.status === 'live' || publishState?.status === 'needs-republish'
    ? 'live'
    : publishState?.status === 'failed'
    ? 'failed'
    : 'idle';

  const storedPrompt = projectId ? sessionStorage.getItem(`agent-prompt-${projectId}`) : null;

  const agentInitialPrompt = useMemo(() => {
    if (promptParam) return promptParam;
    if (autoStartAgent && storedPrompt) return storedPrompt;
    if (persistedBootstrapPrompt) return persistedBootstrapPrompt;
    if (bootstrapToken && project?.description) return project.description;
    return null;
  }, [promptParam, autoStartAgent, storedPrompt, persistedBootstrapPrompt, bootstrapToken, project?.description]);

  // ========== EFFECTS ==========

  // Persist prompt from URL param
  useEffect(() => {
    if (promptParam && projectId) {
      sessionStorage.setItem(`agent-prompt-${projectId}`, promptParam);
      const url = new URL(window.location.href);
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url);
    }
  }, [promptParam, projectId]);

  // Persist bootstrap prompt
  useEffect(() => {
    if (bootstrapToken && project?.description && !persistedBootstrapPrompt) {
      setPersistedBootstrapPrompt(project.description);
      sessionStorage.setItem(bootstrapPromptKey, project.description);
    }
  }, [bootstrapToken, project?.description, persistedBootstrapPrompt, bootstrapPromptKey]);

  // Persist IDE state
  useEffect(() => {
    if (!projectId) return;
    savePersistedState(projectId, {
      activeTab,
      tabs,
      selectedFileId,
      showFileExplorer,
    });
  }, [projectId, activeTab, tabs, selectedFileId, showFileExplorer]);

  // Switch to deployment tab when triggered
  useEffect(() => {
    if (deploymentTab) {
      setLeftPanelTab('deployment');
    }
  }, [deploymentTab]);

  // Update git changes count from query
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

  // Auto-start runtime
  useEffect(() => {
    if (!runtimeAutoStarted && projectId && project && !isLoadingProject) {
      setRuntimeAutoStarted(true);
      apiRequest('POST', '/api/runtime/start', {
        projectId,
        mainFile: undefined,
        timeout: 30000
      }).then(() => {
        setIsRunning(true);
      }).catch((err) => {
        console.log('[useIDEWorkspace] Auto-start runtime failed:', err.message);
      });
    }
  }, [projectId, project, isLoadingProject, runtimeAutoStarted]);

  // ========== CALLBACKS ==========

  const handleWorkspaceComplete = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('bootstrap');
    window.history.replaceState({}, '', url);
    
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
    
    toast({
      title: "Workspace Ready!",
      description: "Your AI-powered workspace has been created successfully.",
    });
  }, [projectId, toast, queryClient]);

  const handleWorkspaceError = useCallback((error: string) => {
    toast({
      title: "Workspace Creation Failed",
      description: error,
      variant: "destructive",
    });
  }, [toast]);

  const handleFileSelect = useCallback((file: { id: number; name: string }) => {
    setSelectedFileId(file.id);
    const tabId = `file:${file.id}`;
    setTabs(prev => {
      if (!prev.find(t => t.id === tabId)) {
        return [...prev, { id: tabId, label: file.name, closable: true }];
      }
      return prev;
    });
    setActiveTab(tabId);
  }, []);

  const handleAddTool = useCallback((toolId: string) => {
    const tool = availableTools.find(t => t.id === toolId);
    if (!tool) return;
    
    if (tabs.find(t => t.id === toolId)) {
      setActiveTab(toolId);
      return;
    }
    
    setTabs(prev => [...prev, { id: toolId, label: tool.label, closable: true }]);
    setActiveTab(toolId);
  }, [tabs]);

  const handleTabClose = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTab === tabId) {
        setActiveTab(newTabs[0]?.id || 'preview');
      }
      return newTabs;
    });
  }, [activeTab]);

  const handleTabReorder = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const newTabs = [...prev];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);

  const handleTabPin = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabIndex = prev.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prev;
      
      const tab = prev[tabIndex];
      const newTab = { ...tab, pinned: !tab.pinned };
      const newTabs = prev.filter(t => t.id !== tabId);
      
      if (newTab.pinned) {
        const pinnedCount = newTabs.filter(t => t.pinned).length;
        newTabs.splice(pinnedCount, 0, newTab);
      } else {
        const pinnedCount = newTabs.filter(t => t.pinned).length;
        newTabs.splice(pinnedCount, 0, newTab);
      }
      
      return newTabs;
    });
  }, []);

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

  const handleSplitRight = useCallback((tabId: string) => {
    toast({
      title: "Split view",
      description: "Split view feature coming soon.",
    });
  }, [toast]);

  const handleToolsSheetSelect = useCallback((toolId: string) => {
    handleAddTool(toolId);
    setShowToolsSheet(false);
  }, [handleAddTool]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev);
  }, []);

  const refreshFiles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
  }, [queryClient, projectId]);

  const refreshProject = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
  }, [queryClient, projectId]);

  return {
    // Project info
    projectId,
    project,
    isLoadingProject,
    files,
    isLoadingFiles,

    // Base states
    activeTab,
    setActiveTab,
    tabs,
    setTabs,
    selectedFileId,
    setSelectedFileId,
    showFileExplorer,
    setShowFileExplorer,
    isRunning,
    setIsRunning,

    // Activity states
    activeActivityItem,
    setActiveActivityItem,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebar,
    editorTabs,
    setEditorTabs,
    activeEditorTabId,
    setActiveEditorTabId,

    // Panel states
    leftPanelTab,
    setLeftPanelTab,
    deploymentTab,
    setDeploymentTab,
    showCommandPalette,
    setShowCommandPalette,
    showGlobalSearch,
    setShowGlobalSearch,
    showReplitDB,
    setShowReplitDB,
    showCollaboration,
    setShowCollaboration,
    showToolsSheet,
    setShowToolsSheet,
    showQuickFileSearch,
    setShowQuickFileSearch,
    showKeyboardShortcuts,
    setShowKeyboardShortcuts,

    // Agent states
    agentToolsSettings,
    setAgentToolsSettings,
    bootstrapToken,
    agentSessionId,
    agentConversationId,
    autoStartAgent,
    agentInitialPrompt,

    // Git states
    gitBranch,
    setGitBranch,
    gitChangesCount,
    setGitChangesCount,
    gitStatus,

    // Editor states
    cursorPosition,
    setCursorPosition,
    lastSaved,
    setLastSaved,
    problemsCount,
    setProblemsCount,

    // Deployment
    deploymentStatus,
    publishState,

    // Available tools
    availableTools,

    // Callbacks
    handleWorkspaceComplete,
    handleWorkspaceError,
    handleFileSelect,
    handleAddTool,
    handleTabClose,
    handleTabReorder,
    handleTabPin,
    handleTabDuplicate,
    handleSplitRight,
    handleToolsSheetSelect,
    refreshFiles,
    refreshProject,

    // Auth
    user,
  };
}

export type UseIDEWorkspaceReturn = ReturnType<typeof useIDEWorkspace>;
