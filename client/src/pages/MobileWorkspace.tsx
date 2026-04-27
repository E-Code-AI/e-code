import { AgentPanelErrorBoundary } from '@/components/ai/AgentPanelErrorBoundary';
import { ReplitAgentPanelV3 } from '@/components/ai/ReplitAgentPanelV3';
import { AppStoragePanel } from '@/components/editor/AppStoragePanel';
import { ReplitGitPanel } from '@/components/editor/ReplitGitPanel';
import { ReplitAuthPanel } from '@/components/ide/ReplitAuthPanel';
import { ReplitConsolePanel } from '@/components/ide/ReplitConsolePanel';
import IntegrationsPanel from '@/components/IntegrationsPanel';
import { AppNotReadyPlaceholder } from '@/components/mobile/AppNotReadyPlaceholder';
import { LazyMobileCodeEditor } from '@/components/mobile/LazyMobileCodeEditor';
import { MobileCollaborationPanel } from '@/components/mobile/MobileCollaborationPanel';
import { MobileDatabasePanel } from '@/components/mobile/MobileDatabasePanel';
import { MobileDebugPanel } from '@/components/mobile/MobileDebugPanel';
import { MobileDeployPanel } from '@/components/mobile/MobileDeployPanel';
import { MobileFileExplorer } from '@/components/mobile/MobileFileExplorer';
import { MobilePreviewPanel } from '@/components/mobile/MobilePreviewPanel';
import { MobileProjectsPanel } from '@/components/mobile/MobileProjectsPanel';
import { ReplitBottomTabs } from '@/components/mobile/ReplitBottomTabs';
import { ReplitToolsSheet } from '@/components/mobile/ReplitToolsSheet';
import { Button } from '@/components/ui/button';
import {
Sheet,
SheetContent,
SheetHeader,
SheetTitle,
} from '@/components/ui/sheet';
import { apiRequest } from '@/lib/queryClient';
import { initializeNativeMobileRuntime } from '@/lib/mobile-native';
import { offlineStorage } from '@/lib/offline-storage';
import { offlineSyncService } from '@/lib/offline-sync';
import { cn } from '@/lib/utils';
import { useSchemaWarmingStore } from '@/stores/schemaWarmingStore';
import { instrumentedLazy } from '@/utils/instrumented-lazy';
import {
ArrowLeft,
FolderOpen,
Loader2,
MessageSquarePlus,
MoreVertical,
RefreshCw
} from 'lucide-react';
import { Suspense,useCallback,useEffect,useMemo,useRef,useState, type TouchEvent } from 'react';
import { useLocation,useParams } from 'wouter';

const MobileTerminal = instrumentedLazy(() => 
  import('@/components/mobile/MobileTerminal').then(module => ({ default: module.MobileTerminal })),
  'MobileTerminal'
);
const ReplitSettingsPanel = instrumentedLazy(() => import('@/components/editor/ReplitSettingsPanel').then(mod => ({ default: mod.ReplitSettingsPanel })), 'ReplitSettingsPanel');

const TerminalFallback = () => (
  <div className="h-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-[11px] text-muted-foreground">Loading terminal...</p>
    </div>
  </div>
);

type MobileTab = 'projects' | 'agent' | 'files' | 'code' | 'terminal' | 'preview' | 'deploy' | 'settings' | 'more';
type MobileFormFactor = 'phone-portrait' | 'phone-landscape' | 'tablet';

function getMobileFormFactor(): MobileFormFactor {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width >= 768) return 'tablet';
  return width > height ? 'phone-landscape' : 'phone-portrait';
}

export default function MobileWorkspace() {
  const params = useParams();
  const projectId = (params.projectId || params.id) as string;
  const [, navigate] = useLocation();
  const bootstrapToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('bootstrap');
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Project ID required. Navigate from dashboard.</p>
      </div>
    );
  }

  const [formFactor, setFormFactor] = useState<MobileFormFactor>(() => getMobileFormFactor());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [activeTab, setActiveTab] = useState<MobileTab>('agent');
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [lastWorkspaceTab, setLastWorkspaceTab] = useState<'agent' | 'code' | 'terminal' | 'deploy'>('agent');
  const touchStartRef = useRef<{ x: number; y: number; at: number } | null>(null);

  // Split-view: agent chat visible with floating preview overlay
  const [previewOverlay, setPreviewOverlay] = useState(false);
  const isSchemaReady = useSchemaWarmingStore((s) => s.isReady);

  useEffect(() => {
    if (!bootstrapToken || !projectId || isSchemaReady) return;
    const store = useSchemaWarmingStore.getState();
    if (store.eventSource && store.projectId === projectId) return;
    store.subscribeToStream(projectId);
  }, [bootstrapToken, projectId, isSchemaReady]);

  useEffect(() => {
    initializeNativeMobileRuntime().catch(() => {});

    const refreshSyncStatus = async () => {
      const status = await offlineSyncService.getSyncStatus();
      setPendingSyncCount(status.pendingOperations);
      setIsOnline(status.online);
    };

    const handleResize = () => setFormFactor(getMobileFormFactor());
    const handleOnline = () => {
      setIsOnline(true);
      offlineSyncService.forceSyncNow().finally(refreshSyncStatus);
    };
    const handleOffline = () => setIsOnline(false);
    const handleSyncCompleted = () => refreshSyncStatus();
    const handleDeepLink = (event: Event) => {
      const url = (event as CustomEvent<{ url: string }>).detail?.url;
      const match = url?.match(/ecode:\/\/open\/([^/?#]+)/);
      if (match?.[1]) navigate(`/mobile-workspace/${encodeURIComponent(match[1])}`);
    };

    refreshSyncStatus();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-completed', handleSyncCompleted);
    window.addEventListener('ecode:mobile-deep-link', handleDeepLink);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-completed', handleSyncCompleted);
      window.removeEventListener('ecode:mobile-deep-link', handleDeepLink);
    };
  }, [navigate]);

  useEffect(() => {
    offlineStorage.saveProject({
      id: Number(projectId) || Date.now(),
      name: `Project ${projectId}`,
      description: 'Recent mobile project',
      lastModified: Date.now(),
      syncStatus: 'synced',
    }).catch(() => {});
  }, [projectId]);

  const handleTabChange = useCallback((tabId: MobileTab) => {
    if (tabId === 'projects') {
      setPreviewOverlay(false);
      setActiveTab('projects');
      setActiveTool(null);
      return;
    }
    if (tabId === 'settings') {
      setPreviewOverlay(false);
      setActiveTab('settings');
      setActiveTool(null);
      return;
    }
    if (tabId === 'files') {
      setPreviewOverlay(false);
      setActiveTab('files');
      setActiveTool(null);
      setIsFilesOpen(true);
    } else if (tabId === 'more') {
      setPreviewOverlay(false);
      setActiveTab(tabId);
      setActiveTool(null);
      setToolsSheetOpen(true);
    } else {
      // If switching away from preview tab, also close overlay
      if (tabId !== 'preview') setPreviewOverlay(false);
      if (tabId === 'agent' || tabId === 'code' || tabId === 'terminal' || tabId === 'deploy') {
        setLastWorkspaceTab(tabId);
      }
      setActiveTab(tabId);
      setActiveTool(null);
    }
  }, []);

  const handleToolSelect = (toolId: string) => {
    if (toolId === 'files') {
      setToolsSheetOpen(false);
      setActiveTool(null);
      setActiveTab('files');
      setIsFilesOpen(true);
      return;
    }
    if (toolId === 'agent' || toolId === 'assistant') {
      setToolsSheetOpen(false);
      setActiveTool(null);
      setActiveTab('agent');
      return;
    }
    if (toolId === 'preview') {
      setToolsSheetOpen(false);
      setActiveTool(null);
      setActiveTab('preview');
      return;
    }
    setActiveTool(toolId);
    setToolsSheetOpen(false);
  };

  const handleFileSelect = useCallback((file: any) => {
    setSelectedFileId(file.id);
    setIsFilesOpen(false);
    setLastWorkspaceTab('code');
    setActiveTab('code');
  }, []);

  const handleOpenProject = useCallback((nextProjectId: string | number) => {
    navigate(`/mobile-workspace/${encodeURIComponent(String(nextProjectId))}`);
  }, [navigate]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, at: Date.now() };
  }, []);

  const workspaceTabs = useMemo<MobileTab[]>(() => ['projects', 'code', 'agent', 'terminal', 'settings'], []);

  const handleTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) || Date.now() - start.at > 650) return;
    const currentIndex = workspaceTabs.indexOf(activeTab);
    if (currentIndex === -1) return;
    const nextIndex = dx < 0 ? Math.min(workspaceTabs.length - 1, currentIndex + 1) : Math.max(0, currentIndex - 1);
    handleTabChange(workspaceTabs[nextIndex]);
  }, [activeTab, handleTabChange, workspaceTabs]);

  // Layers icon in preview panel → switch to agent with floating preview overlay
  const handleEnterOverlayMode = () => {
    setPreviewOverlay(true);
    setActiveTab('agent');
  };

  // Close the preview tab → go back to agent
  const handleClosePreview = () => {
    setPreviewOverlay(false);
    setActiveTab(lastWorkspaceTab);
  };

  const isPreviewTab = activeTab === 'preview';

  const getBootstrapPlaceholderName = (tabId?: string | null): string | null => {
    if (!tabId || !bootstrapToken || isSchemaReady) return null;

    const normalizedTabId = tabId.toLowerCase();
    if (normalizedTabId === 'preview') return 'Preview';
    return null;
  };

  const renderBootstrapPlaceholder = (tabId?: string | null) => {
    const placeholderName = getBootstrapPlaceholderName(tabId);
    if (!placeholderName) return null;
    return <AppNotReadyPlaceholder tabName={placeholderName} projectId={projectId} />;
  };

  // Tab title shown in header center
  const tabTitle: Record<MobileTab, string> = {
    projects: 'Projects',
    agent: 'Agent',
    files: 'Files',
    code: 'Code',
    terminal: 'Shell',
    preview: 'Preview',
    deploy: 'Deploy',
    settings: 'Settings',
    more: 'Tools',
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <MobileProjectsPanel
            activeProjectId={projectId}
            onOpenProject={handleOpenProject}
            className="h-full"
          />
        );

      case 'agent':
      case 'more':
        return (
          <div className="flex-1 flex flex-col bg-background pb-16">
            <AgentPanelErrorBoundary>
              <ReplitAgentPanelV3 
                projectId={projectId}
                className="h-full"
              />
            </AgentPanelErrorBoundary>
          </div>
        );

      case 'files':
        return <div className="flex-1 bg-background" />;

      case 'code':
        if (renderBootstrapPlaceholder('code')) return renderBootstrapPlaceholder('code');
        return (
          <LazyMobileCodeEditor 
            fileId={selectedFileId}
            projectId={projectId}
            onSave={async (content: string) => {
              if (!selectedFileId) return;
              if (!navigator.onLine) {
                await offlineStorage.addPendingOperation({
                  type: 'update',
                  resourceType: 'file',
                  resourceId: selectedFileId,
                  data: { content },
                });
                setPendingSyncCount((count) => count + 1);
                return;
              }
              await apiRequest('PUT', `/api/projects/${projectId}/files/${selectedFileId}`, { content });
            }}
            className="h-full"
          />
        );

      case 'terminal':
        if (renderBootstrapPlaceholder('terminal')) return renderBootstrapPlaceholder('terminal');
        return (
          <Suspense fallback={<TerminalFallback />}>
            <MobileTerminal 
              projectId={projectId}
              sessionId={`mobile-${projectId}`}
              className="h-full"
            />
          </Suspense>
        );

      case 'deploy':
        if (renderBootstrapPlaceholder('deploy')) return renderBootstrapPlaceholder('deploy');
        return (
          <MobileDeployPanel
            projectId={projectId}
            className="h-full"
          />
        );

      case 'settings':
        return (
          <ReplitSettingsPanel
            projectId={projectId}
          />
        );

      case 'preview':
        if (renderBootstrapPlaceholder('preview')) return renderBootstrapPlaceholder('preview');
        return (
          <MobilePreviewPanel 
            projectId={projectId}
            className="h-full"
            onClose={handleClosePreview}
            onOverlayMode={handleEnterOverlayMode}
          />
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-[13px] text-muted-foreground">Tab: {activeTab}</p>
          </div>
        );
    }
  };

  const renderSecondaryPanel = () => {
    if (activeTab === 'terminal') return renderTabContent();
    if (activeTab === 'settings') return renderTabContent();
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-11 items-center justify-between border-b px-3">
          <span className="text-[13px] font-medium">AI / Preview</span>
          <Button size="sm" variant="ghost" onClick={() => setActiveTab('preview')}>Preview</Button>
        </div>
        <div className="min-h-0 flex-1">
          {activeTab === 'preview' ? renderTabContent() : (
            <AgentPanelErrorBoundary>
              <ReplitAgentPanelV3 projectId={projectId} className="h-full" mode={formFactor === 'tablet' ? 'tablet' : 'mobile'} />
            </AgentPanelErrorBoundary>
          )}
        </div>
      </div>
    );
  };

  const renderAdaptiveWorkspace = () => {
    if (formFactor === 'phone-portrait') return renderTabContent();

    if (formFactor === 'phone-landscape') {
      return (
        <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0 border-r">{activeTab === 'projects' ? renderTabContent() : (
            <LazyMobileCodeEditor
              fileId={selectedFileId}
              projectId={projectId}
              onSave={async (content: string) => {
                if (!selectedFileId) return;
                if (!navigator.onLine) {
                  await offlineStorage.addPendingOperation({
                    type: 'update',
                    resourceType: 'file',
                    resourceId: selectedFileId,
                    data: { content },
                  });
                  return;
                }
                await apiRequest('PUT', `/api/projects/${projectId}/files/${selectedFileId}`, { content });
              }}
              className="h-full"
            />
          )}</div>
          <div className="min-w-0">{renderSecondaryPanel()}</div>
        </div>
      );
    }

    return (
      <div className="grid h-full min-h-0 grid-cols-[72px_minmax(220px,280px)_minmax(0,1fr)_minmax(320px,0.42fr)] bg-background">
        <nav className="flex flex-col items-center gap-2 border-r py-3" data-testid="tablet-activity-bar">
          {workspaceTabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'secondary' : 'ghost'}
              size="icon"
              className="h-11 w-11"
              onClick={() => handleTabChange(tab)}
              data-testid={`tablet-tab-${tab}`}
            >
              <span className="sr-only">{tabTitle[tab]}</span>
              {tab === 'projects' && <FolderOpen className="h-5 w-5" />}
              {tab === 'code' && <span className="font-mono text-[13px]">{"</>"}</span>}
              {tab === 'agent' && <MessageSquarePlus className="h-5 w-5" />}
              {tab === 'terminal' && <span className="font-mono text-[13px]">$</span>}
              {tab === 'settings' && <MoreVertical className="h-5 w-5" />}
            </Button>
          ))}
        </nav>
        <aside className="min-w-0 border-r">
          <MobileProjectsPanel activeProjectId={projectId} onOpenProject={handleOpenProject} className="h-full" />
        </aside>
        <main className="min-w-0">
          {activeTab === 'projects' ? (
            <MobileFileExplorer
              isOpen={true}
              onClose={() => {}}
              projectId={projectId}
              onFileSelect={handleFileSelect}
              currentFileId={selectedFileId}
            />
          ) : (
            <LazyMobileCodeEditor
              fileId={selectedFileId}
              projectId={projectId}
              onSave={async (content: string) => {
                if (!selectedFileId) return;
                await apiRequest('PUT', `/api/projects/${projectId}/files/${selectedFileId}`, { content });
              }}
              className="h-full"
            />
          )}
        </main>
        <aside className="min-w-0 border-l">{renderSecondaryPanel()}</aside>
      </div>
    );
  };

  return (
    <div
      className="h-screen flex flex-col bg-background"
      data-mobile-form-factor={formFactor}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* ── Top Navigation Bar ── hidden when in full preview tab (preview has its own header) */}
      {!isPreviewTab && (
        <header className="flex items-center justify-between h-14 px-4 border-b bg-background flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>

          {/* Center: active tab name */}
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-foreground">
              {tabTitle[activeTab]}
            </span>
            {pendingSyncCount > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">
                {pendingSyncCount} queued
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              data-testid="button-new-chat"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              data-testid="button-more"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {/* ── Tab Content ── */}
      <div className={cn('mobile-panel-density flex-1 flex flex-col overflow-hidden relative', isPreviewTab && 'pb-16')}>
        {renderAdaptiveWorkspace()}

        {/* ── Floating Preview Overlay (split-view mode) ── */}
        {previewOverlay && (
          <div
            className="absolute bottom-20 right-3 w-[48%] h-[45%] rounded-2xl shadow-2xl border border-border overflow-hidden z-50 bg-background"
            data-testid="mobile-preview-overlay-card"
          >
            <MobilePreviewPanel
              projectId={projectId}
              isOverlay={true}
              onClose={() => setPreviewOverlay(false)}
            />
          </div>
        )}
      </div>

      {/* ── Bottom Tab Navigation ── always visible */}
      <ReplitBottomTabs
        activeTab={activeTab}
        onTabChange={(tab) => handleTabChange(tab as MobileTab)}
        isConnected={isOnline}
      />

      {/* File Explorer Modal */}
      <MobileFileExplorer 
        isOpen={isFilesOpen}
        onClose={() => {
          setIsFilesOpen(false);
          if (activeTab === 'files') {
            setActiveTab(lastWorkspaceTab);
          }
        }}
        projectId={projectId}
        onFileSelect={handleFileSelect}
        currentFileId={selectedFileId}
      />

      {/* Tools Sheet */}
      <ReplitToolsSheet
        open={toolsSheetOpen}
        onOpenChange={setToolsSheetOpen}
        onToolSelect={handleToolSelect}
      />

      {/* Tool Panels */}
      <Sheet open={!!activeTool} onOpenChange={(open) => !open && setActiveTool(null)}>
        <SheetContent side="bottom" className="mobile-panel-density h-[90vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="capitalize">{activeTool}</SheetTitle>
          </SheetHeader>
          {activeTool === 'database' && (renderBootstrapPlaceholder('database') || <MobileDatabasePanel projectId={projectId} />)}
          {activeTool === 'auth' && (renderBootstrapPlaceholder('auth') || <ReplitAuthPanel projectId={projectId} />)}
          {activeTool === 'integrations' && (renderBootstrapPlaceholder('integrations') || <IntegrationsPanel projectId={projectId} onClose={() => setActiveTool(null)} />)}
          {activeTool === 'git' && (renderBootstrapPlaceholder('git') || <ReplitGitPanel projectId={projectId} className="h-full" mode="mobile" />)}
          {activeTool === 'developer' && (renderBootstrapPlaceholder('developer') || <MobileDebugPanel projectId={projectId} />)}
          {activeTool === 'app-storage' && (renderBootstrapPlaceholder('app-storage') || <AppStoragePanel projectId={projectId} className="h-full" />)}
          {activeTool === 'console' && (renderBootstrapPlaceholder('console') || <ReplitConsolePanel projectId={projectId} isRunning={false} />)}
          {activeTool === 'publishing' && (renderBootstrapPlaceholder('publishing') || <MobileDeployPanel projectId={projectId} className="h-full" />)}
          {activeTool === 'multiplayer' && (
            <MobileCollaborationPanel
              projectId={Number(projectId)}
              projectName={`Project ${projectId}`}
              isOpen={true}
              onClose={() => setActiveTool(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
