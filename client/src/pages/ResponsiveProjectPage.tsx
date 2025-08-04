import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project, File, InsertFile } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { 
  responsiveText, 
  responsivePadding, 
  responsiveContainer,
  responsiveButton,
  responsiveVisibility,
  mediaQueries 
} from '@/lib/responsive';

// UI Components
import FileExplorer from '@/components/FileExplorer';
import CodeEditor from '@/components/CodeEditor';
import Terminal from '@/components/Terminal';
import { ExecutionConsole } from '@/components/ExecutionConsole';
import { DeploymentPanel } from '@/components/DeploymentPanel';
import Collaboration from '@/components/Collaboration';
import GitPanel from '@/components/GitPanel';
import AIPanel from '@/components/AIPanel';
import { ReplitAgentChat } from '@/components/ReplitAgentChat';
import EnvironmentPanel from '@/components/EnvironmentPanel';
import { EnvironmentProvider } from '@/hooks/useEnvironment';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ECodeLoading } from '@/components/ECodeLoading';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Settings, 
  Save, 
  ChevronLeft, 
  Download, 
  Upload, 
  Share2, 
  GitBranch,
  Layers,
  Users,
  MessageSquare,
  Sparkles,
  KeyRound,
  Menu,
  X,
  FileCode,
  Terminal as TerminalIcon,
  Code as CodeIcon,
  Globe,
  MoreVertical
} from 'lucide-react';

// Mobile tab options for bottom navigation
type MobileTab = 'files' | 'code' | 'terminal' | 'preview' | 'ai';

const ResponsiveProjectPage = () => {
  const [, params] = useRoute('/project/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Responsive states
  const isMobile = useMediaQuery(mediaQueries.isMobile);
  const isTablet = useMediaQuery(mediaQueries.isTablet);
  const isDesktop = useMediaQuery(mediaQueries.isDesktop);

  const projectId = params?.id ? parseInt(params.id) : null;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
  const [terminalVisible, setTerminalVisible] = useState(!isMobile);
  const [projectRunning, setProjectRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'console' | 'deployment' | 'git' | 'env'>('terminal');
  const [rightPanelVisible, setRightPanelVisible] = useState(isDesktop);
  const [aiPanelVisible, setAiPanelVisible] = useState(false);
  
  // Mobile specific states
  const [mobileTab, setMobileTab] = useState<MobileTab>('code');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get current user for collaboration
  const { user } = useAuth();

  // Query for fetching project details
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError 
  } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId) return Promise.reject(new Error('No project ID provided'));
      
      const res = await apiRequest('GET', `/api/projects/${projectId}`);
      if (!res.ok) {
        const error = await res.text();
        if (res.status === 401) {
          throw new Error('You need to log in to access this project');
        }
        throw new Error(error || 'Failed to fetch project');
      }
      return res.json();
    },
    enabled: !!projectId,
    retry: (failureCount, error) => {
      if (error.message.includes('log in')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Query for fetching project files
  const { 
    data: files, 
    isLoading: filesLoading, 
    error: filesError 
  } = useQuery<File[]>({
    queryKey: ['/api/files', projectId],
    queryFn: async () => {
      if (!projectId) return Promise.reject(new Error('No project ID provided'));
      
      const res = await apiRequest('GET', `/api/files/${projectId}`);
      if (!res.ok) {
        const error = await res.text();
        if (res.status === 401) {
          throw new Error('You need to log in to access this project');
        }
        throw new Error(error || 'Failed to fetch files');
      }
      return res.json();
    },
    enabled: !!projectId,
    retry: (failureCount, error) => {
      if (error.message.includes('log in')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Mutation for saving file
  const saveFileMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${id}`, { content });
      if (!res.ok) {
        throw new Error('Failed to save file');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Remove from unsaved changes
      setUnsavedChanges(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      
      // Update the file in cache
      queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
      
      toast({
        title: "File saved",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutations for file operations
  const createFileMutation = useMutation({
    mutationFn: async ({ parentId, name, isFolder }: { parentId: number | null; name: string; isFolder: boolean }) => {
      if (!projectId) return Promise.reject(new Error('No project ID provided'));
      
      const fileData: InsertFile = {
        projectId,
        path: '/',
        name,
        isDirectory: isFolder,
        content: isFolder ? null : ''
      };
      
      const res = await apiRequest('POST', '/api/files', fileData);
      if (!res.ok) {
        throw new Error('Failed to create file');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
      toast({
        title: "File created",
        description: "New file has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Save current file
  const saveCurrentFile = () => {
    if (!selectedFile) return;
    
    const content = unsavedChanges[selectedFile.id] || selectedFile.content;
    if (!content) return;
    
    saveFileMutation.mutate({ id: selectedFile.id, content });
  };

  // Handle file content change
  const handleFileChange = (content: string) => {
    if (!selectedFile) return;
    
    setUnsavedChanges(prev => ({
      ...prev,
      [selectedFile.id]: content
    }));
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Don't reselect the same file
    if (selectedFile?.id === file.id) return;
    
    // Check for unsaved changes before switching
    if (selectedFile && unsavedChanges[selectedFile.id]) {
      const confirmSwitch = window.confirm('You have unsaved changes. Do you want to continue without saving?');
      if (!confirmSwitch) return;
    }
    
    setSelectedFile(file);
    // On mobile, switch to code tab when file is selected
    if (isMobile) {
      setMobileTab('code');
      setMobileSidebarOpen(false);
    }
  };

  // Mutations for start/stop project
  const startProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) return Promise.reject(new Error('No project ID provided'));
      
      const res = await apiRequest('POST', `/api/runtime/${projectId}/start`);
      if (!res.ok) {
        throw new Error('Failed to start project');
      }
      return res.json();
    },
    onSuccess: () => {
      setProjectRunning(true);
      toast({
        title: "Project started",
        description: "Your project is now running.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const stopProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) return Promise.reject(new Error('No project ID provided'));
      
      const res = await apiRequest('POST', `/api/runtime/${projectId}/stop`);
      if (!res.ok) {
        throw new Error('Failed to stop project');
      }
      return res.json();
    },
    onSuccess: () => {
      setProjectRunning(false);
      toast({
        title: "Project stopped",
        description: "Your project has been stopped.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop project",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Start/stop project
  const toggleProjectRunning = () => {
    if (projectRunning) {
      stopProjectMutation.mutate();
    } else {
      startProjectMutation.mutate();
    }
  };

  // Select the first file when files are loaded
  useEffect(() => {
    if (files && files.length > 0 && !selectedFile) {
      const fileToSelect = files.find(file => !file.isDirectory);
      if (fileToSelect) {
        setSelectedFile(fileToSelect);
      }
    }
  }, [files, selectedFile]);

  // Adjust layout based on screen size
  useEffect(() => {
    setTerminalVisible(!isMobile);
    setRightPanelVisible(isDesktop);
  }, [isMobile, isDesktop]);

  // Loading state
  if (projectLoading || filesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ECodeLoading size="lg" text="Loading project..." />
      </div>
    );
  }

  // Error state
  if (projectError || filesError || !project) {
    const errorMessage = (projectError || filesError)?.message || 'Unknown error';
    const isAuthError = errorMessage.includes('log in');
    
    return (
      <div className={cn(responsiveContainer.md, responsivePadding.y.xl, "min-h-[60vh] flex items-center justify-center")}>
        <div className={cn(
          responsivePadding.base,
          "rounded-lg",
          isAuthError ? 'bg-warning/10' : 'bg-destructive/10'
        )}>
          <h2 className={cn(responsiveText['2xl'], "font-bold mb-2")}>
            {isAuthError ? 'Authentication Required' : 'Error Loading Project'}
          </h2>
          <p className={cn(
            responsiveText.base,
            "mb-4",
            isAuthError ? 'text-warning-foreground' : 'text-destructive'
          )}>
            {errorMessage}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {isAuthError ? (
              <Button onClick={() => navigate('/login')}>
                Log In
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
                  queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
                }}
              >
                Try Again
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/projects')}>
              Go to Projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Mobile bottom navigation
  const MobileBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 lg:hidden">
      <div className="grid grid-cols-5 h-14">
        <button
          onClick={() => setMobileTab('files')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs",
            mobileTab === 'files' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <FileCode className="h-4 w-4" />
          <span>Files</span>
        </button>
        <button
          onClick={() => setMobileTab('code')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs",
            mobileTab === 'code' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <CodeIcon className="h-4 w-4" />
          <span>Code</span>
        </button>
        <button
          onClick={() => setMobileTab('terminal')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs",
            mobileTab === 'terminal' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <TerminalIcon className="h-4 w-4" />
          <span>Terminal</span>
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs",
            mobileTab === 'preview' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Globe className="h-4 w-4" />
          <span>Preview</span>
        </button>
        <button
          onClick={() => setMobileTab('ai')}
          className={cn(
            "flex flex-col items-center justify-center gap-1 text-xs",
            mobileTab === 'ai' ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Sparkles className="h-4 w-4" />
          <span>AI</span>
        </button>
      </div>
    </div>
  );

  // Mobile header
  const MobileHeader = () => (
    <header className="border-b border-border h-14 px-4 flex items-center justify-between bg-background lg:hidden sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate('/projects')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-medium truncate max-w-[150px]">
          {project.name}
        </h1>
      </div>
      
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={projectRunning ? "destructive" : "default"}
                size="icon"
                className="h-8 w-8"
                onClick={toggleProjectRunning}
                disabled={startProjectMutation.isPending || stopProjectMutation.isPending}
              >
                {projectRunning ? (
                  <Square className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{projectRunning ? 'Stop' : 'Run'} project</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={saveCurrentFile} disabled={!selectedFile || !unsavedChanges[selectedFile.id]}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <GitBranch className="h-4 w-4 mr-2" />
              Git
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );

  // Desktop header
  const DesktopHeader = () => (
    <header className="hidden lg:flex border-b border-border h-12 px-4 items-center justify-between bg-background">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="sm"
          className="mr-4"
          onClick={() => navigate('/projects')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Projects
        </Button>
        
        <h1 className="text-lg font-medium flex items-center">
          {project.name}
          <Badge className="ml-2" variant={project.visibility === 'public' ? 'default' : 'secondary'}>
            {project.visibility}
          </Badge>
        </h1>
      </div>
      
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={projectRunning ? "destructive" : "default"}
                size="sm"
                className="gap-1"
                onClick={toggleProjectRunning}
                disabled={startProjectMutation.isPending || stopProjectMutation.isPending}
              >
                {projectRunning ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {projectRunning ? 'Stop' : 'Run'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{projectRunning ? 'Stop' : 'Run'} the project</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
                disabled={!selectedFile || !unsavedChanges[selectedFile.id] || saveFileMutation.isPending}
                onClick={saveCurrentFile}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save current file (Ctrl+S)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-8 w-8"
              >
                <GitBranch className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Git operations</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className={cn(
                  "h-8 w-8",
                  terminalVisible && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => setTerminalVisible(!terminalVisible)}
              >
                <Layers className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{terminalVisible ? 'Hide' : 'Show'} terminal</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className={cn(
                  "h-8 w-8",
                  aiPanelVisible && "bg-secondary text-secondary-foreground"
                )}
                onClick={() => setAiPanelVisible(!aiPanelVisible)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{aiPanelVisible ? 'Hide' : 'Show'} AI assistant</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );

  // Mobile content
  const MobileContent = () => (
    <div className="flex-1 overflow-hidden pb-14">
      {mobileTab === 'files' && (
        <div className="h-full overflow-auto">
          <FileExplorer
            files={files || []}
            selectedFile={selectedFile || undefined}
            onCreateFile={async (parentId, name) => { createFileMutation.mutate({ parentId, name, isFolder: false }); }}
            onCreateFolder={async (parentId, name) => { createFileMutation.mutate({ parentId, name, isFolder: true }); }}
            onRenameFile={async () => {}}
            onDeleteFile={async () => {}}
          />
        </div>
      )}
      
      {mobileTab === 'code' && selectedFile && (
        <div className="h-full">
          <div className="px-3 py-2 border-b border-border bg-muted/50">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
          </div>
          <div className="h-[calc(100%-45px)]">
            <CodeEditor
              file={{
                ...selectedFile,
                content: unsavedChanges[selectedFile.id] || selectedFile.content
              }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}
      
      {mobileTab === 'terminal' && (
        <div className="h-full">
          <Terminal projectId={projectId!} />
        </div>
      )}
      
      {mobileTab === 'preview' && (
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Preview coming soon</p>
        </div>
      )}
      
      {mobileTab === 'ai' && (
        <div className="h-full">
          <ReplitAgentChat projectId={projectId!} />
        </div>
      )}
    </div>
  );

  // Desktop/Tablet content
  const DesktopContent = () => (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* Files sidebar */}
      <ResizablePanel 
        defaultSize={20} 
        minSize={15} 
        maxSize={30}
        className="border-r border-border"
      >
        <FileExplorer
          files={files || []}
          selectedFile={selectedFile || undefined}
          onCreateFile={async (parentId, name) => { createFileMutation.mutate({ parentId, name, isFolder: false }); }}
          onCreateFolder={async (parentId, name) => { createFileMutation.mutate({ parentId, name, isFolder: true }); }}
          onRenameFile={async () => {}}
          onDeleteFile={async () => {}}
        />
      </ResizablePanel>
      
      <ResizableHandle />
      
      {/* Main content area */}
      <ResizablePanel defaultSize={aiPanelVisible ? 60 : 80}>
        <ResizablePanelGroup direction="vertical">
          {/* Code editor */}
          <ResizablePanel defaultSize={terminalVisible ? 70 : 100}>
            {selectedFile ? (
              <CodeEditor
                file={{
                  ...selectedFile,
                  content: unsavedChanges[selectedFile.id] || selectedFile.content
                }}
                onChange={handleFileChange}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a file to edit
              </div>
            )}
          </ResizablePanel>
          
          {terminalVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <Tabs value={bottomPanelTab} onValueChange={(v) => setBottomPanelTab(v as any)}>
                  <TabsList className="w-full justify-start rounded-none border-b">
                    <TabsTrigger value="terminal">Terminal</TabsTrigger>
                    <TabsTrigger value="console">Console</TabsTrigger>
                    <TabsTrigger value="deployment">Deploy</TabsTrigger>
                    <TabsTrigger value="git">Git</TabsTrigger>
                    <TabsTrigger value="env">Environment</TabsTrigger>
                  </TabsList>
                  <TabsContent value="terminal" className="m-0 h-[calc(100%-40px)]">
                    <Terminal projectId={projectId!} />
                  </TabsContent>
                  <TabsContent value="console" className="m-0 h-[calc(100%-40px)]">
                    <ExecutionConsole projectId={projectId!} executionId={executionId} isRunning={projectRunning} />
                  </TabsContent>
                  <TabsContent value="deployment" className="m-0 h-[calc(100%-40px)]">
                    <DeploymentPanel projectId={projectId!} />
                  </TabsContent>
                  <TabsContent value="git" className="m-0 h-[calc(100%-40px)]">
                    <GitPanel projectId={projectId!} />
                  </TabsContent>
                  <TabsContent value="env" className="m-0 h-[calc(100%-40px)]">
                    <EnvironmentProvider projectId={projectId!}>
                      <EnvironmentPanel projectId={projectId!} />
                    </EnvironmentProvider>
                  </TabsContent>
                </Tabs>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </ResizablePanel>
      
      {aiPanelVisible && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <ReplitAgentChat projectId={projectId!} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );

  return (
    <div className="h-screen flex flex-col">
      {isMobile ? <MobileHeader /> : <DesktopHeader />}
      
      {isMobile ? <MobileContent /> : <DesktopContent />}
      
      {isMobile && <MobileBottomNav />}
    </div>
  );
};

export default ResponsiveProjectPage;