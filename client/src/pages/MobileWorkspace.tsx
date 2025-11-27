import { useState } from 'react';
import { useParams } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { ReplitBottomTabs } from '@/components/mobile/ReplitBottomTabs';
import { ReplitToolsSheet } from '@/components/mobile/ReplitToolsSheet';
import { MobileFileExplorer } from '@/components/mobile/MobileFileExplorer';
import { LazyMobileCodeEditor } from '@/components/mobile/LazyMobileCodeEditor';
import { MobileTerminal } from '@/components/mobile/MobileTerminal';
import { MobilePreviewPanel } from '@/components/mobile/MobilePreviewPanel';
import { MobileDatabasePanel } from '@/components/mobile/MobileDatabasePanel';
import { MobileSecretsPanel } from '@/components/mobile/MobileSecretsPanel';
import { MobilePackagesPanel } from '@/components/mobile/MobilePackagesPanel';
import { MobileGitPanel } from '@/components/mobile/MobileGitPanel';
import { MobileDebugPanel } from '@/components/mobile/MobileDebugPanel';
import { ReplitAgentPanelV3 } from '@/components/ai/ReplitAgentPanelV3';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  ArrowLeft, 
  RefreshCw, 
  Share2, 
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTab = 'agent' | 'files' | 'code' | 'terminal' | 'preview' | 'more';

export default function MobileWorkspace() {
  const params = useParams();
  const projectId = (params.projectId || params.id) as string;
  
  // Guard: projectId required
  if (!projectId) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Project ID required. Navigate from dashboard.</p>
      </div>
    );
  }
  
  const [activeTab, setActiveTab] = useState<MobileTab>('preview');
  const [toolsSheetOpen, setToolsSheetOpen] = useState(false);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleTabChange = (tabId: MobileTab) => {
    if (tabId === 'files') {
      setIsFilesOpen(true);
    } else if (tabId === 'more') {
      setActiveTab(tabId);
      setActiveTool(null);
      setToolsSheetOpen(true); // Auto-open tools when 'more' tab is clicked
    } else {
      setActiveTab(tabId);
      setActiveTool(null);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setActiveTool(toolId);
    setToolsSheetOpen(false);
  };
  
  const handleFileSelect = (file: any) => {
    setSelectedFileId(file.id);
    setIsFilesOpen(false);
    setActiveTab('code');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agent':
      case 'more':
        return (
          <div className="flex-1 flex flex-col bg-background pb-16">
            <ReplitAgentPanelV3 
              projectId={projectId}
              className="h-full"
            />
          </div>
        );
      
      case 'files':
        return null; // Files modal handles this
      
      case 'code':
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
        return (
          <MobileTerminal 
            projectId={projectId}
            sessionId={`mobile-${projectId}`}
            className="h-full"
          />
        );
      
      case 'preview':
        return (
          <MobilePreviewPanel 
            projectId={projectId}
            className="h-full"
          />
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground">Tab: {activeTab}</p>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background md:hidden">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between h-14 px-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-md">
            <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>
            <span className="text-sm font-medium">Agent 3</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-share"
          >
            <Share2 className="h-5 w-5" />
          </button>
          <button 
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-more"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Tab Content Area */}
      {renderTabContent()}

      {/* Bottom Tab Navigation (Replit Style) */}
      <ReplitBottomTabs
        activeTab={activeTab}
        onTabChange={(tab) => handleTabChange(tab as MobileTab)}
      />

      {/* File Explorer Modal */}
      <MobileFileExplorer 
        isOpen={isFilesOpen}
        onClose={() => setIsFilesOpen(false)}
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
        <SheetContent side="bottom" className="h-[90vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="capitalize">{activeTool}</SheetTitle>
          </SheetHeader>
          {activeTool === 'database' && <MobileDatabasePanel projectId={projectId} />}
          {activeTool === 'auth' && <MobileSecretsPanel projectId={projectId} />}
          {activeTool === 'integrations' && <MobilePackagesPanel projectId={projectId} />}
          {activeTool === 'git' && <MobileGitPanel projectId={projectId} />}
          {activeTool === 'developer' && <MobileDebugPanel projectId={projectId} />}
          {!['database', 'auth', 'integrations', 'git', 'developer'].includes(activeTool || '') && (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">
                {activeTool} panel - Coming soon
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
