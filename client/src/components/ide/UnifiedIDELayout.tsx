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

import { useState, useCallback, Suspense, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { createPanHandlers, type PanInfo } from '@/lib/native-motion';
import { useIDEWorkspace, availableTools } from '@/hooks';
import { useDeviceType } from '@/hooks/use-media-query';
import { useConnectionStatus } from '@/hooks/use-connection-status';
import { useProblemsCount } from '@/hooks/use-problems-count';
import { useToast } from '@/hooks/use-toast';
import { instrumentedLazy } from '@/utils/instrumented-lazy';
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

const ReplitMonacoEditor = instrumentedLazy(() => import('@/components/editor/ReplitMonacoEditor').then(mod => ({ default: mod.ReplitMonacoEditor })), 'ReplitMonacoEditor');
const ReplitTerminalPanel = instrumentedLazy(() => import('@/components/editor/ReplitTerminalPanel').then(mod => ({ default: mod.ReplitTerminalPanel })), 'ReplitTerminalPanel');
const ReplitDeploymentPanel = instrumentedLazy(() => import('@/components/ide/ReplitDeploymentPanel').then(mod => ({ default: mod.ReplitDeploymentPanel })), 'ReplitDeploymentPanel');
import { ReplitAgentPanelV3 } from '@/components/ai/ReplitAgentPanelV3';
import { AgentPanelErrorBoundary } from '@/components/ai/AgentPanelErrorBoundary';
import type { ExternalInputHandlers } from '@/components/ai/ReplitAgentPanelV3';
const ResponsiveWebPreview = instrumentedLazy(() => import('@/components/editor/ResponsiveWebPreview').then(mod => ({ default: mod.ResponsiveWebPreview })), 'ResponsiveWebPreview');
const AgentActionsPanel = instrumentedLazy(() => import('@/components/ide/AgentActionsPanel').then(mod => ({ default: mod.AgentActionsPanel })), 'AgentActionsPanel');
const ToolsPanel = instrumentedLazy(() => import('@/components/ide/ToolsPanel').then(mod => ({ default: mod.ToolsPanel })), 'ToolsPanel');

const EnhancedMobileFileExplorer = instrumentedLazy(() => import('@/components/mobile/EnhancedMobileFileExplorer').then(mod => ({ default: mod.EnhancedMobileFileExplorer })), 'EnhancedMobileFileExplorer');
const LazyMobileCodeEditor = instrumentedLazy(() => import('@/components/mobile/LazyMobileCodeEditor').then(mod => ({ default: mod.LazyMobileCodeEditor })), 'LazyMobileCodeEditor');
const EnhancedMobileTerminal = instrumentedLazy(() => import('@/components/mobile/EnhancedMobileTerminal').then(mod => ({ default: mod.EnhancedMobileTerminal })), 'EnhancedMobileTerminal');
const MobilePreviewPanel = instrumentedLazy(() => import('@/components/mobile/MobilePreviewPanel').then(mod => ({ default: mod.MobilePreviewPanel })), 'MobilePreviewPanel');
const MobileMoreMenu = instrumentedLazy(() => import('@/components/mobile/MobileMoreMenu').then(mod => ({ default: mod.MobileMoreMenu })), 'MobileMoreMenu');
const MobileSecurityPanel = instrumentedLazy(() => import('@/components/mobile/MobileSecurityPanel').then(mod => ({ default: mod.MobileSecurityPanel })), 'MobileSecurityPanel');
const MobileTabSwitcher = instrumentedLazy(() => import('@/components/mobile/MobileTabSwitcher').then(mod => ({ default: mod.MobileTabSwitcher })), 'MobileTabSwitcher');

const CommandPalette = instrumentedLazy(() => import('@/components/CommandPalette').then(mod => ({ default: mod.CommandPalette })), 'CommandPalette');
const GlobalSearch = instrumentedLazy(() => import('@/components/GlobalSearch').then(mod => ({ default: mod.GlobalSearch })), 'GlobalSearch');
const CollaborationPanel = instrumentedLazy(() => import('@/components/CollaborationPanel').then(mod => ({ default: mod.CollaborationPanel })), 'CollaborationPanel');
const DatabasePanel = instrumentedLazy(() => import('@/components/ide/DatabasePanel').then(mod => ({ default: mod.DatabasePanel })), 'DatabasePanel');
const AutonomousWorkspaceViewer = instrumentedLazy(() => import('@/components/ide/AutonomousWorkspaceViewer'), 'AutonomousWorkspaceViewer');

const ReplitGitPanel = instrumentedLazy(() => import('@/components/editor/ReplitGitPanel').then(mod => ({ default: mod.ReplitGitPanel })), 'ReplitGitPanel');
const ReplitPackagesPanel = instrumentedLazy(() => import('@/components/editor/ReplitPackagesPanel').then(mod => ({ default: mod.ReplitPackagesPanel })), 'ReplitPackagesPanel');
const ReplitDebuggerPanel = instrumentedLazy(() => import('@/components/editor/ReplitDebuggerPanel').then(mod => ({ default: mod.ReplitDebuggerPanel })), 'ReplitDebuggerPanel');
const ReplitTestingPanel = instrumentedLazy(() => import('@/components/editor/ReplitTestingPanel').then(mod => ({ default: mod.ReplitTestingPanel })), 'ReplitTestingPanel');
const ReplitSecretsPanel = instrumentedLazy(() => import('@/components/editor/ReplitSecretsPanel').then(mod => ({ default: mod.ReplitSecretsPanel })), 'ReplitSecretsPanel');
const ReplitHistoryPanel = instrumentedLazy(() => import('@/components/editor/ReplitHistoryPanel').then(mod => ({ default: mod.ReplitHistoryPanel })), 'ReplitHistoryPanel');
const UnifiedCheckpointsPanel = instrumentedLazy(() => import('@/components/UnifiedCheckpointsPanel').then(mod => ({ default: mod.UnifiedCheckpointsPanel })), 'UnifiedCheckpointsPanel');
const ReplitSettingsPanel = instrumentedLazy(() => import('@/components/editor/ReplitSettingsPanel').then(mod => ({ default: mod.ReplitSettingsPanel })), 'ReplitSettingsPanel');
const ReplitThemesPanel = instrumentedLazy(() => import('@/components/editor/ReplitThemesPanel').then(mod => ({ default: mod.ReplitThemesPanel })), 'ReplitThemesPanel');
const ReplitMultiplayers = instrumentedLazy(() => import('@/components/editor/ReplitMultiplayers').then(mod => ({ default: mod.ReplitMultiplayers })), 'ReplitMultiplayers');
const WorkflowsPanel = instrumentedLazy(() => import('@/components/ide/WorkflowsPanel').then(mod => ({ default: mod.WorkflowsPanel })), 'WorkflowsPanel');
const ExtensionsMarketplace = instrumentedLazy(() => import('@/components/ExtensionsMarketplace').then(mod => ({ default: mod.ExtensionsMarketplace })), 'ExtensionsMarketplace');
const VisualEditorPanel = instrumentedLazy(() => import('@/components/ide/VisualEditorPanel').then(mod => ({ default: mod.VisualEditorPanel })), 'VisualEditorPanel');
const ShellPanel = instrumentedLazy(() => import('@/components/editor/ShellPanel').then(mod => ({ default: mod.ShellPanel })), 'ShellPanel');
const AppStoragePanel = instrumentedLazy(() => import('@/components/editor/AppStoragePanel').then(mod => ({ default: mod.AppStoragePanel })), 'AppStoragePanel');
const ReplitConsolePanel = instrumentedLazy(() => import('@/components/ide/ReplitConsolePanel').then(mod => ({ default: mod.ReplitConsolePanel })), 'ReplitConsolePanel');

import { ShortcutHint, ShortcutTester } from '@/components/utilities';
import { useAutonomousBuildStore } from '@/stores/autonomousBuildStore';
import { useElectronMenuEvents } from '@/hooks/useElectron';
import { useSchemaWarmingStore } from '@/stores/schemaWarmingStore';
import { AppNotReadyPlaceholder } from '@/components/mobile/AppNotReadyPlaceholder';

interface UnifiedIDELayoutProps {
  projectId: string;
  className?: string;
  bootstrapToken?: string | null;
  onWorkspaceComplete?: () => void;
  onWorkspaceError?: (error: string) => void;
  // ✅ FIX (Dec 25, 2025): Callback when agent bootstrap fails (clears token to exit loading)
  onBootstrapFailure?: () => void;
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
  onBootstrapFailure,
}: UnifiedIDELayoutProps) {
  const deviceType = useDeviceType();
  const { toast } = useToast();
  const connectionStatus = useConnectionStatus();
  const isConnected = connectionStatus.isOnline && connectionStatus.backendHealthy;
  const { errorsCount } = useProblemsCount(projectId);
  
  // Autonomous build store for inline chat integration and preview splash screens
  const autonomousBuildStore = useAutonomousBuildStore();
  
  // Schema warming store - shows "App not ready" placeholder until schema is ready
  const { isReady: isSchemaReady } = useSchemaWarmingStore();
  
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
        // Open global search as inline tab
        handleAddTool('search');
        break;
      case 'git':
        // Open git as inline tab instead of overlay
        handleAddTool('git');
        break;
      case 'packages':
        // Open packages as inline tab instead of overlay
        handleAddTool('packages');
        break;
      case 'debug':
        // Open debugger as inline tab instead of overlay
        handleAddTool('debugger');
        break;
      case 'terminal':
        handleAddTool('terminal');
        break;
      case 'agent':
        setIsSidebarCollapsed(false);
        setLeftPanelTab('agent');
        break;
      case 'deploy':
        // Open deployment as inline tab
        handleAddTool('deployment');
        break;
      case 'secrets':
        // Open secrets as inline tab instead of overlay
        handleAddTool('secrets');
        break;
      case 'database':
        // Open database as inline tab instead of overlay
        handleAddTool('database');
        break;
      case 'preview':
        handleAddTool('preview');
        break;
      case 'workflows':
        // Open workflows as inline tab instead of overlay
        handleAddTool('workflows');
        break;
      case 'history':
        // Open history as inline tab instead of overlay
        handleAddTool('history');
        break;
      case 'extensions':
        // Open extensions as inline tab instead of overlay
        handleAddTool('extensions');
        break;
      case 'settings':
        // Open settings as inline tab instead of overlay
        handleAddTool('settings');
        break;
    }
  }, [setActiveActivityItem, setShowFileExplorer, setIsSidebarCollapsed, setLeftPanelTab, handleAddTool]);

  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('agent');
  const [tabletPanel, setTabletPanel] = useState<TabletPanel>('editor');
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(true);
  
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [enableShortcutHint, setEnableShortcutHint] = useState(false);
  const [enableShortcutTester, setEnableShortcutTester] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [showTabSwitcher, setShowTabSwitcher] = useState(false);
  
  // Tab content transition animation state (Fortune 500 level)
  // displayedTab holds the tab ID whose content is currently rendered
  // This allows us to fade out the OLD content before switching to new
  const [displayedTab, setDisplayedTab] = useState(activeTab);
  const [tabContentVisible, setTabContentVisible] = useState(true);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check for reduced motion preference (accessibility compliance)
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }, []);
  
  // Smooth tab transition with accessibility and performance optimizations
  useEffect(() => {
    if (displayedTab !== activeTab) {
      // Clear any pending transition (debounce rapid tab switches)
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
      
      // Accessibility: Instant switch if user prefers reduced motion
      if (prefersReducedMotion) {
        setDisplayedTab(activeTab);
        setTabContentVisible(true); // Ensure content stays visible
        return;
      }
      
      // Phase 1: Fade out current content
      setTabContentVisible(false);
      
      // Phase 2: After fade out (100ms), switch to new tab and fade in
      transitionTimerRef.current = setTimeout(() => {
        setDisplayedTab(activeTab);
        setTabContentVisible(true);
        transitionTimerRef.current = null;
      }, 100);
    }
    
    // Cleanup: Only clear if a timer was scheduled
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }
    };
  }, [activeTab, displayedTab, prefersReducedMotion]);
  
  // Open tabs for mobile navigation - tracks which tools are open as tabs
  // Core tabs (Preview, Agent, Deploy) are always visible like Replit's mobile IDE
  interface OpenTab {
    id: string;
    name: string;
    icon: string;
  }
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'preview', name: 'Preview', icon: 'preview' },
    { id: 'agent', name: 'Agent', icon: 'agent' },
    { id: 'deploy', name: 'Deploy', icon: 'deploy' },
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
        handleAddOpenTab('secrets');
        break;
      case 'database':
        handleAddOpenTab('database');
        break;
      case 'auth':
        handleAddOpenTab('auth');
        break;
    }
  }, [handleAddOpenTab]);

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
      handleAddTool('settings');
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
        // Open Global Search tab
        handleAddOpenTab('search');
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickFileSearch(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setShowQuickFileSearch, handleAddOpenTab]);

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
    // ✅ FIX (Jan 2026): During bootstrap, keep agent panel mounted even if project is loading
    // This prevents WebSocket disconnection when isLoadingProject oscillates
    // The agent panel handles its own loading state during bootstrap
    if (isLoadingProject && !(mobileActiveTab === 'agent' && bootstrapToken)) {
      return (
        <div className="flex items-center justify-center h-full">
          <ECodeLoading size="md" text="Loading workspace..." />
        </div>
      );
    }
    
    switch (mobileActiveTab) {
      case 'preview':
        // Gate preview with AppNotReadyPlaceholder until schema is ready
        if (!isSchemaReady) {
          return <AppNotReadyPlaceholder tabName="Preview" />;
        }
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Preview..." /></div>}>
            <MobilePreviewPanel projectId={projectId} />
          </Suspense>
        );
      case 'agent':
        return (
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
              onBootstrapFailure={onBootstrapFailure}
            />
          </AgentPanelErrorBoundary>
        );
      case 'deploy':
        // Gate deploy with AppNotReadyPlaceholder until schema is ready
        if (!isSchemaReady) {
          return <AppNotReadyPlaceholder tabName="Deploy" />;
        }
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
            <DatabasePanel projectId={projectId} />
          </Suspense>
        );
      case 'shell':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Shell..." /></div>}>
            <ShellPanel projectId={projectId} />
          </Suspense>
        );
      case 'storage':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Storage..." /></div>}>
            <AppStoragePanel projectId={projectId} />
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
      case 'themes':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Themes..." /></div>}>
            <ReplitThemesPanel projectId={projectId} />
          </Suspense>
        );
      case 'multiplayers':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Multiplayers..." /></div>}>
            <ReplitMultiplayers projectId={projectId} />
          </Suspense>
        );
      case 'checkpoints':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Checkpoints..." /></div>}>
            <UnifiedCheckpointsPanel projectId={projectId} maxHeight="calc(100vh - 120px)" />
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
      case 'testing':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Testing..." /></div>}>
            <ReplitTestingPanel projectId={projectId} />
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
                onBootstrapFailure={onBootstrapFailure}
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
                onBootstrapFailure={onBootstrapFailure}
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
        // Gate preview with AppNotReadyPlaceholder until schema is ready
        if (!isSchemaReady) {
          return <AppNotReadyPlaceholder tabName="Preview" />;
        }
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
                onBootstrapFailure={onBootstrapFailure}
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
              onOpenGit={() => { setActiveActivityItem('git'); handleAddTool('git'); setTabletPanel('editor'); }}
              onOpenPackages={() => { setActiveActivityItem('packages'); handleAddTool('packages'); setTabletPanel('editor'); }}
              onOpenSecrets={() => { setActiveActivityItem('secrets'); handleAddTool('secrets'); setTabletPanel('editor'); }}
              onOpenDatabase={() => { setActiveActivityItem('database'); handleAddTool('database'); setTabletPanel('editor'); }}
              onOpenSettings={() => { setActiveActivityItem('settings'); handleAddTool('settings'); setTabletPanel('editor'); }}
              onOpenDebug={() => { setActiveActivityItem('debug'); handleAddTool('debugger'); setTabletPanel('editor'); }}
              onOpenCollaboration={() => { handleAddTool('collaboration'); setTabletPanel('editor'); }}
              onOpenWorkflows={() => { setActiveActivityItem('workflows'); handleAddTool('workflows'); setTabletPanel('editor'); }}
              onOpenHistory={() => { setActiveActivityItem('history'); handleAddTool('history'); setTabletPanel('editor'); }}
              onOpenCheckpoints={() => { handleAddTool('checkpoints'); setTabletPanel('editor'); }}
              onOpenExtensions={() => { setActiveActivityItem('extensions'); handleAddTool('extensions'); setTabletPanel('editor'); }}
              onOpenSecurity={() => { handleAddTool('security'); setTabletPanel('editor'); }}
              onOpenActions={() => { setLeftPanelTab('actions'); setTabletPanel('agent'); }}
              onOpenTools={() => { setLeftPanelTab('tools'); setTabletPanel('agent'); }}
              onOpenDeploy={() => { setLeftPanelTab('deployment'); setTabletPanel('agent'); }}
              onOpenCommandPalette={() => setShowCommandPalette(true)}
              onOpenGlobalSearch={() => { setIsSidebarCollapsed(false); setLeftPanelTab('agent'); setTabletPanel('agent'); }}
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
    // Use displayedTab to render content - this shows the OLD tab during fade-out
    const currentTab = tabs.find(t => t.id === displayedTab);
    
    if (!currentTab) {
      return <div className="flex items-center justify-center h-full text-muted-foreground">Select a tab</div>;
    }

    // Preview panel - gate with AppNotReadyPlaceholder until schema is ready
    if (currentTab.id === 'preview' || currentTab.id === 'webpreview') {
      if (!isSchemaReady) {
        return <AppNotReadyPlaceholder tabName="Preview" />;
      }
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" /></div>}>
          <ResponsiveWebPreview projectId={projectId} />
        </Suspense>
      );
    }

    // Console - Read-only runtime output (stdout, stderr, exit codes)
    if (currentTab.id === 'console') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Console..." /></div>}>
          <ReplitConsolePanel projectId={projectId} />
        </Suspense>
      );
    }

    // Shell - Interactive PTY terminal with multi-session support
    if (currentTab.id === 'shell') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Shell..." /></div>}>
          <ShellPanel projectId={projectId} />
        </Suspense>
      );
    }

    // File editor
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

    // Git panel - inline
    if (currentTab.id === 'git') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Git..." /></div>}>
          <ReplitGitPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Packages panel - inline
    if (currentTab.id === 'packages') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Packages..." /></div>}>
          <ReplitPackagesPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Secrets panel - inline
    if (currentTab.id === 'secrets' || currentTab.id === 'env' || currentTab.id === 'env-vars') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Secrets..." /></div>}>
          <ReplitSecretsPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Database panel - inline
    if (currentTab.id === 'database' || currentTab.id === 'database-browser') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Database..." /></div>}>
          <DatabasePanel projectId={projectId} />
        </Suspense>
      );
    }

    // Debug panel - inline
    if (currentTab.id === 'debugger' || currentTab.id === 'debug') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Debugger..." /></div>}>
          <ReplitDebuggerPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Settings panel - inline
    if (currentTab.id === 'settings') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Settings..." /></div>}>
          <ReplitSettingsPanel projectId={projectId} />
        </Suspense>
      );
    }

    // History panel - inline
    if (currentTab.id === 'history' || currentTab.id === 'rewind') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading History..." /></div>}>
          <ReplitHistoryPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Checkpoints panel - inline
    if (currentTab.id === 'checkpoints') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Checkpoints..." /></div>}>
          <UnifiedCheckpointsPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Workflows panel - inline
    if (currentTab.id === 'workflows') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Workflows..." /></div>}>
          <WorkflowsPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Extensions panel - inline
    if (currentTab.id === 'extensions') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Extensions..." /></div>}>
          <ExtensionsMarketplace />
        </Suspense>
      );
    }

    // Security panel - inline
    if (currentTab.id === 'security') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Security..." /></div>}>
          <MobileSecurityPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Collaboration panel - inline
    if (currentTab.id === 'collaboration' || currentTab.id === 'multiplayer') {
      return user ? (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Collaboration..." /></div>}>
          <CollaborationPanel
            projectId={parseInt(projectId, 10)}
            currentUser={user}
          />
        </Suspense>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">Please log in to access collaboration</div>
      );
    }

    // Global search - inline
    if (currentTab.id === 'search' || currentTab.id === 'global-search') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Search..." /></div>}>
          <GlobalSearch
            isOpen={true}
            onClose={() => {}}
            projectId={projectId}
            onFileSelect={(file) => handleFileSelect({ id: file.id, name: file.name })}
          />
        </Suspense>
      );
    }

    // Deployment panel - inline
    if (currentTab.id === 'deployment' || currentTab.id === 'deploy') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Deployment..." /></div>}>
          <ReplitDeploymentPanel projectId={projectId} />
        </Suspense>
      );
    }

    // Testing panel - inline
    if (currentTab.id === 'testing' || currentTab.id === 'test-runner') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Tests..." /></div>}>
          <div className="h-full overflow-auto p-4">
            <h2 className="text-[15px] font-semibold mb-4">Test Runner</h2>
            <p className="text-muted-foreground">Run and manage your tests here.</p>
          </div>
        </Suspense>
      );
    }

    // Problems panel - inline
    if (currentTab.id === 'problems') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Problems</h2>
          <p className="text-muted-foreground">View errors and warnings in your code.</p>
        </div>
      );
    }

    // Output panel - inline
    if (currentTab.id === 'output') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Output</h2>
          <p className="text-muted-foreground">View build and runtime output here.</p>
        </div>
      );
    }

    // Resources panel - inline
    if (currentTab.id === 'resources') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Resources</h2>
          <p className="text-muted-foreground">View CPU, memory, and storage usage.</p>
        </div>
      );
    }

    // Logs viewer - inline
    if (currentTab.id === 'logs') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Logs Viewer</h2>
          <p className="text-muted-foreground">View application logs here.</p>
        </div>
      );
    }

    // Visual editor - inline
    if (currentTab.id === 'visual-editor') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Visual Editor..." /></div>}>
          <VisualEditorPanel projectId={projectId} />
        </Suspense>
      );
    }

    // AI Assistant - inline (redirects to agent panel)
    if (currentTab.id === 'ai-assistant') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading AI Assistant..." /></div>}>
          <ReplitAgentPanelV3
            projectId={projectId}
            mode="desktop"
            agentToolsSettings={agentToolsSettings}
            onAgentToolsSettingsChange={setAgentToolsSettings}
          />
        </Suspense>
      );
    }

    // Progress panel - inline
    if (currentTab.id === 'progress') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Progress</h2>
          <p className="text-muted-foreground">View task progress and status.</p>
        </div>
      );
    }

    // Video replay - inline
    if (currentTab.id === 'video-replay') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Video Replay</h2>
          <p className="text-muted-foreground">Review recorded sessions.</p>
        </div>
      );
    }

    // Billing - inline
    if (currentTab.id === 'billing') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Billing</h2>
          <p className="text-muted-foreground">Manage your subscription and usage.</p>
        </div>
      );
    }

    // Import/Export - inline
    if (currentTab.id === 'import-export') {
      return (
        <div className="h-full overflow-auto p-4">
          <h2 className="text-[15px] font-semibold mb-4">Import / Export</h2>
          <p className="text-muted-foreground">Import or export project files.</p>
        </div>
      );
    }

    // Package viewer - inline
    if (currentTab.id === 'package-viewer') {
      return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Package Viewer..." /></div>}>
          <ReplitPackagesPanel projectId={projectId} />
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
        data-ide-layout="unified"
        data-layout-type="mobile"
      >
        {/* Replit-style Mobile Header */}
        <ReplitMobileHeader
          activeTab={mobileActiveTab}
          onBack={() => window.history.back()}
          onHistory={() => handleAddTool('history')}
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
            agentToolsSettings={mobileAgentHandlers?.agentToolsSettings}
            onAgentToolsSettingsChange={mobileAgentHandlers?.onAgentToolsSettingsChange}
            onAttach={() => mobileAgentHandlers?.onAttach?.()}
            onVoice={() => mobileAgentHandlers?.onVoice?.()}
            isRecording={mobileAgentHandlers?.isRecording}
            isUploadingFiles={mobileAgentHandlers?.isUploadingFiles}
            pendingAttachmentsCount={mobileAgentHandlers?.pendingAttachmentsCount}
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
        data-ide-layout="unified"
        data-layout-type="tablet"
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
            <h2 className="text-[13px] font-semibold">Files</h2>
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
              <span className="font-medium text-gray-900 dark:text-white text-[13px] capitalize">
                {mobileActiveTab}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleAddOpenTab('search')}
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
              agentToolsSettings={mobileAgentHandlers?.agentToolsSettings}
              onAgentToolsSettingsChange={mobileAgentHandlers?.onAgentToolsSettingsChange}
              onAttach={() => mobileAgentHandlers?.onAttach?.()}
              onVoice={() => mobileAgentHandlers?.onVoice?.()}
              isRecording={mobileAgentHandlers?.isRecording}
              isUploadingFiles={mobileAgentHandlers?.isUploadingFiles}
              pendingAttachmentsCount={mobileAgentHandlers?.pendingAttachmentsCount}
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
    <div className={cn("flex h-screen bg-[var(--ecode-background)] overflow-hidden", className)} data-testid="desktop-layout" data-ide-layout="unified" data-layout-type="desktop">
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
          showCollaboration={tabs.some(t => t.id === 'collaboration')}
          onToggleCollaboration={() => handleAddTool('collaboration')}
          collaboratorCount={0}
          onOpenDeployLogs={() => setDeploymentTab('logs')}
          onOpenDeployAnalytics={() => setDeploymentTab('analytics')}
          showTabs={false}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
          onOpenGlobalSearch={() => { setIsSidebarCollapsed(false); setLeftPanelTab('agent'); }}
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
              <div className="h-full flex flex-col border-r border-[var(--ecode-border)]">
                <Tabs value={leftPanelTab} onValueChange={setLeftPanelTab} className="h-full flex flex-col">
                  <TabsList className="w-full h-9 justify-start rounded-none border-b border-[var(--ecode-border)] bg-transparent p-0 px-1">
                    <TabsTrigger 
                      value="agent" 
                      className="gap-1.5 h-7 px-2.5 text-xs font-medium data-[state=active]:bg-[var(--ecode-surface)] data-[state=active]:shadow-none rounded-md" 
                      data-testid="tab-agent"
                    >
                      <Brain className="h-3.5 w-3.5" />
                      Agent
                    </TabsTrigger>
                    <TabsTrigger 
                      value="actions" 
                      className="gap-1.5 h-7 px-2.5 text-xs font-medium data-[state=active]:bg-[var(--ecode-surface)] data-[state=active]:shadow-none rounded-md" 
                      data-testid="tab-actions"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Actions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="tools" 
                      className="gap-1.5 h-7 px-2.5 text-xs font-medium data-[state=active]:bg-[var(--ecode-surface)] data-[state=active]:shadow-none rounded-md" 
                      data-testid="tab-tools"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Tools
                    </TabsTrigger>
                    <TabsTrigger 
                      value="deployment" 
                      className="gap-1.5 h-7 px-2.5 text-xs font-medium data-[state=active]:bg-[var(--ecode-surface)] data-[state=active]:shadow-none rounded-md" 
                      data-testid="tab-deployment"
                      onClick={() => setDeploymentTab('deploy')}
                    >
                      <Rocket className="h-3.5 w-3.5" />
                      Deploy
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="agent" className="flex-1 mt-0 overflow-hidden" forceMount>
                    <ReplitAgentPanelV3
                      key={`agent-${projectId}`}
                      projectId={projectId}
                      mode="desktop"
                      agentToolsSettings={agentToolsSettings}
                      onAgentToolsSettingsChange={setAgentToolsSettings}
                      isBootstrapping={!!bootstrapToken}
                      bootstrapToken={bootstrapToken}
                      onBootstrapFailure={onBootstrapFailure}
                    />
                  </TabsContent>
                  
                  <TabsContent value="actions" className="flex-1 mt-0 overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="sm" text="Loading Actions..." /></div>}>
                      <AgentActionsPanel projectId={projectId} />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="tools" className="flex-1 mt-0 overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="sm" text="Loading Tools..." /></div>}>
                      <ToolsPanel
                        availableTools={availableTools}
                        onSelectTool={handleAddTool}
                        activeTabs={tabs.map(t => t.id)}
                      />
                    </Suspense>
                  </TabsContent>
                  
                  <TabsContent value="deployment" className="flex-1 mt-0 overflow-hidden">
                    <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="sm" text="Loading Deploy..." /></div>}>
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
              <div 
                className={cn(
                  "h-full w-full transition-opacity duration-100 ease-in-out",
                  tabContentVisible ? "opacity-100" : "opacity-0"
                )}
                data-testid="tab-content-wrapper"
              >
                {renderDesktopContent()}
              </div>
            </div>
          </ResizablePanel>
          
          {showFileExplorer && (
            <>
              <ResizableHandle withHandle />
              
              <ResizablePanel defaultSize={18} minSize={15} maxSize={30} data-testid="desktop-right-panel">
                <div className="h-full flex flex-col border-l border-[var(--ecode-border)]">
                  <div className="h-9 border-b border-[var(--ecode-border)] flex items-center justify-between px-2.5">
                    <h3 className="font-medium text-xs text-[var(--ecode-text-muted)]">Files</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFileExplorer(false)}
                      className="h-6 w-6 p-0 text-[var(--ecode-text-muted)] hover:text-[var(--ecode-text)] hover:bg-[var(--ecode-sidebar-hover)]"
                    >
                      <X className="h-3.5 w-3.5" />
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

      {/* Autonomous Workspace Viewer - Shows bootstrap progress as dialog (only when inline mode is disabled) */}
      {/* When inline mode is enabled (default), progress appears in the agent chat instead */}
      {bootstrapToken && !autonomousBuildStore.inlineMode && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="workspace-viewer-loading">
            <div className="text-center space-y-4">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[13px] text-muted-foreground">Loading workspace viewer...</p>
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
