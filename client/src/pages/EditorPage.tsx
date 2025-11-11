import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Route, Switch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorWorkspace } from '@/components/EditorWorkspace';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Package, Key, FileCode, Terminal as TerminalIcon, GitBranch, Database, Bot, Search, Users, X } from 'lucide-react';
import { ECodeLoading } from '@/components/ECodeLoading';
import { File, Project } from '@shared/schema';
import TopNavbar from '@/components/TopNavbar';
import TerminalPanel from '@/components/TerminalPanel';
import { RunButton } from '@/components/RunButton';
import { ResponsiveTerminal } from '@/components/editor/ResponsiveTerminal';
import { ResponsiveWebPreview } from '@/components/editor/ResponsiveWebPreview';
import { MobileEditorTabs } from '@/components/editor/MobileEditorTabs';
import { EnvironmentVariables } from '@/components/EnvironmentVariables';
import { PackageManager } from '@/components/PackageManager';
import { WebPreview } from '@/components/WebPreview';
import { Shell } from '@/components/Shell';
import { ReplitConsole } from '@/components/editor/ReplitConsole';
import { GlobalSearch } from '@/components/GlobalSearch';
import { GitIntegration } from '@/components/GitIntegration';
import { ReplitDB } from '@/components/ReplitDB';
// Lazy load DeploymentManager for performance
const DeploymentManager = React.lazy(() => import('@/components/DeploymentManager').then(module => ({ default: module.DeploymentManager })));
import { ImportExport } from '@/components/ImportExport';
import { AIAssistant } from '@/components/AIAssistant';
import { BillingSystem } from '@/components/BillingSystem';
import { ExtensionsMarketplace } from '@/components/ExtensionsMarketplace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ReplitEditorLayout } from '@/components/editor/ReplitEditorLayout';
import { ReplitFileSidebar } from '@/components/editor/ReplitFileSidebar';
import { ReplitCodeEditor } from '@/components/editor/ReplitCodeEditor';
import { CommandPalette } from '@/components/editor/CommandPalette';
import { Globe, MoreVertical, Beaker, Package as PackageIcon, Bug, Rocket, AlertCircle, FileText, TestTube, Shield, Activity, Cpu } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CollaborationPresence } from '@/components/editor/CollaborationPresence';
import { DatabaseBrowser } from '@/components/DatabaseBrowser';
import { PackageViewer } from '@/components/PackageViewer';
import { DebuggerPanel } from '@/components/DebuggerPanel';
import { TestRunner } from '@/components/TestRunner';
import { ReplitProblemsPanel } from '@/components/editor/ReplitProblemsPanel';
import { ReplitOutputPanel } from '@/components/editor/ReplitOutputPanel';
import { ReplitTestingPanel } from '@/components/editor/ReplitTestingPanel';
import { ReplitSecurityPanel } from '@/components/editor/ReplitSecurityPanel';
import { ReplitResourcesPanel } from '@/components/editor/ReplitResourcesPanel';
import { ReplitAgent } from '@/components/ReplitAgent';

type EditorPageProps = {
  projectId?: string | null;
  initialProject?: Project | null;
};

export default function EditorPage(props: EditorPageProps = {}) {
  const params = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  
  // Preserve project ID as string (UUID compatible)
  // Support both prop-based projectId (from ProjectPage) and route param projectId
  const resolvedProjectId = props.projectId ?? params.projectId ?? null;
  const projectIdValue = resolvedProjectId ?? '';
  const hasProjectId = projectIdValue.length > 0;
  const initialProject = props.initialProject ?? null;

  // Read URL parameters for AI Agent
  const urlParams = new URLSearchParams(window.location.search);
  const shouldShowAgent = urlParams.get('agent') === 'true';
  const urlPrompt = urlParams.get('prompt');
  const sessionPrompt = projectIdValue ? window.sessionStorage.getItem(`agent-prompt-${projectIdValue}`) : null;
  const initialPrompt = urlPrompt || sessionPrompt || null;

  // ALL useState hooks MUST be called before any early returns to satisfy Rules of Hooks
  const [activeFile, setActiveFile] = useState<File | undefined>(undefined);
  const [showNixConfig, setShowNixConfig] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showReplitDB, setShowReplitDB] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [isProjectRunning, setIsProjectRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [rightPanelTab, setRightPanelTab] = useState('preview');
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'problems' | 'output' | 'testing' | 'security' | 'resources'>('terminal');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);
  const [mobileActiveTab, setMobileActiveTab] = useState('code');
  
  // Get project details
  const { 
    data: project, 
    isLoading: isLoadingProject,
    error: projectError,
  } = useQuery<Project>({
    queryKey: ['/api/projects', projectIdValue],
    queryFn: async () => {
      if (!hasProjectId) throw new Error('Missing project id');
      return await apiRequest('GET', `/api/projects/${projectIdValue}`);
    },
    enabled: hasProjectId && !!user,
    initialData: initialProject && resolvedProjectId && initialProject.id === resolvedProjectId ? initialProject : undefined,
  });
  
  // Get project files
  const { 
    data: files = [], 
    isLoading: isLoadingFiles,
    error: filesError,
  } = useQuery<File[]>({
    queryKey: [`/api/projects/${projectIdValue}/files`],
    enabled: hasProjectId && !!user,
  });
  
  // Update file content mutation
  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number, content: string }) => {
      return await apiRequest('PATCH', `/api/files/${fileId}`, { content });
    },
    onSuccess: (data) => {
      if (projectIdValue) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdValue}/files`] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update file',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Create file mutation
  const createFileMutation = useMutation({
    mutationFn: async ({ name, isFolder, parentId }: { name: string, isFolder: boolean, parentId?: number | null }) => {
      return await apiRequest('POST', `/api/files/${projectIdValue}`, {
        name,
        isFolder,
        parentId: parentId || null,
        content: '',
      });
    },
    onSuccess: (data) => {
      if (projectIdValue) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdValue}/files`] });
      }
      toast({
        title: 'File created',
        description: `Created ${data.name} successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create file',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      return await apiRequest('DELETE', `/api/files/${fileId}`);
    },
    onSuccess: () => {
      if (projectIdValue) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectIdValue}/files`] });
      }
      toast({
        title: 'File deleted',
        description: 'File was deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete file',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Handle file update
  const handleFileUpdate = async (fileId: number, content: string) => {
    await updateFileMutation.mutateAsync({ fileId, content });
  };
  
  // Handle file creation
  const handleFileCreate = async (name: string, isFolder: boolean, parentId?: number | null) => {
    await createFileMutation.mutateAsync({ name, isFolder, parentId });
  };
  
  // Handle file deletion
  const handleFileDelete = async (fileId: number) => {
    await deleteFileMutation.mutateAsync(fileId);
  };
  
  // Keyboard shortcut handlers - MUST be before early returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search: Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      // AI Assistant now accessible via tool dock
      // Command Palette: Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Show loading state (early return AFTER all hooks have been called)
  if (isLoadingProject || isLoadingFiles) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ECodeLoading size="lg" text="Loading editor..." />
      </div>
    );
  }
  
  // Show error state (early return AFTER all hooks have been called)
  if (projectError || filesError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center p-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl text-destructive">!</span>
          </div>
          <h2 className="text-xl font-semibold">Error Loading Project</h2>
          <p className="text-muted-foreground">
            {projectError ? (projectError as Error).message : (filesError as Error).message}
          </p>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  // Update active file handler
  const handleActiveFileChange = (file: File | undefined) => {
    setActiveFile(file);
  };
  
  // UI toggle handlers
  const handleNixConfigOpen = () => {
    setShowNixConfig(true);
  };
  
  const handleCommandPaletteOpen = () => {
    setShowCommandPalette(true);
  };
  
  const handleKeyboardShortcutsOpen = () => {
    setShowKeyboardShortcuts(true);
  };
  
  const handleDatabaseOpen = () => {
    setShowReplitDB(true);
  };
  
  const handleCollaborationOpen = () => {
    setShowCollaboration(true);
  };

  // Mobile-specific Monaco editor configuration
  const editorOptions = isMobile ? {
    fontSize: 14,
    lineHeight: 22,
    minimap: { enabled: false },
    scrollbar: { vertical: 'auto', horizontal: 'auto' },
    wordWrap: 'on',
    folding: true,
    glyphMargin: false,
    lineNumbers: 'on',
    lineDecorationsWidth: 0,
    renderLineHighlight: 'all',
    quickSuggestions: false,
    suggestOnTriggerCharacters: false
  } : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--ecode-background)]">
      {/* E-Code-style Header - Mobile-Optimized with Touch Targets */}
      <div className="h-14 sm:h-12 flex items-center justify-between border-b border-[var(--ecode-border)] bg-[var(--ecode-background)] px-2 sm:px-3 lg:px-4">
        <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 flex-1 min-w-0">
          {/* Project name and controls - Mobile Optimized */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="h-10 w-10 sm:h-8 sm:w-8 flex-shrink-0">
              <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
            <h1 className="text-base sm:text-sm lg:text-base font-medium truncate max-w-[120px] sm:max-w-[150px] lg:max-w-none">
              {project?.name || ''}
            </h1>
          </div>
          
          {/* Run button - Mobile-Optimized */}
          <RunButton 
            projectId={projectIdValue} 
            language={project?.language || 'javascript'}
            onRunning={(running, execId) => {
              setIsProjectRunning(running);
              setExecutionId(execId);
            }}
            className="h-10 sm:h-8 flex-shrink-0"
            variant="default"
            size={isMobile ? "sm" : "sm"}
          />
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0">
          {/* Collaboration Presence - Hidden on mobile */}
          {user && !isMobile && (
            <CollaborationPresence 
              projectId={projectIdValue} 
              currentUserId={user.id}
              compact={true}
              className="mr-2"
            />
          )}
          
          {/* Desktop buttons */}
          {!isMobile && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Users className="h-3 w-3 mr-1" />
                <span className="hidden xl:inline">Invite</span>
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Rocket className="h-3 w-3 mr-1" />
                <span className="hidden xl:inline">Deploy</span>
              </Button>
            </>
          )}
          
          {/* Mobile dropdown menu */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Users className="h-4 w-4 mr-2" />
                  Invite to collaborate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy project
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Project settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {/* Main Content Area - Responsive Layout */}
      {isMobile ? (
        <MobileEditorTabs
          fileExplorer={
            <ReplitFileSidebar
              files={files}
              activeFileId={activeFile?.id}
              onFileSelect={handleActiveFileChange}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              projectName={project?.name}
              projectId={projectIdValue}
            />
          }
          codeEditor={
            <div className={cn("h-full", isMobile && "mobile-editor")}>
              <ReplitCodeEditor
                files={files}
                activeFile={activeFile}
                onFileUpdate={handleFileUpdate}
                editorOptions={editorOptions}
              />
            </div>
          }
          terminal={
            <ResponsiveTerminal 
              projectId={projectIdValue}
            />
          }
          preview={
            <ResponsiveWebPreview 
              projectId={projectIdValue} 
              isRunning={isProjectRunning}
            />
          }
          aiAgent={
            <ReplitAgent
              projectId={projectIdValue}
              selectedFile={activeFile?.path}
              selectedCode={selectedCode}
              initialPrompt={initialPrompt}
              className="h-full"
            />
          }
          defaultTab={mobileActiveTab}
          isRunning={isProjectRunning}
          onRun={() => {
            // Handle run action - project runs automatically
            console.log('Running project', projectIdValue);
          }}
        />
      ) : (
        <ReplitEditorLayout
          files={files}
          activeFileId={activeFile?.id}
          onFileSelect={handleActiveFileChange}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          projectName={project?.name}
          projectId={projectIdValue}
          centerPanel={
            <ReplitCodeEditor
              files={files}
              activeFile={activeFile}
              onFileUpdate={handleFileUpdate}
            />
          }
          bottomPanel={
            <Tabs value={bottomPanelTab} onValueChange={(value) => setBottomPanelTab(value as typeof bottomPanelTab)} className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b bg-[#1C1C1C] h-8 px-2">
                <TabsTrigger value="terminal" className="flex items-center gap-1.5 text-xs h-6 data-[state=active]:bg-[#2D2D2D]">
                  <TerminalIcon className="h-3 w-3" />
                  <span>Terminal</span>
                </TabsTrigger>
                <TabsTrigger value="problems" className="flex items-center gap-1.5 text-xs h-6 data-[state=active]:bg-[#2D2D2D]">
                  <AlertCircle className="h-3 w-3" />
                  <span>Problems</span>
                </TabsTrigger>
                <TabsTrigger value="output" className="flex items-center gap-1.5 text-xs h-6 data-[state=active]:bg-[#2D2D2D]">
                  <FileText className="h-3 w-3" />
                  <span>Output</span>
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-1.5 text-xs h-6 data-[state=active]:bg-[#2D2D2D]">
                  <TestTube className="h-3 w-3" />
                  <span>Testing</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-1.5 text-xs h-6 data-[state=active]:bg-[#2D2D2D]">
                  <Shield className="h-3 w-3" />
                  <span>Security</span>
                </TabsTrigger>
                <TabsTrigger value="resources" className="flex items-center gap-1.5 text-xs h-6 data-[state=active]:bg-[#2D2D2D]">
                  <Activity className="h-3 w-3" />
                  <span>Resources</span>
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden">
                <TabsContent value="terminal" className="h-full m-0">
                  <ResponsiveTerminal projectId={projectIdValue} />
                </TabsContent>
                <TabsContent value="problems" className="h-full m-0">
                  <ReplitProblemsPanel projectId={projectIdValue} onFileNavigate={(file) => setActiveFile(file)} />
                </TabsContent>
                <TabsContent value="output" className="h-full m-0">
                  <ReplitOutputPanel projectId={projectIdValue} />
                </TabsContent>
                <TabsContent value="testing" className="h-full m-0">
                  <ReplitTestingPanel projectId={projectIdValue} />
                </TabsContent>
                <TabsContent value="security" className="h-full m-0">
                  <ReplitSecurityPanel projectId={projectIdValue} />
                </TabsContent>
                <TabsContent value="resources" className="h-full m-0">
                  <ReplitResourcesPanel projectId={projectIdValue} />
                </TabsContent>
              </div>
            </Tabs>
          }
          rightPanels={[
            {
              id: 'preview',
              title: 'Webview',
              icon: <Globe className="h-3 w-3" />,
              content: <ResponsiveWebPreview projectId={projectIdValue} isRunning={isProjectRunning} />
            },
            {
              id: 'console',
              title: 'Console',
              icon: <TerminalIcon className="h-3 w-3" />,
              content: <ReplitConsole projectId={projectIdValue} isRunning={isProjectRunning} executionId={executionId} />
            }
          ]}
          defaultRightPanel="preview"
        />
      )}

      {/* Command Palette - CMD/CTRL + K */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        files={files}
        onFileSelect={(file) => {
          setActiveFile(file);
          setShowCommandPalette(false);
        }}
        onToolSelect={(tool) => {
          // Handle tool selection
          console.log('Tool selected from command palette:', tool);
          setShowCommandPalette(false);
        }}
      />

      {/* Global Search Dialog */}
      {showGlobalSearch && (
        <GlobalSearch
          projectId={projectIdValue}
          isOpen={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
          onFileSelect={(file) => {
            setActiveFile(file.content !== undefined ? {...file, content: file.content ?? null} : undefined);
            setShowGlobalSearch(false);
          }}
        />
      )}
    </div>
  );
}