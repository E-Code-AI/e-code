import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Route, Switch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EditorWorkspace } from '@/components/EditorWorkspace';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Settings, Package, Key, FileCode, Terminal as TerminalIcon, GitBranch, Database, Rocket, Bot, Search } from 'lucide-react';
import { File, Project } from '@shared/schema';
import TopNavbar from '@/components/TopNavbar';
import TerminalPanel from '@/components/TerminalPanel';
import { RunButton } from '@/components/RunButton';
import { EnvironmentVariables } from '@/components/EnvironmentVariables';
import { PackageManager } from '@/components/PackageManager';
import { WebPreview } from '@/components/WebPreview';
import { Shell } from '@/components/Shell';
import { GlobalSearch } from '@/components/GlobalSearch';
import { GitIntegration } from '@/components/GitIntegration';
import { ReplitDB } from '@/components/ReplitDB';
import { DeploymentManager } from '@/components/DeploymentManager';
import { AIAssistant } from '@/components/AIAssistant';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

export default function EditorPage() {
  const { projectId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Parse project ID
  const projectIdNum = projectId ? parseInt(projectId) : 0;
  
  // Get project details
  const { 
    data: project, 
    isLoading: isLoadingProject,
    error: projectError,
  } = useQuery({
    queryKey: ['/api/projects', projectIdNum],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectIdNum}`);
      return res.json();
    },
    enabled: !!projectIdNum && !!user,
  });
  
  // Get project files
  const { 
    data: files = [], 
    isLoading: isLoadingFiles,
    error: filesError,
  } = useQuery<File[]>({
    queryKey: ['/api/projects', projectIdNum, 'files'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectIdNum}/files`);
      return res.json();
    },
    enabled: !!projectIdNum && !!user,
  });
  
  // Update file content mutation
  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number, content: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${fileId}`, { content });
      return res.json();
    },
    onSuccess: (data) => {
      if (projectId) {
        const projectIdNum = parseInt(projectId);
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectIdNum, 'files'] });
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
      const res = await apiRequest('POST', `/api/projects/${projectId}/files`, {
        name,
        isFolder,
        parentId: parentId || null,
        content: '',
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (projectId) {
        const projectIdNum = parseInt(projectId);
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectIdNum, 'files'] });
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
      const res = await apiRequest('DELETE', `/api/files/${fileId}`);
      return res.json();
    },
    onSuccess: () => {
      if (projectId) {
        const projectIdNum = parseInt(projectId);
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectIdNum, 'files'] });
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
  
  // Show loading state
  if (isLoadingProject || isLoadingFiles) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
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
  
  // Track active file for Navbar
  const [activeFile, setActiveFile] = useState<File | undefined>(undefined);
  const [showNixConfig, setShowNixConfig] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showReplitDB, setShowReplitDB] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [isProjectRunning, setIsProjectRunning] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState('preview');
  const [bottomPanelTab, setBottomPanelTab] = useState('terminal');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | undefined>(undefined);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

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

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search: Ctrl/Cmd + Shift + F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      // AI Assistant: Ctrl/Cmd + I
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        setShowAIAssistant(!showAIAssistant);
        setRightPanelTab('ai');
      }
      // Command Palette: Ctrl/Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAIAssistant]);
  
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header with Run Button */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <TopNavbar 
          project={project} 
          activeFile={activeFile}
          isLoading={isLoadingProject || isLoadingFiles}
          onNixConfigOpen={handleNixConfigOpen}
          onCommandPaletteOpen={handleCommandPaletteOpen}
          onKeyboardShortcutsOpen={handleKeyboardShortcutsOpen}
          onDatabaseOpen={handleDatabaseOpen}
          onCollaborationOpen={handleCollaborationOpen}
        />
        <RunButton 
          projectId={projectIdNum} 
          language={project?.language || 'javascript'}
          onRunning={setIsProjectRunning}
        />
      </div>
      
      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - File Explorer */}
        <ResizablePanel defaultSize={20} minSize={15}>
          <div className="h-full border-r">
            <EditorWorkspace
              project={project}
              files={files}
              onFileUpdate={handleFileUpdate}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              onActiveFileChange={handleActiveFileChange}
              initialShowNixConfig={showNixConfig}
              initialShowCommandPalette={showCommandPalette}
              initialShowKeyboardShortcuts={showKeyboardShortcuts}
              initialShowReplitDB={showReplitDB}
              initialShowCollaboration={showCollaboration}
              onNixConfigChange={setShowNixConfig}
              onCommandPaletteChange={setShowCommandPalette}
              onKeyboardShortcutsChange={setShowKeyboardShortcuts}
              onReplitDBChange={setShowReplitDB}
              onCollaborationChange={setShowCollaboration}
              sidebarOnly={true}
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Center Panel - Code Editor */}
        <ResizablePanel defaultSize={50}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70}>
              <EditorWorkspace
                project={project}
                files={files}
                onFileUpdate={handleFileUpdate}
                onFileCreate={handleFileCreate}
                onFileDelete={handleFileDelete}
                onActiveFileChange={handleActiveFileChange}
                editorOnly={true}
              />
            </ResizablePanel>
            
            <ResizableHandle />
            
            {/* Bottom Panel - Terminal/Shell */}
            <ResizablePanel defaultSize={30} minSize={20}>
              <Tabs value={bottomPanelTab} onValueChange={setBottomPanelTab} className="h-full">
                <TabsList className="h-10 w-full justify-start rounded-none border-b">
                  <TabsTrigger value="terminal" className="gap-1">
                    <TerminalIcon className="h-3 w-3" />
                    Terminal
                  </TabsTrigger>
                  <TabsTrigger value="shell" className="gap-1">
                    <TerminalIcon className="h-3 w-3" />
                    Shell
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="terminal" className="h-[calc(100%-40px)] m-0">
                  <TerminalPanel projectId={projectIdNum} />
                </TabsContent>
                <TabsContent value="shell" className="h-[calc(100%-40px)] m-0">
                  <Shell projectId={projectIdNum} isRunning={isProjectRunning} />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        
        <ResizableHandle />
        
        {/* Right Panel - Preview/Settings */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <Tabs value={rightPanelTab} onValueChange={setRightPanelTab} className="h-full">
            <TabsList className="h-10 w-full justify-start rounded-none border-b overflow-x-auto">
              <TabsTrigger value="preview" className="gap-1">
                <FileCode className="h-3 w-3" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="packages" className="gap-1">
                <Package className="h-3 w-3" />
                Packages
              </TabsTrigger>
              <TabsTrigger value="env" className="gap-1">
                <Key className="h-3 w-3" />
                Env
              </TabsTrigger>
              <TabsTrigger value="git" className="gap-1">
                <GitBranch className="h-3 w-3" />
                Git
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-1">
                <Database className="h-3 w-3" />
                Database
              </TabsTrigger>
              <TabsTrigger value="deploy" className="gap-1">
                <Rocket className="h-3 w-3" />
                Deploy
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1">
                <Bot className="h-3 w-3" />
                AI
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1">
                <Settings className="h-3 w-3" />
                Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="h-[calc(100%-40px)] m-0">
              <WebPreview 
                projectId={projectIdNum} 
                port={3000} 
                isRunning={isProjectRunning} 
              />
            </TabsContent>
            <TabsContent value="packages" className="h-[calc(100%-40px)] m-0">
              <PackageManager 
                projectId={projectIdNum} 
                language={project?.language || 'javascript'} 
              />
            </TabsContent>
            <TabsContent value="env" className="h-[calc(100%-40px)] m-0">
              <EnvironmentVariables projectId={projectIdNum} />
            </TabsContent>
            <TabsContent value="git" className="h-[calc(100%-40px)] m-0">
              <GitIntegration projectId={projectIdNum} />
            </TabsContent>
            <TabsContent value="database" className="h-[calc(100%-40px)] m-0">
              <ReplitDB projectId={projectIdNum} />
            </TabsContent>
            <TabsContent value="deploy" className="h-[calc(100%-40px)] m-0">
              <DeploymentManager projectId={projectIdNum} />
            </TabsContent>
            <TabsContent value="ai" className="h-[calc(100%-40px)] m-0">
              <AIAssistant 
                projectId={projectIdNum}
                selectedFile={activeFile?.name}
                selectedCode={selectedCode}
              />
            </TabsContent>
            <TabsContent value="settings" className="h-[calc(100%-40px)] m-0 p-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Project Settings</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Language: {project?.language || 'Not set'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created: {project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Global Search Dialog */}
      {showGlobalSearch && (
        <GlobalSearch
          projectId={projectIdNum}
          isOpen={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}
    </div>
  );
}