/**
 * UnifiedIDELayout - Responsive IDE that adapts to screen size
 * 
 * Layout modes:
 * - Desktop (>1024px): 3 resizable panels (AI Agent 30% | Main Content 52% | File Explorer 18%)
 * - Tablet (768-1024px): 2 panels with collapsible sidebar
 * - Mobile (<768px): Bottom tab navigation with swipe between panels
 * 
 * Uses useIDEWorkspace for centralized state management
 */

import { useState, useCallback, Suspense, lazy, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { createPanHandlers, type PanInfo } from '@/lib/native-motion';
import { useIDEWorkspace, availableTools } from '@/hooks';
import { useDeviceType } from '@/hooks/use-media-query';
import { useConnectionStatus } from '@/hooks/use-connection-status';
import { useProblemsCount } from '@/hooks/use-problems-count';
import { useToast } from '@/hooks/use-toast';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Zap, 
  X, 
  Layers, 
  Rocket, 
  PanelLeftOpen, 
  PanelLeftClose,
  ChevronLeft,
  Code,
  Terminal,
  Monitor,
  Bot,
  MoreHorizontal,
} from 'lucide-react';
import { ECodeLoading } from '@/components/ECodeLoading';

import { TopNavBar } from '@/components/ide/TopNavBar';
import { StatusBar } from '@/components/ide/StatusBar';
import { ReplitActivityBar, type ActivityItem } from '@/components/ide/ReplitActivityBar';
import { ReplitTabBar } from '@/components/ide/ReplitTabBar';
import { ReplitToolsSheet } from '@/components/ide/ReplitToolsSheet';
import { QuickFileSearch } from '@/components/ide/QuickFileSearch';
import { KeyboardShortcutsOverlay } from '@/components/ide/KeyboardShortcutsOverlay';
import { ReplitFileExplorer } from '@/components/editor/ReplitFileExplorer';
import { ReplitMobileNavigation, ReplitMobileInputBar, ReplitMobileHeader, type MobileTab } from '@/components/mobile';

const ReplitMonacoEditor = lazy(() => import('@/components/editor/ReplitMonacoEditor').then(mod => ({ default: mod.ReplitMonacoEditor })));
const ReplitTerminalPanel = lazy(() => import('@/components/editor/ReplitTerminalPanel').then(mod => ({ default: mod.ReplitTerminalPanel })));
const ReplitDeploymentPanel = lazy(() => import('@/components/ide/ReplitDeploymentPanel').then(mod => ({ default: mod.ReplitDeploymentPanel })));
const ReplitAgentPanelV3 = lazy(() => import('@/components/ai/ReplitAgentPanelV3').then(mod => ({ default: mod.ReplitAgentPanelV3 })));
import { AgentPanelErrorBoundary } from '@/components/ai/AgentPanelErrorBoundary';
import type { ExternalInputHandlers } from '@/components/ai/ReplitAgentPanelV3';
const ResponsiveWebPreview = lazy(() => import('@/components/editor/ResponsiveWebPreview').then(mod => ({ default: mod.ResponsiveWebPreview })));
const AgentActionsPanel = lazy(() => import('@/components/ide/AgentActionsPanel').then(mod => ({ default: mod.AgentActionsPanel })));
const ToolsPanel = lazy(() => import('@/components/ide/ToolsPanel').then(mod => ({ default: mod.ToolsPanel })));

const EnhancedMobileFileExplorer = lazy(() => import('@/components/mobile/EnhancedMobileFileExplorer').then(mod => ({ default: mod.EnhancedMobileFileExplorer })));
const LazyMobileCodeEditor = lazy(() => import('@/components/mobile/LazyMobileCodeEditor').then(mod => ({ default: mod.LazyMobileCodeEditor })));
const EnhancedMobileTerminal = lazy(() => import('@/components/mobile/EnhancedMobileTerminal').then(mod => ({ default: mod.EnhancedMobileTerminal })));
const MobilePreviewPanel = lazy(() => import('@/components/mobile/MobilePreviewPanel').then(mod => ({ default: mod.MobilePreviewPanel })));
const MobileMoreMenu = lazy(() => import('@/components/mobile/MobileMoreMenu').then(mod => ({ default: mod.MobileMoreMenu })));
const MobileSecurityPanel = lazy(() => import('@/components/mobile/MobileSecurityPanel').then(mod => ({ default: mod.MobileSecurityPanel })));
const MobileTabSwitcher = lazy(() => import('@/components/mobile/MobileTabSwitcher').then(mod => ({ default: mod.MobileTabSwitcher })));

const CommandPalette = lazy(() => import('@/components/CommandPalette').then(mod => ({ default: mod.CommandPalette })));
const GlobalSearch = lazy(() => import('@/components/GlobalSearch').then(mod => ({ default: mod.GlobalSearch })));
const CollaborationPanel = lazy(() => import('@/components/CollaborationPanel').then(mod => ({ default: mod.CollaborationPanel })));
const ReplitDB = lazy(() => import('@/components/ReplitDB').then(mod => ({ default: mod.ReplitDB })));
// ✅ FIX (Dec 11, 2025): Use default export for simpler lazy loading
const AutonomousWorkspaceViewer = lazy(() => import('@/components/ide/AutonomousWorkspaceViewer'));

const ReplitGitPanel = lazy(() => import('@/components/editor/ReplitGitPanel').then(mod => ({ default: mod.ReplitGitPanel })));
const ReplitPackagesPanel = lazy(() => import('@/components/editor/ReplitPackagesPanel').then(mod => ({ default: mod.ReplitPackagesPanel })));
const ReplitDebuggerPanel = lazy(() => import('@/components/editor/ReplitDebuggerPanel').then(mod => ({ default: mod.ReplitDebuggerPanel })));
const ReplitSecretsPanel = lazy(() => import('@/components/editor/ReplitSecretsPanel').then(mod => ({ default: mod.ReplitSecretsPanel })));
const ReplitHistoryPanel = lazy(() => import('@/components/editor/ReplitHistoryPanel').then(mod => ({ default: mod.ReplitHistoryPanel })));
const CheckpointHistoryPanel = lazy(() => import('@/components/ai/CheckpointHistoryPanel').then(mod => ({ default: mod.CheckpointHistoryPanel })));
const ReplitSettingsPanel = lazy(() => import('@/components/editor/ReplitSettingsPanel').then(mod => ({ default: mod.ReplitSettingsPanel })));
const WorkflowsPanel = lazy(() => import('@/components/ide/WorkflowsPanel').then(mod => ({ default: mod.WorkflowsPanel })));
const ExtensionsMarketplace = lazy(() => import('@/components/ExtensionsMarketplace').then(mod => ({ default: mod.ExtensionsMarketplace })));

import { ShortcutHint, ShortcutTester } from '@/components/utilities';
import { useAutonomousBuildStore } from '@/stores/autonomousBuildStore';
import { useElectronMenuEvents } from '@/hooks/useElectron';

interface UnifiedIDELayoutProps {
  projectId: string;
  className?: string;
  bootstrapToken?: string | null;
  onWorkspaceComplete?: () => void;
  onWorkspaceError?: (error: string) => void;
}

type TabletPanel = 'editor' | 'terminal' | 'preview' | 'agent' | 'more';

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

const mobileTabOrder: MobileTab[] = ['preview', 'agent', 'deploy', 'more'];

function UnifiedIDELayout({ 
  projectId, 
  className,
  bootstrapToken,
  onWorkspaceComplete,
  onWorkspaceError,
}: UnifiedIDELayoutProps) {
  const deviceType = useDeviceType();
  const { toast } = useToast();
  const connectionStatus = useConnectionStatus();
  const isConnected = connectionStatus.isOnline && connectionStatus.backendHealthy;
  const { errorsCount } = useProblemsCount(projectId);
  
  // Autonomous build store for inline chat integration and preview splash screens
  const autonomousBuildStore = useAutonomousBuildStore();
  
  const workspace = useIDEWorkspace(projectId);
  const {
    project,
    files,
    isLoadingProject,
    user,
    activeTab,
    setActiveTab,
    tabs,
    selectedFileId,
    setSelectedFileId,
    showFileExplorer,
    setShowFileExplorer,
    isRunning,
    setIsRunning,
    activeActivityItem,
    setActiveActivityItem,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    leftPanelTab,
    setLeftPanelTab,
    deploymentTab,
    setDeploymentTab,
    showToolsSheet,
    setShowToolsSheet,
    showQuickFileSearch,
    setShowQuickFileSearch,
    showKeyboardShortcuts,
    setShowKeyboardShortcuts,
    agentToolsSettings,
    setAgentToolsSettings,
    gitBranch,
    gitChangesCount,
    cursorPosition,
    lastSaved,
    problemsCount,
    publishState,
    handleFileSelect,
    handleTabClose,
    handleTabReorder,
    handleTabPin,
    handleTabDuplicate,
    handleSplitRight,
    handleAddTool,
  } = workspace;

  const handleRunStop = useCallback(() => {
    setIsRunning(prev => !prev);
  }, [setIsRunning]);

  const handleActivityItemClick = useCallback((item: ActivityItem) => {
    setActiveActivityItem(item);
    
    switch (item) {
      case 'files':
        setShowFileExplorer((prev: boolean) => !prev);
        break;
      case 'search':
        setShowGlobalSearch(true);
        break;
      case 'git':
        setShowGitPanel(true);
        break;
      case 'packages':
        setShowPackagesPanel(true);
        break;
      case 'debug':
        setShowDebugPanel(true);
        break;
      case 'terminal':
        handleAddTool('terminal');
        break;
      case 'agent':
        setIsSidebarCollapsed(false);
        setLeftPanelTab('agent');
        break;
      case 'deploy':
        setIsSidebarCollapsed(false);
        setLeftPanelTab('deployment');
        break;
      case 'secrets':
        setShowSecretsPanel(true);
        break;
      case 'database':
        setShowReplitDB(true);
        break;
      case 'preview':
        handleAddTool('preview');
        break;
      case 'workflows':
        setShowWorkflowsPanel(true);
        break;
      case 'history':
        setShowHistoryPanel(true);
        break;
      case 'extensions':
        setShowExtensionsPanel(true);
        break;
      case 'settings':
        setShowSettingsPanel(true);
        break;
    }
  }, [setActiveActivityItem, setShowFileExplorer, setIsSidebarCollapsed, setLeftPanelTab, handleAddTool]);

  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('agent');
  const [tabletPanel, setTabletPanel] = useState<TabletPanel>('editor');
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(true);
  
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [showReplitDB, setShowReplitDB] = useState(false);
  const [enableShortcutHint, setEnableShortcutHint] = useState(false);
  const [enableShortcutTester, setEnableShortcutTester] = useState(false);
  
  const [showGitPanel, setShowGitPanel] = useState(false);
  const [showPackagesPanel, setShowPackagesPanel] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showSecretsPanel, setShowSecretsPanel] = useState(false);
  const [showWorkflowsPanel, setShowWorkflowsPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showCheckpointsPanel, setShowCheckpointsPanel] = useState(false);
  const [showExtensionsPanel, setShowExtensionsPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [showDeployPanel, setShowDeployPanel] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);
  
  // Open tabs for mobile navigation - tracks which tools are open as tabs
  interface OpenTab {
    id: string;
    name: string;
    icon: string;
  }
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'agent', name: 'Agent', icon: 'agent' },
  ]);
  const [activeOpenTabId, setActiveOpenTabId] = useState('agent');
  
  // Mobile agent input handlers - exposed from ReplitAgentPanelV3 to ReplitMobileInputBar
  const [mobileAgentHandlers, setMobileAgentHandlers] = useState<ExternalInputHandlers | null>(null);

  // Force agent tab when bootstrapToken is present for inline chat experience
  useEffect(() => {
    if (bootstrapToken) {
      console.log('[UnifiedIDELayout] Bootstrap token detected - forcing agent tab and ensuring sidebar is visible');
      setLeftPanelTab('agent');
      setMobileActiveTab('agent');
      setIsSidebarCollapsed(false);
    }
  }, [bootstrapToken, setLeftPanelTab, setIsSidebarCollapsed]);

  const closePanel = useCallback((setter: (v: boolean) => void) => {
    setter(false);
    setActiveActivityItem('files');
  }, [setActiveActivityItem]);

  // Tool name mapping for display
  const toolNameMap: Record<string, string> = {
    agent: 'Agent',
    preview: 'Preview',
    deploy: 'Deploy',
    console: 'Console',
    database: 'Database',
    git: 'Git',
    secrets: 'Secrets',
    auth: 'Auth',
    publishing: 'Publishing',
    assistant: 'Assistant',
    files: 'Files',
    search: 'Search',
    multiplayer: 'Multiplayer',
    integrations: 'Integrations',
    developer: 'Developer',
    'app-storage': 'App Storage',
    settings: 'Settings',
    history: 'History',
    workflows: 'Workflows',
    extensions: 'Extensions',
    packages: 'Packages',
    terminal: 'Terminal',
    debug: 'Debug',
    checkpoints: 'Checkpoints',
    security: 'Security',
    collaboration: 'Collaboration',
    actions: 'Actions',
    tools: 'Tools',
  };

  // Add a new tab when tool is selected from tools sheet
  const handleAddOpenTab = useCallback((toolId: string) => {
    const existingTab = openTabs.find(t => t.id === toolId);
    if (existingTab) {
      setActiveOpenTabId(toolId);
    } else {
      const newTab: OpenTab = {
        id: toolId,
        name: toolNameMap[toolId] || toolId,
        icon: toolId,
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveOpenTabId(toolId);
    }
    
    // Map all tools to mobileActiveTab for panel rendering
    setMobileActiveTab(toolId as MobileTab);
  }, [openTabs]);

  // Close an open tab
  const handleCloseOpenTab = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeOpenTabId === tabId && newTabs.length > 0) {
        setActiveOpenTabId(newTabs[newTabs.length - 1].id);
      }
      return newTabs;
    });
  }, [activeOpenTabId]);

  // Select an open tab
  const handleSelectOpenTab = useCallback((tabId: string) => {
    setActiveOpenTabId(tabId);
    // Map all tools to mobileActiveTab for panel rendering
    setMobileActiveTab(tabId as MobileTab);
  }, []);

  // Handle quick access from tab switcher
  const handleQuickAccess = useCallback((toolId: string) => {
    switch (toolId) {
      case 'secrets':
        setShowSecretsPanel(true);
        break;
      case 'database':
        setShowReplitDB(true);
        break;
      case 'auth':
        // Handle auth panel
        break;
    }
  }, []);

  // Electron Desktop Menu Event Handlers (5.1 IPC Handlers)
  useElectronMenuEvents({
    onNewProject: () => {
      // Navigate to new project page
      window.location.href = '/';
    },
    onOpenProject: () => {
      setShowQuickFileSearch(true);
    },
    onSave: () => {
      // Trigger save via Monaco editor command
      const event = new CustomEvent('electron-save');
      document.dispatchEvent(event);
      toast({ title: 'File saved', description: 'Your changes have been saved.' });
    },
    onSaveAll: () => {
      // Trigger save all via Monaco editor
      const event = new CustomEvent('electron-save-all');
      document.dispatchEvent(event);
      toast({ title: 'All files saved', description: 'All open files have been saved.' });
    },
    onPreferences: () => {
      setShowSettingsPanel(true);
    },
    onFind: () => {
      // Trigger Monaco find widget
      const event = new CustomEvent('electron-find');
      document.dispatchEvent(event);
    },
    onFindReplace: () => {
      // Trigger Monaco find-replace widget
      const event = new CustomEvent('electron-find-replace');
      document.dispatchEvent(event);
    },
    onNewTerminal: () => {
      handleAddTool('terminal');
    },
    onClearTerminal: () => {
      const event = new CustomEvent('electron-clear-terminal');
      document.dispatchEvent(event);
    },
    onToggleSidebar: () => {
      setShowFileExplorer(prev => !prev);
    },
    onToggleTerminal: () => {
      handleAddTool('terminal');
    },
    onToggleAI: () => {
      setIsSidebarCollapsed(prev => !prev);
      if (isSidebarCollapsed) {
        setLeftPanelTab('agent');
      }
    },
    onQuickOpen: () => {
      setShowQuickFileSearch(true);
    },
    onGoToLine: () => {
      const event = new CustomEvent('electron-go-to-line');
      document.dispatchEvent(event);
    },
    onGoToSymbol: () => {
      const event = new CustomEvent('electron-go-to-symbol');
      document.dispatchEvent(event);
    },
    onGoToDefinition: () => {
      const event = new CustomEvent('electron-go-to-definition');
      document.dispatchEvent(event);
    },
    onRunCode: () => {
      setIsRunning(true);
    },
    onStopExecution: () => {
      setIsRunning(false);
    },
    onShowShortcuts: () => {
      setShowKeyboardShortcuts(true);
    },
  });
  
  const tabletSwipeStartX = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickFileSearch(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setShowQuickFileSearch]);

  const mobileSwipeHandlers = useMemo(() => createPanHandlers({
    axis: 'x',
    threshold: SWIPE_THRESHOLD,
    onEnd: (info: PanInfo) => {
      const isSwipeLeft = info.offset.x < -SWIPE_THRESHOLD && Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD * 1000;
      const isSwipeRight = info.offset.x > SWIPE_THRESHOLD && Math.abs(info.velocity.x) > SWIPE_VELOCITY_THRESHOLD * 1000;
      
      if (isSwipeLeft || isSwipeRight) {
        const currentIndex = mobileTabOrder.indexOf(mobileActiveTab);
        let newIndex = currentIndex;
        
        if (isSwipeLeft && currentIndex < mobileTabOrder.length - 1) {
          newIndex = currentIndex + 1;
        } else if (isSwipeRight && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }
        
        if (newIndex !== currentIndex) {
          setMobileActiveTab(mobileTabOrder[newIndex]);
          if ('vibrate' in navigator) {
            navigator.vibrate(10);
          }
        }
      }
    }
  }), [mobileActiveTab]);

  const tabletPanHandlers = useMemo(() => createPanHandlers({
    axis: 'x',
    threshold: 20,
    onStart: (info: PanInfo) => {
      tabletSwipeStartX.current = info.point.x;
    },
    onEnd: (info: PanInfo) => {
      const swipeDistance = info.offset.x;
      
      if (!tabletDrawerOpen && tabletSwipeStartX.current < 20 && swipeDistance > 80) {
        setTabletDrawerOpen(true);
        if ('vibrate' in navigator) navigator.vibrate(10);
      } else if (tabletDrawerOpen && swipeDistance < -80) {
        setTabletDrawerOpen(false);
        if ('vibrate' in navigator) navigator.vibrate(10);
      }
    }
  }), [tabletDrawerOpen]);

  const deploymentStatus = publishState?.status === 'live' ? 'live' 
    : publishState?.status === 'publishing' ? 'deploying' 
    : publishState?.status === 'failed' ? 'failed' 
    : 'idle';

  // For mobile and tablet, show navigation even during loading (matches Replit behavior)
  // For desktop, show the full loading screen
  if (isLoadingProject && deviceType === 'desktop') {
    return <ECodeLoading fullScreen size="lg" text="Loading workspace..." />;
  }

  if (!project && !isLoadingProject) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
        </div>
      </div>
    );
  }

  const renderMobileContent = () => {
    // Show loading state if project is still loading
    if (isLoadingProject) {
      return (
        <div className="flex items-center justify-center h-full">
          <ECodeLoading size="md" text="Loading workspace..." />
        </div>
      );
    }
    
    switch (mobileActiveTab) {
      case 'preview':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Preview..." /></div>}>
            <MobilePreviewPanel projectId={projectId} />
          </Suspense>
        );
      case 'agent':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Agent..." /></div>}>
            <AgentPanelErrorBoundary>
              <ReplitAgentPanelV3
                projectId={projectId}
                mode="mobile"
                agentToolsSettings={agentToolsSettings}
                onAgentToolsSettingsChange={setAgentToolsSettings}
                isBootstrapping={!!bootstrapToken}
                bootstrapToken={bootstrapToken}
                hideInput={true}
                onExternalInput={setMobileAgentHandlers}
              />
            </AgentPanelErrorBoundary>
          </Suspense>
        );
      case 'deploy':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Deploy..." /></div>}>
            <ReplitDeploymentPanel projectId={projectId} />
          </Suspense>
        );
      case 'git':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Git..." /></div>}>
            <ReplitGitPanel projectId={projectId} />
          </Suspense>
        );
      case 'packages':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Packages..." /></div>}>
            <ReplitPackagesPanel projectId={projectId} />
          </Suspense>
        );
      case 'secrets':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Secrets..." /></div>}>
            <ReplitSecretsPanel projectId={projectId} />
          </Suspense>
        );
      case 'database':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Database..." /></div>}>
            <ReplitDB projectId={parseInt(projectId, 10)} />
          </Suspense>
        );
      case 'terminal':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Terminal..." /></div>}>
            <EnhancedMobileTerminal projectId={projectId} />
          </Suspense>
        );
      case 'files':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Files..." /></div>}>
            <ReplitFileExplorer
              projectId={projectId}
              onFileSelect={handleFileSelect}
              selectedFileId={selectedFileId}
              isBootstrapping={!!bootstrapToken}
            />
          </Suspense>
        );
      case 'history':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading History..." /></div>}>
            <ReplitHistoryPanel projectId={projectId} />
          </Suspense>
        );
      case 'checkpoints':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Checkpoints..." /></div>}>
            <CheckpointHistoryPanel projectId={projectId} maxHeight="calc(100vh - 120px)" />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Settings..." /></div>}>
            <ReplitSettingsPanel projectId={projectId} />
          </Suspense>
        );
      case 'extensions':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Extensions..." /></div>}>
            <ExtensionsMarketplace className="h-full" />
          </Suspense>
        );
      case 'workflows':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Workflows..." /></div>}>
            <WorkflowsPanel projectId={projectId} />
          </Suspense>
        );
      case 'debug':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Debug..." /></div>}>
            <ReplitDebuggerPanel projectId={projectId} />
          </Suspense>
        );
      case 'security':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Security..." /></div>}>
            <MobileSecurityPanel projectId={projectId} />
          </Suspense>
        );
      case 'collaboration':
        return user ? (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Collaboration..." /></div>}>
            <CollaborationPanel
              projectId={parseInt(projectId, 10)}
              projectName={project?.name}
              currentUser={user}
              currentFile={selectedFileId ? files.find(f => f.id === selectedFileId)?.name : undefined}
              className="h-full"
            />
          </Suspense>
        ) : null;
      case 'search':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Search..." /></div>}>
            <GlobalSearch
              isOpen={true}
              onClose={() => setMobileActiveTab('agent')}
              projectId={projectId}
              onFileSelect={(file) => {
                handleFileSelect({ id: file.id, name: file.name });
              }}
            />
          </Suspense>
        );
      case 'actions':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Actions..." /></div>}>
            <AgentPanelErrorBoundary>
              <ReplitAgentPanelV3
                projectId={projectId}
                mode="mobile"
                agentToolsSettings={agentToolsSettings}
                onAgentToolsSettingsChange={setAgentToolsSettings}
                isBootstrapping={!!bootstrapToken}
                bootstrapToken={bootstrapToken}
                hideInput={true}
                onExternalInput={setMobileAgentHandlers}
              />
            </AgentPanelErrorBoundary>
          </Suspense>
        );
      case 'tools':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Tools..." /></div>}>
            <AgentPanelErrorBoundary>
              <ReplitAgentPanelV3
                projectId={projectId}
                mode="mobile"
                agentToolsSettings={agentToolsSettings}
                onAgentToolsSettingsChange={setAgentToolsSettings}
                isBootstrapping={!!bootstrapToken}
                bootstrapToken={bootstrapToken}
                hideInput={true}
                onExternalInput={setMobileAgentHandlers}
              />
            </AgentPanelErrorBoundary>
          </Suspense>
        );
      case 'more':
        return null;
      default:
        return null;
    }
  };

  const renderTabletContent = () => {
    switch (tabletPanel) {
      case 'editor':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
            <LazyMobileCodeEditor
              projectId={projectId}
              fileId={selectedFileId}
              className="h-full"
            />
          </Suspense>
        );
      case 'terminal':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
            <ReplitTerminalPanel projectId={projectId} />
          </Suspense>
        );
      case 'preview':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
            <ResponsiveWebPreview projectId={projectId} />
          </Suspense>
        );
      case 'agent':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
            <AgentPanelErrorBoundary>
              <ReplitAgentPanelV3
                projectId={projectId}
                mode="tablet"
                agentToolsSettings={agentToolsSettings}
                onAgentToolsSettingsChange={setAgentToolsSettings}
                isBootstrapping={!!bootstrapToken}
                bootstrapToken={bootstrapToken}
              />
            </AgentPanelErrorBoundary>
          </Suspense>
        );
      case 'more':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading..." /></div>}>
            <MobileMoreMenu 
              projectId={projectId}
              isOpen={true}
              inline={true}
              onClose={() => setTabletPanel('editor')}
              onOpenFiles={() => setTabletDrawerOpen(true)}
              onOpenGit={() => { setActiveActivityItem('git'); setShowGitPanel(true); }}
              onOpenPackages={() => { setActiveActivityItem('packages'); setShowPackagesPanel(true); }}
              onOpenSecrets={() => { setActiveActivityItem('secrets'); setShowSecretsPanel(true); }}
              onOpenDatabase={() => { setActiveActivityItem('database'); setShowReplitDB(true); }}
              onOpenSettings={() => { setActiveActivityItem('settings'); setShowSettingsPanel(true); }}
              onOpenDebug={() => { setActiveActivityItem('debug'); setShowDebugPanel(true); }}
              onOpenCollaboration={() => setShowCollaboration(true)}
              onOpenWorkflows={() => { setActiveActivityItem('workflows'); setShowWorkflowsPanel(true); }}
              onOpenHistory={() => { setActiveActivityItem('history'); setShowHistoryPanel(true); }}
              onOpenCheckpoints={() => setShowCheckpointsPanel(true)}
              onOpenExtensions={() => { setActiveActivityItem('extensions'); setShowExtensionsPanel(true); }}
              onOpenSecurity={() => setShowSecurityPanel(true)}
              onOpenActions={() => { setLeftPanelTab('actions'); setTabletPanel('agent'); }}
              onOpenTools={() => { setLeftPanelTab('tools'); setTabletPanel('agent'); }}
              onOpenDeploy={() => { setLeftPanelTab('deployment'); setTabletPanel('agent'); }}
              onOpenCommandPalette={() => setShowCommandPalette(true)}
              onOpenGlobalSearch={() => { setActiveActivityItem('search'); setShowGlobalSearch(true); }}
              onOpenQuickFileSearch={() => setShowQuickFileSearch(true)}
              onOpenKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const renderDesktopContent = () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    
    if (!currentTab) {
      return <div className="flex items-center justify-center h-full text-muted-foreground">Select a tab</div>;
    }

    if (currentTab.id === 'preview') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
          <ResponsiveWebPreview projectId={projectId} />
        </Suspense>
      );
    }

    if (currentTab.id === 'terminal') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
          <ReplitTerminalPanel projectId={projectId} />
        </Suspense>
      );
    }

    if (currentTab.id.startsWith('file:')) {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
          <ReplitMonacoEditor
            projectId={projectId}
            fileId={selectedFileId}
          />
        </Suspense>
      );
    }

    return <div className="flex items-center justify-center h-full text-muted-foreground">Select a file or tool</div>;
  };

  if (deviceType === 'mobile') {
    return (
      <div 
        className={cn(
          'flex flex-col h-screen w-screen overflow-hidden bg-background',
          'touch-manipulation',
          className
        )}
        data-testid="mobile-layout"
      >
        {/* Replit-style Mobile Header */}
        <ReplitMobileHeader
          activeTab={mobileActiveTab}
          onBack={() => window.history.back()}
          onHistory={() => setShowHistoryPanel(true)}
          onNewTab={() => setShowQuickFileSearch(true)}
          onMore={() => setShowMobileMoreMenu(true)}
        />

        {/* Main Content Area - With bottom padding for fixed navigation */}
        <div 
          className="flex-1 overflow-hidden pb-16"
          {...((mobileActiveTab === 'preview' || mobileActiveTab === 'agent') ? mobileSwipeHandlers : {})}
          data-testid="mobile-swipe-area"
          style={{ paddingBottom: mobileActiveTab === 'agent' ? '8rem' : '3.5rem' }}
        >
          <div
            key={mobileActiveTab}
            className="h-full overflow-auto animate-fade-in"
          >
            {renderMobileContent()}
          </div>
        </div>

        {/* Replit-style Floating Input Bar - Only shown on Agent tab */}
        {mobileActiveTab === 'agent' && (
          <ReplitMobileInputBar
            placeholder={mobileAgentHandlers?.agentMode === 'build' ? "What would you like me to build? Type / for integrations" : undefined}
            onSubmit={(value) => {
              if (mobileAgentHandlers?.handleSubmit) {
                mobileAgentHandlers.handleSubmit(value);
              }
            }}
            isWorking={mobileAgentHandlers?.isWorking}
            agentMode={mobileAgentHandlers?.agentMode}
            onSlashCommand={() => mobileAgentHandlers?.handleSlashCommand?.()}
            agentToolsSettings={agentToolsSettings}
            onAgentToolsSettingsChange={setAgentToolsSettings}
          />
        )}

        {/* Replit-style Bottom Navigation */}
        <ReplitMobileNavigation
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
          isRunning={isRunning}
          onPlayStop={handleRunStop}
          isPanelOpen={showToolsSheet}
          onPanelToggle={() => setShowToolsSheet(!showToolsSheet)}
          onMorePress={() => setShowMobileMoreMenu(true)}
          openTabs={openTabs}
          activeOpenTabId={activeOpenTabId}
          onOpenTabSelect={handleSelectOpenTab}
          onAddTab={() => setShowToolsSheet(true)}
          onTabSwitcherOpen={() => setShowTabSwitcher(true)}
        />

        {/* Mobile Panel Overlays - Fixed positioned panels that appear over mobile content */}
        {showGitPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-git-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Git</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowGitPanel)} className="h-8 w-8" data-testid="button-close-git">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitGitPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showPackagesPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-packages-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Packages</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowPackagesPanel)} className="h-8 w-8" data-testid="button-close-packages">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitPackagesPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showSecretsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-secrets-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Secrets</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSecretsPanel)} className="h-8 w-8" data-testid="button-close-secrets">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitSecretsPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showReplitDB && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-database-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Database Browser</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowReplitDB)} className="h-8 w-8" data-testid="button-close-database">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitDB projectId={parseInt(projectId, 10)} />
              </div>
            </Suspense>
          </div>
        )}

        {showDebugPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-debug-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Debugger</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowDebugPanel)} className="h-8 w-8" data-testid="button-close-debug">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitDebuggerPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showSettingsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-settings-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Settings</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSettingsPanel)} className="h-8 w-8" data-testid="button-close-settings">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitSettingsPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showCollaboration && user && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-collaboration-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Collaboration</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowCollaboration)} className="h-8 w-8" data-testid="button-close-collaboration">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <CollaborationPanel
                projectId={parseInt(projectId, 10)}
                projectName={project?.name}
                currentUser={user}
                currentFile={selectedFileId ? files.find(f => f.id === selectedFileId)?.name : undefined}
                className="h-[calc(100%-52px)]"
              />
            </Suspense>
          </div>
        )}

        {showWorkflowsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-workflows-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Workflows</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowWorkflowsPanel)} className="h-8 w-8" data-testid="button-close-workflows">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <WorkflowsPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showHistoryPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-history-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">History</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowHistoryPanel)} className="h-8 w-8" data-testid="button-close-history">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitHistoryPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showCheckpointsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-checkpoints-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">AI Checkpoints</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowCheckpointsPanel)} className="h-8 w-8" data-testid="button-close-checkpoints">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto p-2">
                <CheckpointHistoryPanel projectId={projectId} maxHeight="calc(100vh - 80px)" />
              </div>
            </Suspense>
          </div>
        )}

        {showExtensionsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-extensions-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Extensions</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowExtensionsPanel)} className="h-8 w-8" data-testid="button-close-extensions">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <ExtensionsMarketplace className="h-[calc(100%-52px)]" />
            </Suspense>
          </div>
        )}

        {showSecurityPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-security-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Security Scanner</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSecurityPanel)} className="h-8 w-8" data-testid="button-close-security">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <MobileSecurityPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showDeployPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="mobile-deploy-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Deploy</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowDeployPanel)} className="h-8 w-8" data-testid="button-close-deploy">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitDeploymentPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        <Suspense fallback={null}>
          <MobileMoreMenu
            projectId={projectId}
            isOpen={showMobileMoreMenu}
            onClose={() => setShowMobileMoreMenu(false)}
            onOpenGit={() => { setShowMobileMoreMenu(false); handleAddOpenTab('git'); }}
            onOpenPackages={() => { setShowMobileMoreMenu(false); handleAddOpenTab('packages'); }}
            onOpenSecrets={() => { setShowMobileMoreMenu(false); handleAddOpenTab('secrets'); }}
            onOpenDatabase={() => { setShowMobileMoreMenu(false); handleAddOpenTab('database'); }}
            onOpenSettings={() => { setShowMobileMoreMenu(false); handleAddOpenTab('settings'); }}
            onOpenDebug={() => { setShowMobileMoreMenu(false); handleAddOpenTab('debug'); }}
            onOpenCollaboration={() => { setShowMobileMoreMenu(false); handleAddOpenTab('collaboration'); }}
            onOpenWorkflows={() => { setShowMobileMoreMenu(false); handleAddOpenTab('workflows'); }}
            onOpenHistory={() => { setShowMobileMoreMenu(false); handleAddOpenTab('history'); }}
            onOpenCheckpoints={() => { setShowMobileMoreMenu(false); handleAddOpenTab('checkpoints'); }}
            onOpenExtensions={() => { setShowMobileMoreMenu(false); handleAddOpenTab('extensions'); }}
            onOpenSecurity={() => { setShowMobileMoreMenu(false); handleAddOpenTab('security'); }}
            onOpenDeploy={() => { setShowMobileMoreMenu(false); handleAddOpenTab('deploy'); }}
            onOpenWeb={() => { setShowMobileMoreMenu(false); handleAddOpenTab('preview'); }}
            onOpenActions={() => { setShowMobileMoreMenu(false); handleAddOpenTab('actions'); }}
            onOpenTools={() => { setShowMobileMoreMenu(false); handleAddOpenTab('tools'); }}
            onOpenCommandPalette={() => { setShowMobileMoreMenu(false); setShowCommandPalette(true); }}
            onOpenGlobalSearch={() => { setShowMobileMoreMenu(false); handleAddOpenTab('search'); }}
            onOpenQuickFileSearch={() => { setShowMobileMoreMenu(false); setShowQuickFileSearch(true); }}
            onOpenKeyboardShortcuts={() => { setShowMobileMoreMenu(false); setShowKeyboardShortcuts(true); }}
            problemsCount={errorsCount}
          />
        </Suspense>

        {showGlobalSearch && (
          <Suspense fallback={null}>
            <GlobalSearch
              isOpen={showGlobalSearch}
              onClose={() => closePanel(setShowGlobalSearch)}
              projectId={projectId}
              onFileSelect={(file) => {
                handleFileSelect({ id: file.id, name: file.name });
                closePanel(setShowGlobalSearch);
              }}
            />
          </Suspense>
        )}

        {showCommandPalette && (
          <Suspense fallback={null}>
            <CommandPalette
              open={showCommandPalette}
              onOpenChange={setShowCommandPalette}
              files={files}
              onFileSelect={(file: { id: number; name: string } | number) => {
                setShowCommandPalette(false);
                if (typeof file === 'number') {
                  handleFileSelect({ id: file, name: '' });
                } else {
                  handleFileSelect({ id: file.id, name: file.name });
                }
              }}
              onToolSelect={(tool) => {
                setShowCommandPalette(false);
                handleAddTool(tool);
              }}
            />
          </Suspense>
        )}

        {/* Mobile Tools Sheet */}
        <ReplitToolsSheet
          open={showToolsSheet}
          onClose={() => setShowToolsSheet(false)}
          onSelectTool={(tool) => {
            handleAddTool(tool);
            handleAddOpenTab(tool);
            setShowToolsSheet(false);
          }}
        />

        {/* Mobile Tab Switcher */}
        <Suspense fallback={null}>
          <MobileTabSwitcher
            isOpen={showTabSwitcher}
            onClose={() => setShowTabSwitcher(false)}
            openTabs={openTabs}
            activeTabId={activeOpenTabId}
            onTabSelect={handleSelectOpenTab}
            onTabClose={handleCloseOpenTab}
            onNewTab={() => {
              setShowTabSwitcher(false);
              setShowToolsSheet(true);
            }}
            onQuickAccess={handleQuickAccess}
          />
        </Suspense>
      </div>
    );
  }

  if (deviceType === 'tablet') {
    return (
      <div
        className={cn(
          'flex h-screen w-screen overflow-hidden bg-background',
          'touch-manipulation select-none',
          className
        )}
        data-testid="tablet-layout"
        {...tabletPanHandlers}
      >
        <div
          className={cn(
            "fixed left-0 top-0 z-40 h-full bg-background border-r border-border shadow-xl w-[280px]",
            "transition-transform duration-300 ease-out",
            tabletDrawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
          data-testid="tablet-drawer"
        >
          <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold">Files</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTabletDrawerOpen(false)}
              className="h-10 w-10 touch-manipulation"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-hidden">
            <ReplitFileExplorer
              projectId={projectId}
              onFileSelect={(file) => {
                handleFileSelect(file);
                setTabletPanel('editor');
              }}
              selectedFileId={selectedFileId}
              isBootstrapping={!!bootstrapToken}
            />
          </div>
        </div>

        <div
          className={cn(
            "fixed inset-0 z-30 bg-black/20 backdrop-blur-sm",
            "transition-opacity duration-300",
            tabletDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setTabletDrawerOpen(false)}
        />

        <div className="flex-1 flex flex-col">
          {/* Replit-style Header for Tablet - Integrated with File Drawer Toggle */}
          <header className="sticky top-0 z-30 flex items-center justify-between h-12 px-3 bg-white dark:bg-[#1C1C1C] border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTabletDrawerOpen(!tabletDrawerOpen)}
                className="h-9 w-9"
                data-testid="button-tablet-drawer-toggle"
              >
                {tabletDrawerOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white text-sm capitalize">
                {mobileActiveTab}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickFileSearch(true)}
                className="h-9 w-9"
                data-testid="button-quick-search"
              >
                <Code className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowToolsSheet(true)}
                className="h-9 w-9"
                data-testid="button-tablet-more"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {/* Main Content Area - With bottom padding for fixed navigation */}
          <div 
            className="flex-1 overflow-auto"
            style={{ paddingBottom: mobileActiveTab === 'agent' ? '8rem' : '3.5rem' }}
          >
            {renderMobileContent()}
          </div>

          {/* Replit-style Floating Input Bar for Agent Tab */}
          {mobileActiveTab === 'agent' && (
            <ReplitMobileInputBar
              placeholder={mobileAgentHandlers?.agentMode === 'build' ? "What would you like me to build? Type / for integrations" : undefined}
              onSubmit={(value) => {
                if (mobileAgentHandlers?.handleSubmit) {
                  mobileAgentHandlers.handleSubmit(value);
                }
              }}
              isWorking={mobileAgentHandlers?.isWorking}
              agentMode={mobileAgentHandlers?.agentMode}
              onSlashCommand={() => mobileAgentHandlers?.handleSlashCommand?.()}
              agentToolsSettings={agentToolsSettings}
              onAgentToolsSettingsChange={setAgentToolsSettings}
            />
          )}

          {/* Replit-style Bottom Navigation for Tablet */}
          <ReplitMobileNavigation
            activeTab={mobileActiveTab}
            onTabChange={setMobileActiveTab}
            isRunning={isRunning}
            onPlayStop={handleRunStop}
            isPanelOpen={showToolsSheet}
            onPanelToggle={() => setShowToolsSheet(!showToolsSheet)}
            onMorePress={() => setShowMobileMoreMenu(true)}
            openTabs={openTabs}
            activeOpenTabId={activeOpenTabId}
            onOpenTabSelect={handleSelectOpenTab}
            onAddTab={() => setShowToolsSheet(true)}
            onTabSwitcherOpen={() => setShowTabSwitcher(true)}
          />
        </div>

        {/* Tablet Panel Overlays - Fixed positioned panels that appear over tablet content */}
        {showGitPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-git-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Git</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowGitPanel)} className="h-8 w-8" data-testid="button-close-git">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitGitPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showPackagesPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-packages-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Packages</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowPackagesPanel)} className="h-8 w-8" data-testid="button-close-packages">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitPackagesPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showSecretsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-secrets-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Secrets</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSecretsPanel)} className="h-8 w-8" data-testid="button-close-secrets">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitSecretsPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showReplitDB && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-database-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Database Browser</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowReplitDB)} className="h-8 w-8" data-testid="button-close-database">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitDB projectId={parseInt(projectId, 10)} />
              </div>
            </Suspense>
          </div>
        )}

        {showDebugPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-debug-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Debugger</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowDebugPanel)} className="h-8 w-8" data-testid="button-close-debug">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitDebuggerPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showSettingsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-settings-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Settings</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSettingsPanel)} className="h-8 w-8" data-testid="button-close-settings">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitSettingsPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showCollaboration && user && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-collaboration-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Collaboration</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowCollaboration)} className="h-8 w-8" data-testid="button-close-collaboration">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <CollaborationPanel
                projectId={parseInt(projectId, 10)}
                projectName={project?.name}
                currentUser={user}
                currentFile={selectedFileId ? files.find(f => f.id === selectedFileId)?.name : undefined}
                className="h-[calc(100%-52px)]"
              />
            </Suspense>
          </div>
        )}

        {showWorkflowsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-workflows-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Workflows</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowWorkflowsPanel)} className="h-8 w-8" data-testid="button-close-workflows">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <WorkflowsPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showHistoryPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-history-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">History</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowHistoryPanel)} className="h-8 w-8" data-testid="button-close-history">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <ReplitHistoryPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showCheckpointsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-checkpoints-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">AI Checkpoints</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowCheckpointsPanel)} className="h-8 w-8" data-testid="button-close-checkpoints">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto p-2">
                <CheckpointHistoryPanel projectId={projectId} maxHeight="calc(100vh - 80px)" />
              </div>
            </Suspense>
          </div>
        )}

        {showExtensionsPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-extensions-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Extensions</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowExtensionsPanel)} className="h-8 w-8" data-testid="button-close-extensions">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <ExtensionsMarketplace className="h-[calc(100%-52px)]" />
            </Suspense>
          </div>
        )}

        {showSecurityPanel && (
          <div className="fixed inset-0 z-[100] bg-background" data-testid="tablet-security-panel">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium">Security Scanner</span>
              <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSecurityPanel)} className="h-8 w-8" data-testid="button-close-security">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
              <div className="h-[calc(100%-52px)] overflow-auto">
                <MobileSecurityPanel projectId={projectId} />
              </div>
            </Suspense>
          </div>
        )}

        {showGlobalSearch && (
          <Suspense fallback={null}>
            <GlobalSearch
              isOpen={showGlobalSearch}
              onClose={() => closePanel(setShowGlobalSearch)}
              projectId={projectId}
              onFileSelect={(file) => {
                handleFileSelect({ id: file.id, name: file.name });
                closePanel(setShowGlobalSearch);
              }}
            />
          </Suspense>
        )}

        {showCommandPalette && (
          <Suspense fallback={null}>
            <CommandPalette
              open={showCommandPalette}
              onOpenChange={setShowCommandPalette}
              files={files}
              onFileSelect={(file: { id: number; name: string } | number) => {
                setShowCommandPalette(false);
                if (typeof file === 'number') {
                  handleFileSelect({ id: file, name: '' });
                } else {
                  handleFileSelect({ id: file.id, name: file.name });
                }
              }}
              onToolSelect={(tool) => {
                setShowCommandPalette(false);
                handleAddTool(tool);
              }}
            />
          </Suspense>
        )}

        {/* Tablet Tools Sheet */}
        <ReplitToolsSheet
          open={showToolsSheet}
          onClose={() => setShowToolsSheet(false)}
          onSelectTool={(tool) => {
            handleAddTool(tool);
            handleAddOpenTab(tool);
            setShowToolsSheet(false);
          }}
        />

        {/* Tablet Tab Switcher */}
        <Suspense fallback={null}>
          <MobileTabSwitcher
            isOpen={showTabSwitcher}
            onClose={() => setShowTabSwitcher(false)}
            openTabs={openTabs}
            activeTabId={activeOpenTabId}
            onTabSelect={handleSelectOpenTab}
            onTabClose={handleCloseOpenTab}
            onNewTab={() => {
              setShowTabSwitcher(false);
              setShowToolsSheet(true);
            }}
            onQuickAccess={handleQuickAccess}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen bg-[var(--ecode-background)] overflow-hidden", className)} data-testid="desktop-layout">
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
      
      <div className="flex flex-col flex-1 min-w-0">
        <TopNavBar
          projectName={project?.name || 'Loading...'}
          projectSlug={project?.slug || String(project?.id || projectId)}
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
          onToggleCollaboration={() => setShowCollaboration(prev => !prev)}
          collaboratorCount={0}
          onOpenDeployLogs={() => setDeploymentTab('logs')}
          onOpenDeployAnalytics={() => setDeploymentTab('analytics')}
          showTabs={false}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        />
        
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
        
        <ResizablePanelGroup direction="horizontal" className="flex-1" data-testid="desktop-panel-group">
          {!isSidebarCollapsed && (
            <ResizablePanel defaultSize={30} minSize={20} maxSize={40} data-testid="desktop-left-panel">
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
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading AI Agent...</div>}>
                      <ReplitAgentPanelV3
                        key={`agent-${projectId}`}
                        projectId={projectId}
                        mode="desktop"
                        agentToolsSettings={agentToolsSettings}
                        onAgentToolsSettingsChange={setAgentToolsSettings}
                        isBootstrapping={!!bootstrapToken}
                        bootstrapToken={bootstrapToken}
                      />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="actions" className="flex-1 mt-0 overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <AgentActionsPanel projectId={projectId} />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="tools" className="flex-1 mt-0 overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <ToolsPanel
                        availableTools={availableTools}
                        onSelectTool={handleAddTool}
                        activeTabs={tabs.map(t => t.id)}
                      />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="deployment" className="flex-1 mt-0 overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
                      <ReplitDeploymentPanel
                        projectId={projectId}
                        defaultTab={deploymentTab || 'deploy'}
                      />
                    </Suspense>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          )}
          
          {!isSidebarCollapsed && <ResizableHandle withHandle />}
          
          <ResizablePanel defaultSize={isSidebarCollapsed ? (showFileExplorer ? 82 : 100) : (showFileExplorer ? 52 : 70)} minSize={30} data-testid="desktop-main-panel">
            <div className="h-full flex flex-col">
              {renderDesktopContent()}
            </div>
          </ResizablePanel>
          
          {showFileExplorer && (
            <>
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={18} minSize={15} maxSize={30} data-testid="desktop-right-panel">
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
                    isBootstrapping={!!bootstrapToken}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        
        <StatusBar
          gitBranch={gitBranch}
          isRunning={isRunning}
          cursorPosition={cursorPosition}
          language="TypeScript"
          encoding="UTF-8"
          onShowShortcuts={() => setShowKeyboardShortcuts(true)}
          isConnected={isConnected}
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
            handleFileSelect({ id: fileId, name: file.name });
          }
          setShowQuickFileSearch(false);
        }}
      />
      
      <KeyboardShortcutsOverlay
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
      />
      
      <ReplitToolsSheet
        open={showToolsSheet}
        onClose={() => setShowToolsSheet(false)}
        onSelectTool={(tool) => {
          handleAddTool(tool);
          // Also add to open tabs for mobile navigation (harmless on desktop)
          handleAddOpenTab(tool);
          setShowToolsSheet(false);
        }}
      />
      
      {/* Mobile Tab Switcher Overlay */}
      <Suspense fallback={null}>
        <MobileTabSwitcher
          isOpen={showTabSwitcher}
          onClose={() => setShowTabSwitcher(false)}
          openTabs={openTabs}
          activeTabId={activeOpenTabId}
          onTabSelect={handleSelectOpenTab}
          onTabClose={handleCloseOpenTab}
          onNewTab={() => {
            setShowTabSwitcher(false);
            setShowToolsSheet(true);
          }}
          onQuickAccess={handleQuickAccess}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <CommandPalette
          open={showCommandPalette}
          onOpenChange={setShowCommandPalette}
          files={files}
          onFileSelect={(file: { id: number; name: string } | number) => {
            setShowCommandPalette(false);
            if (typeof file === 'number') {
              handleFileSelect({ id: file, name: '' });
            } else {
              handleFileSelect({ id: file.id, name: file.name });
            }
          }}
          onToolSelect={(tool) => {
            setShowCommandPalette(false);
            handleAddTool(tool);
          }}
        />
      </Suspense>

      <Suspense fallback={null}>
        <GlobalSearch
          isOpen={showGlobalSearch}
          onClose={() => closePanel(setShowGlobalSearch)}
          projectId={projectId}
          onFileSelect={(file) => {
            handleFileSelect({ id: file.id, name: file.name });
            closePanel(setShowGlobalSearch);
          }}
        />
      </Suspense>

      {showCollaboration && user && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Collaboration</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => closePanel(setShowCollaboration)}
              className="h-7 w-7"
              data-testid="button-close-collaboration"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <CollaborationPanel
              projectId={parseInt(projectId, 10)}
              projectName={project?.name}
              currentUser={user}
              currentFile={selectedFileId ? files.find(f => f.id === selectedFileId)?.name : undefined}
              className="h-[calc(100%-48px)]"
            />
          </Suspense>
        </div>
      )}

      {showReplitDB && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Database Browser</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => closePanel(setShowReplitDB)}
              className="h-7 w-7"
              data-testid="button-close-database"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitDB projectId={parseInt(projectId, 10)} />
            </div>
          </Suspense>
        </div>
      )}

      {showGitPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Git</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowGitPanel)} className="h-7 w-7" data-testid="button-close-git">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitGitPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showPackagesPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Packages</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowPackagesPanel)} className="h-7 w-7" data-testid="button-close-packages">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitPackagesPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showDebugPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Debugger</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowDebugPanel)} className="h-7 w-7" data-testid="button-close-debug">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitDebuggerPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showSecretsPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Secrets</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSecretsPanel)} className="h-7 w-7" data-testid="button-close-secrets">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitSecretsPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showWorkflowsPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Workflows</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowWorkflowsPanel)} className="h-7 w-7" data-testid="button-close-workflows">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <WorkflowsPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showHistoryPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">History</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowHistoryPanel)} className="h-7 w-7" data-testid="button-close-history">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitHistoryPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showCheckpointsPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">AI Checkpoints</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowCheckpointsPanel)} className="h-7 w-7" data-testid="button-close-checkpoints">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)] overflow-auto p-2">
              <CheckpointHistoryPanel projectId={projectId} maxHeight="calc(100vh - 80px)" />
            </div>
          </Suspense>
        </div>
      )}

      {showExtensionsPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Extensions</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowExtensionsPanel)} className="h-7 w-7" data-testid="button-close-extensions">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <ExtensionsMarketplace className="h-[calc(100%-48px)]" />
          </Suspense>
        </div>
      )}

      {showSettingsPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Settings</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSettingsPanel)} className="h-7 w-7" data-testid="button-close-settings">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <ReplitSettingsPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {showSecurityPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-[100] shadow-xl border-l bg-background">
          <div className="flex items-center justify-between p-2 border-b">
            <span className="font-medium text-sm">Security Scanner</span>
            <Button size="icon" variant="ghost" onClick={() => closePanel(setShowSecurityPanel)} className="h-7 w-7" data-testid="button-close-security">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
            <div className="h-[calc(100%-48px)]">
              <MobileSecurityPanel projectId={projectId} />
            </div>
          </Suspense>
        </div>
      )}

      {/* Autonomous Workspace Viewer - Shows bootstrap progress as dialog (only when inline mode is disabled) */}
      {/* When inline mode is enabled (default), progress appears in the agent chat instead */}
      {bootstrapToken && !autonomousBuildStore.inlineMode && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="workspace-viewer-loading">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading workspace viewer...</p>
            </div>
          </div>
        }>
          <AutonomousWorkspaceViewer
            bootstrapToken={bootstrapToken}
            projectId={projectId}
            onComplete={onWorkspaceComplete}
            onError={onWorkspaceError}
          />
        </Suspense>
      )}

      {enableShortcutHint && <ShortcutHint />}
      {enableShortcutTester && <ShortcutTester />}
    </div>
  );
}

export default UnifiedIDELayout;
