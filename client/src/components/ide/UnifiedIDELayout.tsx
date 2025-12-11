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

import { useState, useCallback, Suspense, lazy, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
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
import { ReplitBottomTabs } from '@/components/mobile/ReplitBottomTabs';

const ReplitMonacoEditor = lazy(() => import('@/components/editor/ReplitMonacoEditor').then(mod => ({ default: mod.ReplitMonacoEditor })));
const ReplitTerminalPanel = lazy(() => import('@/components/editor/ReplitTerminalPanel').then(mod => ({ default: mod.ReplitTerminalPanel })));
const ReplitDeploymentPanel = lazy(() => import('@/components/ide/ReplitDeploymentPanel').then(mod => ({ default: mod.ReplitDeploymentPanel })));
const ReplitAgentPanelV3 = lazy(() => import('@/components/ai/ReplitAgentPanelV3').then(mod => ({ default: mod.ReplitAgentPanelV3 })));
const ResponsiveWebPreview = lazy(() => import('@/components/editor/ResponsiveWebPreview').then(mod => ({ default: mod.ResponsiveWebPreview })));
const AgentActionsPanel = lazy(() => import('@/components/ide/AgentActionsPanel').then(mod => ({ default: mod.AgentActionsPanel })));
const ToolsPanel = lazy(() => import('@/components/ide/ToolsPanel').then(mod => ({ default: mod.ToolsPanel })));

const EnhancedMobileFileExplorer = lazy(() => import('@/components/mobile/EnhancedMobileFileExplorer').then(mod => ({ default: mod.EnhancedMobileFileExplorer })));
const LazyMobileCodeEditor = lazy(() => import('@/components/mobile/LazyMobileCodeEditor').then(mod => ({ default: mod.LazyMobileCodeEditor })));
const EnhancedMobileTerminal = lazy(() => import('@/components/mobile/EnhancedMobileTerminal').then(mod => ({ default: mod.EnhancedMobileTerminal })));
const MobilePreviewPanel = lazy(() => import('@/components/mobile/MobilePreviewPanel').then(mod => ({ default: mod.MobilePreviewPanel })));
const MobileMoreMenu = lazy(() => import('@/components/mobile/MobileMoreMenu').then(mod => ({ default: mod.MobileMoreMenu })));

const CommandPalette = lazy(() => import('@/components/CommandPalette').then(mod => ({ default: mod.CommandPalette })));
const GlobalSearch = lazy(() => import('@/components/GlobalSearch').then(mod => ({ default: mod.GlobalSearch })));
const CollaborationPanel = lazy(() => import('@/components/CollaborationPanel').then(mod => ({ default: mod.CollaborationPanel })));
const ReplitDB = lazy(() => import('@/components/ReplitDB').then(mod => ({ default: mod.ReplitDB })));
const AutonomousWorkspaceViewer = lazy(() => import('@/components/ide/AutonomousWorkspaceViewer').then(mod => ({ default: mod.AutonomousWorkspaceViewer })));

const ReplitGitPanel = lazy(() => import('@/components/editor/ReplitGitPanel').then(mod => ({ default: mod.ReplitGitPanel })));
const ReplitPackagesPanel = lazy(() => import('@/components/editor/ReplitPackagesPanel').then(mod => ({ default: mod.ReplitPackagesPanel })));
const ReplitDebuggerPanel = lazy(() => import('@/components/editor/ReplitDebuggerPanel').then(mod => ({ default: mod.ReplitDebuggerPanel })));
const ReplitSecretsPanel = lazy(() => import('@/components/editor/ReplitSecretsPanel').then(mod => ({ default: mod.ReplitSecretsPanel })));
const ReplitHistoryPanel = lazy(() => import('@/components/editor/ReplitHistoryPanel').then(mod => ({ default: mod.ReplitHistoryPanel })));
const ReplitSettingsPanel = lazy(() => import('@/components/editor/ReplitSettingsPanel').then(mod => ({ default: mod.ReplitSettingsPanel })));
const WorkflowsPanel = lazy(() => import('@/components/ide/WorkflowsPanel').then(mod => ({ default: mod.WorkflowsPanel })));
const ExtensionsMarketplace = lazy(() => import('@/components/ExtensionsMarketplace').then(mod => ({ default: mod.ExtensionsMarketplace })));

import { ShortcutHint, ShortcutTester } from '@/components/utilities';

interface UnifiedIDELayoutProps {
  projectId: string;
  className?: string;
  bootstrapToken?: string | null;
  onWorkspaceComplete?: () => void;
  onWorkspaceError?: (error: string) => void;
}

type MobileTab = 'agent' | 'files' | 'console' | 'preview' | 'more';
type TabletPanel = 'editor' | 'terminal' | 'preview' | 'agent';

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;

const mobileTabOrder: MobileTab[] = ['agent', 'files', 'console', 'preview', 'more'];

function UnifiedIDELayout({ 
  projectId, 
  className,
  bootstrapToken,
  onWorkspaceComplete,
  onWorkspaceError,
}: UnifiedIDELayoutProps) {
  const deviceType = useDeviceType();
  const { toast } = useToast();
  const isConnected = useConnectionStatus();
  const { errorsCount } = useProblemsCount(projectId);
  
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
  const [showExtensionsPanel, setShowExtensionsPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const closePanel = useCallback((setter: (v: boolean) => void) => {
    setter(false);
    setActiveActivityItem('files');
  }, [setActiveActivityItem]);
  
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

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

  const handleMobileSwipe = useCallback((info: PanInfo) => {
    const { offset, velocity } = info;
    const isSwipeLeft = offset.x < -SWIPE_THRESHOLD && velocity.x < -SWIPE_VELOCITY_THRESHOLD;
    const isSwipeRight = offset.x > SWIPE_THRESHOLD && velocity.x > SWIPE_VELOCITY_THRESHOLD;
    
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
  }, [mobileActiveTab]);

  const handleTabletTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const handleTabletTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX.current;
    
    if (!tabletDrawerOpen && touchStartX.current < 20 && swipeDistance > 80) {
      setTabletDrawerOpen(true);
      if ('vibrate' in navigator) navigator.vibrate(10);
    } else if (tabletDrawerOpen && swipeDistance < -80) {
      setTabletDrawerOpen(false);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };

  const deploymentStatus = publishState?.status === 'live' ? 'live' 
    : publishState?.status === 'publishing' ? 'deploying' 
    : publishState?.status === 'failed' ? 'failed' 
    : 'idle';

  if (isLoadingProject) {
    return <ECodeLoading fullScreen size="lg" text="Loading workspace..." />;
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Project not found</h2>
        </div>
      </div>
    );
  }

  const renderMobileContent = () => {
    switch (mobileActiveTab) {
      case 'agent':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Agent..." /></div>}>
            <ReplitAgentPanelV3
              projectId={projectId}
              mode="mobile"
              agentToolsSettings={agentToolsSettings}
              onAgentToolsSettingsChange={setAgentToolsSettings}
            />
          </Suspense>
        );
      case 'files':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Files..." /></div>}>
            <EnhancedMobileFileExplorer
              projectId={projectId}
              isOpen={true}
              onClose={() => setMobileActiveTab('agent')}
              onFileSelect={(file) => {
                setSelectedFileId(file.id);
                setMobileActiveTab('console');
              }}
            />
          </Suspense>
        );
      case 'console':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Editor..." /></div>}>
            <div className="h-full flex flex-col">
              <div className="flex-1">
                <LazyMobileCodeEditor
                  projectId={projectId}
                  fileId={selectedFileId}
                  className="h-full"
                />
              </div>
              <div className="h-1/3 border-t">
                <EnhancedMobileTerminal projectId={projectId} />
              </div>
            </div>
          </Suspense>
        );
      case 'preview':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading Preview..." /></div>}>
            <MobilePreviewPanel projectId={projectId} />
          </Suspense>
        );
      case 'more':
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full"><ECodeLoading size="md" text="Loading..." /></div>}>
            <MobileMoreMenu 
              projectId={projectId}
              isOpen={true}
              onClose={() => setMobileActiveTab('agent')}
              onOpenFiles={() => setMobileActiveTab('files')}
              onOpenGit={() => setShowGitPanel(true)}
              onOpenPackages={() => setShowPackagesPanel(true)}
              onOpenSecrets={() => setShowSecretsPanel(true)}
              onOpenDatabase={() => setShowReplitDB(true)}
              onOpenSettings={() => setShowSettingsPanel(true)}
              onOpenDebug={() => setShowDebugPanel(true)}
              onOpenCollaboration={() => setShowCollaboration(true)}
            />
          </Suspense>
        );
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
            <ReplitAgentPanelV3
              projectId={projectId}
              mode="tablet"
              agentToolsSettings={agentToolsSettings}
              onAgentToolsSettingsChange={setAgentToolsSettings}
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
        <motion.div 
          className="flex-1 overflow-hidden"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={(_, info) => handleMobileSwipe(info)}
          data-testid="mobile-swipe-area"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileActiveTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderMobileContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <ReplitBottomTabs
          activeTab={mobileActiveTab}
          onTabChange={(tab) => setMobileActiveTab(tab as MobileTab)}
          badgeCounts={{
            git: gitChangesCount,
            errors: errorsCount,
          }}
          isConnected={isConnected}
        />
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
        onTouchStart={handleTabletTouchStart}
        onTouchEnd={handleTabletTouchEnd}
      >
        <AnimatePresence>
          {tabletDrawerOpen && (
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-40 h-full bg-background border-r border-border shadow-xl w-[280px]"
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
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {tabletDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
            onClick={() => setTabletDrawerOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 h-14 px-4 border-b border-border bg-background/95 backdrop-blur">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTabletDrawerOpen(!tabletDrawerOpen)}
              className="h-10 w-10 touch-manipulation"
            >
              {tabletDrawerOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <Code className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium truncate">
                {selectedFileId ? `File ${selectedFileId}` : 'No file selected'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border bg-background/95 backdrop-blur p-1" data-testid="tablet-panel-tabs">
            {(['editor', 'preview', 'terminal', 'agent'] as TabletPanel[]).map((panel) => (
              <Button
                key={panel}
                variant={tabletPanel === panel ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTabletPanel(panel)}
                className="flex-1 h-10 touch-manipulation"
                data-testid={`tablet-tab-${panel}`}
              >
                {panel === 'editor' && <Code className="h-4 w-4 mr-1" />}
                {panel === 'preview' && <Monitor className="h-4 w-4 mr-1" />}
                {panel === 'terminal' && <Terminal className="h-4 w-4 mr-1" />}
                {panel === 'agent' && <Bot className="h-4 w-4 mr-1" />}
                <span className="text-xs capitalize">{panel}</span>
              </Button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {renderTabletContent()}
          </div>

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
          />
        </div>
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
          setShowToolsSheet(false);
        }}
      />
      
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-xl border-l bg-background">
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

      {showExtensionsPanel && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-50 shadow-xl border-l bg-background">
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
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] z-50 shadow-xl border-l bg-background">
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

      <Suspense fallback={null}>
        <AutonomousWorkspaceViewer
          bootstrapToken={bootstrapToken ?? null}
          projectId={projectId}
          onComplete={onWorkspaceComplete}
          onError={onWorkspaceError}
        />
      </Suspense>

      {enableShortcutHint && <ShortcutHint />}
      {enableShortcutTester && <ShortcutTester />}
    </div>
  );
}

export default UnifiedIDELayout;
