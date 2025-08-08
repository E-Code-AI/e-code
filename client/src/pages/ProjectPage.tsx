import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project, File, InsertFile } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

// UI Components
import FileExplorer from '@/components/FileExplorer';
import CodeEditor from '@/components/CodeEditor';
import Terminal from '@/components/Terminal';
import Preview from '@/components/Preview';
import { ExecutionConsole } from '@/components/ExecutionConsole';
import { DeploymentPanel } from '@/components/DeploymentPanel';
import Collaboration from '@/components/Collaboration';
import GitPanel from '@/components/GitPanel';
import AIPanel from '@/components/AIPanel';
import { ReplitAgentChat } from '@/components/ReplitAgentChat';
import { ReplitAgentV2 } from '@/components/ReplitAgentV2';
import { MainAgentInterface } from '@/components/MainAgentInterface';
import { ReplitSidebar } from '@/components/layout/ReplitSidebar';
import EnvironmentPanel from '@/components/EnvironmentPanel';
import { EnvironmentProvider } from '@/hooks/useEnvironment';
import { ResourceMonitor } from '@/components/ResourceMonitor';
import { CollaborativePresence } from '@/components/CollaborativePresence';
import { AutoSaveIndicator } from '@/components/AutoSaveIndicator';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';
import { ProjectSearch } from '@/components/ProjectSearch';
import { ProjectStats } from '@/components/ProjectStats';
import { FileUploadDropzone } from '@/components/FileUploadDropzone';
import { PackageManager } from '@/components/PackageManager';
import { ProjectSharing } from '@/components/ProjectSharing';
import { GitHubMCPPanel } from '@/components/mcp/GitHubMCPPanel';
import { PostgreSQLMCPPanel } from '@/components/mcp/PostgreSQLMCPPanel';
import { MemoryMCPPanel } from '@/components/mcp/MemoryMCPPanel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ECodeLoading } from '@/components/ECodeLoading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  X
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

const ProjectPage = () => {
  const [matchId, paramsId] = useRoute('/project/:id');
  const [matchSlug, paramsSlug] = useRoute('/@:username/:projectname');
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Determine if we're using ID or slug route
  const isSlugRoute = !!matchSlug && paramsSlug?.username && paramsSlug?.projectname;
  const projectId = matchId && paramsId?.id ? parseInt(paramsId.id) : null;
  const projectSlug = isSlugRoute ? `@${paramsSlug.username}/${paramsSlug.projectname}` : null;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [projectRunning, setProjectRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'console' | 'deployment' | 'git' | 'env'>('terminal');
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [aiPanelVisible, setAiPanelVisible] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'preview' | 'assistant' | 'collaborate' | 'resources' | 'presence' | 'search' | 'stats' | 'packages' | 'share' | 'github' | 'postgres' | 'memory'>('preview');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'offline'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [showMainAgent, setShowMainAgent] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState<string | undefined>();
  
  // Get current user for collaboration
  const { user } = useAuth();
  
  // Handle agent mode from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isAgentMode = searchParams.get('agent') === 'true';
    const prompt = searchParams.get('prompt');
    
    // Use the project ID from the loaded project data
    const effectiveProjectId = project?.id || projectId;
    
    if (isAgentMode && prompt && effectiveProjectId) {
      // Show the main agent interface with the prompt
      setAgentPrompt(prompt);
      setShowMainAgent(true);
      
      // Also open the assistant panel for additional help
      setAiPanelVisible(true);
      setRightPanelTab('assistant');
      
      // Clean up URL without reloading the page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [projectId, project]);

  // Query for fetching project details
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError 
  } = useQuery<Project>({
    queryKey: projectSlug ? ['project-by-slug', projectSlug] : ['project-by-id', projectId],
    queryFn: async () => {
      if (!projectId && !projectSlug) return Promise.reject(new Error('No project identifier provided'));
      
      const url = projectSlug 
        ? `/api/users/${paramsSlug?.username}/projects/${paramsSlug?.projectname}`
        : `/api/projects/${projectId}`;
      
      const res = await apiRequest('GET', url);
      if (!res.ok) {
        const error = await res.text();
        if (res.status === 401) {
          throw new Error('You need to log in to access this project');
        }
        throw new Error(error || 'Failed to fetch project');
      }
      const projectData = res.json();
      return projectData;
    },
    enabled: !!projectId || !!projectSlug,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
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
    queryKey: ['/api/projects', project?.id, 'files'],
    queryFn: async () => {
      const actualProjectId = project?.id || projectId;
      if (!actualProjectId) return Promise.reject(new Error('No project ID provided'));
      
      const res = await apiRequest('GET', `/api/projects/${actualProjectId}/files`);
      if (!res.ok) {
        const error = await res.text();
        if (res.status === 401) {
          throw new Error('You need to log in to access this project');
        }
        throw new Error(error || 'Failed to fetch files');
      }
      return res.json();
    },
    enabled: !!(project?.id || projectId),
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('log in')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Mutation for saving file changes
  const saveFileMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number, content: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${id}`, { content });
      if (!res.ok) {
        throw new Error('Failed to save file');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Remove from unsaved changes
      setUnsavedChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[variables.id];
        return newChanges;
      });
      
      // Update auto-save status
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      
      toast({
        title: "File saved",
        description: "Your changes have been saved successfully.",
      });
      
      // Refresh file list to get updated timestamps
      queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
    },
    onError: (error: Error) => {
      setAutoSaveStatus('error');
      toast({
        title: "Failed to save file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for creating a new file
  const createFileMutation = useMutation({
    mutationFn: async ({ parentId, name, isFolder }: { parentId: number | null, name: string, isFolder: boolean }) => {
      if (!projectId) return Promise.reject(new Error('No project ID provided'));
      
      const newFile = {
        name,
        isDirectory: isFolder,
        path: parentId ? `${parentId}/${name}` : name,
        projectId,
        content: isFolder ? null : '',
      };
      
      const res = await apiRequest('POST', `/api/files/${projectId}`, newFile);
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

  // Mutation for deleting a file
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await apiRequest('DELETE', `/api/files/${fileId}`);
      if (!res.ok) {
        throw new Error('Failed to delete file');
      }
      return res.json();
    },
    onSuccess: (_, fileId) => {
      // If the deleted file was selected, deselect it
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
      toast({
        title: "File deleted",
        description: "File has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for renaming a file
  const renameFileMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number, name: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${id}`, { name });
      if (!res.ok) {
        throw new Error('Failed to rename file');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
      toast({
        title: "File renamed",
        description: "File has been renamed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rename file",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation for starting the project
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

  // Mutation for stopping the project
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
  };

  // Save current file
  const saveCurrentFile = () => {
    if (!selectedFile) return;
    
    const content = unsavedChanges[selectedFile.id] || selectedFile.content;
    if (!content) return;
    
    setAutoSaveStatus('saving');
    saveFileMutation.mutate({ id: selectedFile.id, content });
  };

  // Handle creation of a new file
  const handleCreateFile = async (parentId: number | null, name: string) => {
    await createFileMutation.mutateAsync({ parentId, name, isFolder: false });
  };

  // Handle creation of a new folder
  const handleCreateFolder = async (parentId: number | null, name: string) => {
    await createFileMutation.mutateAsync({ parentId, name, isFolder: true });
  };

  // Handle renaming a file
  const handleRenameFile = async (file: File, newName: string) => {
    await renameFileMutation.mutateAsync({ id: file.id, name: newName });
  };

  // Handle deleting a file
  const handleDeleteFile = async (file: File) => {
    await deleteFileMutation.mutateAsync(file.id);
  };

  // Toggle terminal visibility
  const toggleTerminal = () => {
    setTerminalVisible(prev => !prev);
  };
  
  // Toggle AI panel visibility
  const toggleAiPanel = () => {
    setAiPanelVisible(prev => !prev);
  };

  // Start/stop project
  const toggleProjectRunning = () => {
    if (projectRunning) {
      stopProjectMutation.mutate();
    } else {
      startProjectMutation.mutate();
    }
  };
  
  // Listen for Agent open event from sidebar and check URL params
  useEffect(() => {
    // Check URL params for agent mode
    const urlParams = new URLSearchParams(window.location.search);
    const agentMode = urlParams.get('agent') === 'true';
    const prompt = urlParams.get('prompt');
    
    if (agentMode) {
      setAiPanelVisible(true);
      setRightPanelVisible(true);
      setRightPanelTab('ai');
      
      // Store prompt for the AI agent if provided
      if (prompt && projectId) {
        window.sessionStorage.setItem(`agent-prompt-${projectId}`, decodeURIComponent(prompt));
      }
    }
    
    // Listen for openAgent event
    const handleOpenAgent = () => {
      setAiPanelVisible(true);
      setRightPanelVisible(true);
      setRightPanelTab('ai');
    };
    
    window.addEventListener('openAgent', handleOpenAgent);
    return () => window.removeEventListener('openAgent', handleOpenAgent);
  }, [projectId]);

  // Check project status on load
  useEffect(() => {
    if (!projectId) return;
    
    const checkStatus = async () => {
      try {
        const res = await apiRequest('GET', `/api/runtime/${projectId}/status`);
        if (res.ok) {
          const data = await res.json();
          setProjectRunning(data.status === 'running');
        }
      } catch (error) {
        console.error('Failed to check project status:', error);
      }
    };
    
    checkStatus();
  }, [projectId]);

  // Select the first file when files are loaded
  useEffect(() => {
    if (files && files.length > 0 && !selectedFile) {
      // Try to find a non-folder file to select
      const fileToSelect = files.find(file => !file.isDirectory);
      if (fileToSelect) {
        setSelectedFile(fileToSelect);
      }
    }
  }, [files, selectedFile]);

  // Show loading state
  if (projectLoading || filesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <ECodeLoading size="lg" text="Loading project..." />
        </div>
      </div>
    );
  }

  // Show error state
  if (projectError || filesError) {
    const errorMessage = (projectError || filesError)?.message || 'Unknown error';
    const isAuthError = errorMessage.includes('log in');
    
    return (
      <div className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className={`p-6 rounded-lg ${isAuthError ? 'bg-warning/10' : 'bg-destructive/10'}`}>
          <h2 className="text-xl font-bold mb-2">
            {isAuthError ? 'Authentication Required' : 'Error Loading Project'}
          </h2>
          <p className={`mb-4 ${isAuthError ? 'text-warning-foreground' : 'text-destructive'}`}>
            {errorMessage}
          </p>
          <div className="flex gap-2">
            {isAuthError ? (
              <Button onClick={() => window.location.href = '/auth'}>
                Log In
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
                  queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
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

  // Show not found state
  if (!project) {
    return (
      <div className="container mx-auto py-10 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-muted p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
          <p className="mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/projects')}>
            Go to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header / Toolbar */}
      <header className="border-b border-border h-12 px-4 flex items-center justify-between bg-background">
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
          {/* Run/Stop Button */}
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
                  {startProjectMutation.isPending || stopProjectMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : projectRunning ? (
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
          
          {/* Save Button */}
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
                  {saveFileMutation.isPending ? (
                    <Spinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save current file (Ctrl+S)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Auto Save Indicator */}
          <AutoSaveIndicator 
            status={autoSaveStatus} 
            lastSaved={lastSaved}
          />
          
          {/* Git Button */}
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
          
          {/* Terminal Toggle Button */}
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
                  onClick={toggleTerminal}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{terminalVisible ? 'Hide' : 'Show'} terminal</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Main AI Agent Toggle Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    showMainAgent && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setShowMainAgent(!showMainAgent)}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showMainAgent ? 'Hide' : 'Show'} AI Agent</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* AI Assistant Toggle Button (Side Panel) */}
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
                  onClick={toggleAiPanel}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{aiPanelVisible ? 'Hide' : 'Show'} Assistant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Project Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowFileUpload(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Files
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Project Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowKeyboardShortcuts(true)}>
                <KeyRound className="h-4 w-4 mr-2" />
                Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Show Main Agent Interface as Principal when active (like Replit) */}
        {showMainAgent && projectId ? (
          <div className="flex-1 flex">
            {/* Agent Interface takes center stage */}
            <div className="flex-1 flex flex-col">
              <MainAgentInterface 
                projectId={projectId}
                initialPrompt={agentPrompt}
                onMinimize={() => setShowMainAgent(false)}
                className="h-full"
              />
            </div>
            
            {/* Files sidebar on the right when agent is active */}
            <div className="w-64 border-l overflow-auto">
              <ReplitSidebar projectId={projectId} />
            </div>
          </div>
        ) : (
          <>
            {/* Traditional layout when agent is not active */}
            {/* Left Sidebar with Files, Agent, Tools, etc. */}
            <div className="w-64 overflow-auto border-r">
              <ReplitSidebar projectId={projectId || 0} />
            </div>
            
            {/* Middle Section: Editor and Terminal */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Code Editor */}
              <div className={`flex-1 ${terminalVisible ? 'overflow-hidden' : 'overflow-auto'}`}>
                {selectedFile ? (
                  <CodeEditor
                    file={selectedFile}
                    onChange={handleFileChange}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>Select a file to edit</p>
                  </div>
                )}
              </div>
          
              {/* Bottom Panel (Terminal and Deployment) */}
              {terminalVisible && (
            <div className="border-t border-border h-[300px] flex flex-col">
              <div className="h-8 bg-muted/30 border-b border-border flex items-center px-4 justify-between">
                <div className="flex items-center space-x-4">
                  <Tabs 
                    value={bottomPanelTab} 
                    onValueChange={(value) => setBottomPanelTab(value as 'terminal' | 'console' | 'deployment' | 'git' | 'env')}
                    className="w-[600px]"
                  >
                    <TabsList className="h-7 bg-transparent">
                      <TabsTrigger 
                        value="terminal" 
                        className={`h-7 data-[state=active]:bg-background ${bottomPanelTab === 'terminal' ? 'border-b-2 border-primary rounded-none' : ''}`}
                      >
                        Terminal
                      </TabsTrigger>
                      <TabsTrigger 
                        value="console" 
                        className={`h-7 data-[state=active]:bg-background ${bottomPanelTab === 'console' ? 'border-b-2 border-primary rounded-none' : ''}`}
                      >
                        Console
                      </TabsTrigger>
                      <TabsTrigger 
                        value="deployment" 
                        className={`h-7 data-[state=active]:bg-background ${bottomPanelTab === 'deployment' ? 'border-b-2 border-primary rounded-none' : ''}`}
                      >
                        Deployment
                      </TabsTrigger>
                      <TabsTrigger 
                        value="git" 
                        className={`h-7 data-[state=active]:bg-background ${bottomPanelTab === 'git' ? 'border-b-2 border-primary rounded-none' : ''}`}
                      >
                        <GitBranch className="h-4 w-4 mr-1" />
                        Git
                      </TabsTrigger>
                      <TabsTrigger 
                        value="env" 
                        className={`h-7 data-[state=active]:bg-background ${bottomPanelTab === 'env' ? 'border-b-2 border-primary rounded-none' : ''}`}
                      >
                        <KeyRound className="h-4 w-4 mr-1" />
                        Environment
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={toggleTerminal}
                >
                  <ChevronLeft className="h-4 w-4 rotate-90" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {bottomPanelTab === 'terminal' && projectId && <Terminal projectId={projectId} />}
                {bottomPanelTab === 'console' && projectId && (
                  <ExecutionConsole 
                    projectId={projectId} 
                    executionId={executionId}
                    isRunning={projectRunning}
                  />
                )}
                {bottomPanelTab === 'deployment' && projectId && <DeploymentPanel projectId={projectId} />}
                {bottomPanelTab === 'git' && projectId && <GitPanel projectId={projectId} />}
                {bottomPanelTab === 'env' && projectId && (
                  <EnvironmentProvider projectId={projectId}>
                    <EnvironmentPanel projectId={projectId} />
                  </EnvironmentProvider>
                )}
              </div>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Right Panel: Assistant/Collaboration/Resources/Presence */}
        {aiPanelVisible && projectId && (
          <div className="w-[400px] border-l border-border overflow-hidden flex flex-col">
            <Tabs value={rightPanelTab} onValueChange={(value: any) => setRightPanelTab(value)} className="h-full flex flex-col">
              <div className="h-12 border-b border-border px-4 flex items-center justify-between bg-muted/30">
                <ScrollArea className="flex-1">
                  <TabsList className="h-8 bg-transparent inline-flex">
                    <TabsTrigger value="preview" className="h-8">Preview</TabsTrigger>
                    <TabsTrigger value="assistant" className="h-8">Assistant</TabsTrigger>
                    <TabsTrigger value="collaborate" className="h-8">Collaborate</TabsTrigger>
                    <TabsTrigger value="resources" className="h-8">Resources</TabsTrigger>
                    <TabsTrigger value="search" className="h-8">Search</TabsTrigger>
                    <TabsTrigger value="stats" className="h-8">Stats</TabsTrigger>
                    <TabsTrigger value="packages" className="h-8">Packages</TabsTrigger>
                    <TabsTrigger value="share" className="h-8">Share</TabsTrigger>
                    <TabsTrigger value="github" className="h-8">GitHub</TabsTrigger>
                    <TabsTrigger value="postgres" className="h-8">Database</TabsTrigger>
                    <TabsTrigger value="memory" className="h-8">Memory</TabsTrigger>
                  </TabsList>
                </ScrollArea>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={toggleAiPanel}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <TabsContent value="preview" className="flex-1 overflow-hidden">
                <Preview 
                  openFiles={files || []}
                  projectId={projectId}
                />
              </TabsContent>
              <TabsContent value="assistant" className="flex-1 overflow-hidden">
                <ReplitAgentV2 
                  projectId={projectId} 
                  className="h-full"
                />
              </TabsContent>
              <TabsContent value="collaborate" className="flex-1 overflow-hidden">
                {user && <Collaboration 
                  projectId={projectId} 
                  fileId={selectedFile?.id || null} 
                  currentUser={user}
                  onToggle={() => {}}
                />}
              </TabsContent>
              <TabsContent value="resources" className="flex-1 overflow-hidden p-4">
                <ResourceMonitor projectId={projectId} />
              </TabsContent>
              <TabsContent value="presence" className="flex-1 overflow-hidden p-4">
                {user && <CollaborativePresence 
                  projectId={projectId} 
                  currentUser={{
                    id: user.id.toString(),
                    username: user.username || 'Anonymous',
                    avatar: user.profileImageUrl || undefined
                  }}
                />}
              </TabsContent>
              <TabsContent value="search" className="flex-1 overflow-hidden p-4">
                <ProjectSearch 
                  projectId={projectId} 
                  onFileSelect={(fileId) => {
                    const file = files?.find(f => f.id === fileId);
                    if (file) setSelectedFile(file);
                  }}
                />
              </TabsContent>
              <TabsContent value="stats" className="flex-1 overflow-hidden p-4">
                <ProjectStats projectId={projectId} />
              </TabsContent>
              <TabsContent value="packages" className="flex-1 overflow-hidden p-4">
                <PackageManager projectId={projectId} language="javascript" />
              </TabsContent>
              <TabsContent value="share" className="flex-1 overflow-hidden p-4">
                <ProjectSharing 
                  projectId={projectId} 
                  projectName={project?.name || 'Untitled'} 
                />
              </TabsContent>
              <TabsContent value="github" className="flex-1 overflow-hidden">
                <GitHubMCPPanel projectId={projectId} />
              </TabsContent>
              <TabsContent value="postgres" className="flex-1 overflow-hidden">
                <PostgreSQLMCPPanel projectId={projectId} />
              </TabsContent>
              <TabsContent value="memory" className="flex-1 overflow-hidden">
                <MemoryMCPPanel projectId={projectId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {/* File Upload Modal */}
        {showFileUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFileUpload(false)}>
            <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upload Files</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFileUpload(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <FileUploadDropzone 
                projectId={projectId} 
                onUploadComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
                }}
              />
            </div>
          </div>
        )}
        
        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcuts 
          open={showKeyboardShortcuts}
          onOpenChange={setShowKeyboardShortcuts}
          onSave={() => {
            if (selectedFile && unsavedChanges[selectedFile.id]) {
              setAutoSaveStatus('saving');
              saveCurrentFile();
            }
          }}
          onSearch={() => {
            setAiPanelVisible(true);
            setRightPanelTab('search');
          }}
          onToggleTerminal={toggleTerminal}
          onToggleAI={toggleAiPanel}
          onNewFile={() => {
            if (files && files.length > 0) {
              handleNewFile(null);
            }
          }}
          onRun={toggleProjectRunning}
        />
        
        {/* Collapsed Right Panel Toggle */}
        {!aiPanelVisible && (
          <Button
            variant="ghost" 
            className="fixed bottom-4 right-4 p-2 rounded-full shadow-md"
            onClick={toggleAiPanel}
          >
            <Sparkles className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProjectPage;