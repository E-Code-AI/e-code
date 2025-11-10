/**
 * IDEPage - Web IDE with exact 3-panel layout as specified
 * 
 * Layout: AI Agent (30%) | Main Content (52%) | File Explorer (18%)
 * 
 * Reuses existing EditorPage components for functionality while
 * implementing the exact layout specified by the user.
 */

import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { File, Project } from '@shared/schema';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Zap, X } from 'lucide-react';
import { ECodeLoading } from '@/components/ECodeLoading';
import { Button } from '@/components/ui/button';

// Reuse existing components
import { TopNavBar } from '@/components/ide/TopNavBar';
import { StatusBar } from '@/components/ide/StatusBar';
import { QuickFileSearch } from '@/components/ide/QuickFileSearch';
import { KeyboardShortcutsOverlay } from '@/components/ide/KeyboardShortcutsOverlay';
import { AgentActionsPanel } from '@/components/ide/AgentActionsPanel';
import { AIAgentPanel } from '@/components/ide/AIAgentPanel';
import { ReplitFileExplorer } from '@/components/editor/ReplitFileExplorer';
import { ReplitMonacoEditor } from '@/components/editor/ReplitMonacoEditor';
import { ResponsiveWebPreview } from '@/components/editor/ResponsiveWebPreview';
import { ReplitConsole } from '@/components/editor/ReplitConsole';
import { ReplitGitPanel } from '@/components/editor/ReplitGitPanel';
import { ReplitDatabasePanel } from '@/components/editor/ReplitDatabasePanel';
import { ReplitTerminalPanel } from '@/components/editor/ReplitTerminalPanel';

interface Tab {
  id: string;
  label: string;
  closable?: boolean;
}

export default function IDEPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const projectId = (params.projectId || params.id) as string;
  
  // State
  const [activeTab, setActiveTab] = useState('preview');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'preview', label: 'Preview', closable: false }
  ]);
  const [selectedFileId, setSelectedFileId] = useState<number | undefined>();
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [gitBranch, setGitBranch] = useState('main');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [showQuickFileSearch, setShowQuickFileSearch] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Load project
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId && !!user,
  });
  
  // Load files
  const { data: files = [] } = useQuery<File[]>({
    queryKey: [`/api/projects/${projectId}/files`],
    enabled: !!projectId && !!user,
  });
  
  // Handlers
  const handleFileSelect = (file: any) => {
    setSelectedFileId(file.id);
    const tabId = `file:${file.id}`;
    if (!tabs.find(t => t.id === tabId)) {
      setTabs(prev => [...prev, { id: tabId, label: file.name, closable: true }]);
    }
    setActiveTab(tabId);
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
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'p') {
        e.preventDefault();
        setShowQuickFileSearch(true);
      }
      
      if (modKey && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Render main content based on active tab
  const renderContent = () => {
    if (activeTab === 'preview') {
      return <ResponsiveWebPreview projectId={projectId} />;
    }
    if (activeTab === 'console') {
      return <ReplitConsole />;
    }
    if (activeTab === 'git') {
      return <ReplitGitPanel projectId={projectId} />;
    }
    if (activeTab === 'database') {
      return <ReplitDatabasePanel projectId={projectId} />;
    }
    if (activeTab === 'terminal') {
      return <ReplitTerminalPanel projectId={projectId} />;
    }
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
  };
  
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
  
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <TopNavBar
        projectName={project.name}
        projectSlug={project.slug || project.id}
        ownerUsername={user?.username || ''}
        isDeployed={project.deployed || false}
        onRun={handleRunStop}
        isRunning={isRunning}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTabClose={handleTabClose}
        onAddTab={() => setTabs(prev => [...prev, { id: 'console', label: 'Console', closable: true }])}
        showFileExplorer={showFileExplorer}
        onToggleFileExplorer={() => setShowFileExplorer(prev => !prev)}
      />
      
      {/* 3-Panel Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* LEFT: AI Agent Panel (30%) */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <div className="h-full flex flex-col border-r">
            <Tabs defaultValue="agent" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="agent" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Agent
                </TabsTrigger>
                <TabsTrigger value="actions" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Actions
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="agent" className="flex-1 mt-0 overflow-hidden">
                <AIAgentPanel projectId={projectId} />
              </TabsContent>
              
              <TabsContent value="actions" className="flex-1 mt-0 overflow-hidden">
                <AgentActionsPanel projectId={projectId} />
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
    </div>
  );
}
