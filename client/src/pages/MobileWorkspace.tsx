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
import { cn } from '@/lib/utils';
import { useSchemaWarmingStore } from '@/stores/schemaWarmingStore';
import { instrumentedLazy } from '@/utils/instrumented-lazy';
import {
ArrowLeft,
Loader2,
MessageSquarePlus,
MoreVertical,
RefreshCw
} from 'lucide-react';
import { Suspense,useState } from 'react';
import { useParams } from 'wouter';

const MobileTerminal = instrumentedLazy(() => 
  import('@/components/mobile/MobileTerminal').then(module => ({ default: module.MobileTerminal })),
  'MobileTerminal'
);

const TerminalFallback = () => (
  <div className="h-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-[11px] text-muted-foreground">Loading terminal...</p>
    </div>
  </div>
);

type MobileTab = 'agent' | 'files' | 'code' | 'terminal' | 'preview' | 'deploy' | 'more';

export default function MobileWorkspace() {
  const params = useParams();
  const projectId = (params.projectId || params.id) as string;

  if (!projectId) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Project ID required. Navigate from dashboard.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<MobileTab>('agent');
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [lastWorkspaceTab, setLastWorkspaceTab] = useState<'agent' | 'code' | 'terminal' | 'deploy'>('agent');

  // Split-view: agent chat visible with floating preview overlay
  const [previewOverlay, setPreviewOverlay] = useState(false);
  const isSchemaReady = useSchemaWarmingStore((s) => s.isReady);

  const handleTabChange = (tabId: MobileTab) => {
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
  };

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

  const handleFileSelect = (file: any) => {
    setSelectedFileId(file.id);
    setIsFilesOpen(false);
    setLastWorkspaceTab('code');
    setActiveTab('code');
  };

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
    if (!tabId || isSchemaReady) return null;

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
    agent: 'Agent',
    files: 'Files',
    code: 'Code',
    terminal: 'Shell',
    preview: 'Preview',
    deploy: 'Deploy',
    more: 'Tools',
  };

  const renderTabContent = () => {
    switch (activeTab) {
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

  return (
    <div className="h-screen flex flex-col bg-background md:hidden">

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
        {renderTabContent()}

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
