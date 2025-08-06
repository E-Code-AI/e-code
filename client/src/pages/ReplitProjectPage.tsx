import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Project, File } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';

// Components
import FileExplorer from '@/components/FileExplorer';
import CodeEditor from '@/components/CodeEditor';
import Terminal from '@/components/Terminal';
import { UnifiedAgentInterface } from '@/components/UnifiedAgentInterface';
import { ReplitAssistant } from '@/components/ReplitAssistant';
import { MobileAgentInterface } from '@/components/MobileAgentInterface';
import AdvancedAIPanel from '@/components/AdvancedAIPanel';
import { Button } from '@/components/ui/button';
import { ECodeLoading } from '@/components/ECodeLoading';
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { 
  Play, 
  Square, 
  MoreHorizontal,
  Users,
  MessageSquare,
  ChevronLeft,
  Settings,
  Key,
  Database,
  UserCheck,
  Plus,
  FileCode,
  X,
  Sparkles,
  Bot,
  Clock,
  Package,
  MessageCircle,
  Terminal as TerminalIcon,
  Globe,
  MoreVertical,
  Activity,
  Rocket,
  Home,
  Upload,
  Download,
  EyeOff,
  FileIcon,
  FolderIcon,
  Puzzle,
  Smartphone
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import components for mobile tabs
import { ReplitSecrets } from '@/components/ReplitSecrets';
import { ReplitDatabase } from '@/components/ReplitDatabase';
import { DatabaseManagement } from '@/components/DatabaseManagement';
import { SecretManagement } from '@/components/SecretManagement';
import { PreviewDevTools } from '@/components/PreviewDevTools';

// Import collaboration components
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { useYjsCollaboration } from '@/hooks/useYjsCollaboration';

// Import new feature components
import { CommentsPanel } from '@/components/CommentsPanel';
import { CheckpointsPanel } from '@/components/CheckpointsPanel';
import { TimeTrackingPanel } from '@/components/TimeTrackingPanel';
import { ScreenshotsPanel } from '@/components/ScreenshotsPanel';
import { TaskSummariesPanel } from '@/components/TaskSummariesPanel';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { ExtensionsMarketplace } from '@/components/ExtensionsMarketplace';
import { ConsolePanel } from '@/components/ConsolePanel';
import { LivePreview } from '@/components/LivePreview';
import { PreviewPanel } from '@/components/PreviewPanel';
import { EnhancedPreview } from '@/components/EnhancedPreview';
import { DeploymentPanel } from '@/components/DeploymentPanel';
import { ToolsDropdown } from '@/components/ToolsDropdown';

// Import critical new features
import { CheckpointManager } from '@/components/CheckpointManager';
import { EffortPricingDisplay } from '@/components/EffortPricingDisplay';

import { MobileAppDevelopment } from '@/components/MobileAppDevelopment';

// Import advanced UI components
import { ReplitForkGraph } from '@/components/ReplitForkGraph';
import { ReplitVersionControl } from '@/components/ReplitVersionControl';
import { ReplitPackageExplorer } from '@/components/ReplitPackageExplorer';
import { ReplitResourceMonitor } from '@/components/ReplitResourceMonitor';
import { ReplitDeploymentPipeline } from '@/components/ReplitDeploymentPipeline';

type MobileTab = 'files' | 'agent' | 'console' | 'preview' | 'secrets' | 'database' | 'auth';

const ReplitProjectPage = () => {
  const [matchProject, paramsProject] = useRoute('/project/:id');
  const [matchSlug, paramsSlug] = useRoute('/@:username/:projectname');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const projectId = matchProject && paramsProject?.id ? parseInt(paramsProject.id) : 0;
  const username = matchSlug && paramsSlug?.username ? paramsSlug.username : undefined;
  const projectSlug = matchSlug && paramsSlug?.projectname ? paramsSlug.projectname : undefined;
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
  const [projectRunning, setProjectRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [showAIChat, setShowAIChat] = useState(true); // Show AI chat by default
  const [showTerminal, setShowTerminal] = useState(false); // Hide terminal by default like Replit
  const [mobileTab, setMobileTab] = useState<MobileTab>('agent'); // Default to agent on mobile like Replit
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<'ai' | 'collaboration' | 'comments' | 'history' | 'extensions' | 'deployments' | 'shell' | 'database' | 'secrets' | 'workflows' | 'console' | 'authentication' | 'preview' | 'git' | 'ssh' | 'vnc' | 'threads' | 'object-storage' | 'problems' | 'security-scanner' | 'networking' | 'integrations' | 'user-settings' | 'fork-graph' | 'version-control' | 'package-explorer' | 'resource-monitor' | 'deployment-pipeline' | 'checkpoints' | 'time-tracking' | 'screenshots' | 'task-summaries' | 'effort-pricing' | 'agent-v2' | 'mobile-app'>('ai');
  const [aiMode, setAIMode] = useState<'agent' | 'advanced'>('agent'); // Default to agent mode
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const [openTools, setOpenTools] = useState<string[]>(['agent', 'preview']);
  const [leftPanelMode, setLeftPanelMode] = useState<'agent' | 'assistant'>('agent');
  const [showFileExplorer, setShowFileExplorer] = useState(true);

  // Initialize collaboration
  const collaboration = useYjsCollaboration({
    projectId: projectId || 0,
    fileId: selectedFile?.id || 0
  });

  // Check for agent and prompt parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const agentParam = urlParams.get('agent');
    const promptParam = urlParams.get('prompt');
    
    if (agentParam === 'true' && promptParam) {
      // When coming from dashboard, show AI agent with the prompt
      setShowAIChat(true);
      setAIMode('agent');
      // Store the prompt to pass to ReplitAgentChat
      window.sessionStorage.setItem(`agent-prompt-${projectId}`, decodeURIComponent(promptParam));
    }
  }, [projectId]);

  // Listen for preview messages from AI agent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'show-preview') {
        setRightPanelMode('preview');
        toast({
          title: "Preview Ready",
          description: "Your app preview is now available",
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [toast]);

  // Query for project details
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError 
  } = useQuery<Project>({
    queryKey: username && projectSlug 
      ? ['/api/users', username, 'projects', projectSlug] 
      : ['/api/projects', projectId],
    queryFn: async () => {
      if (!projectId && (!username || !projectSlug)) return Promise.reject(new Error('No project identifier provided'));
      
      const url = username && projectSlug
        ? `/api/users/${encodeURIComponent(username)}/projects/${encodeURIComponent(projectSlug)}`
        : `/api/projects/${projectId}`;
      
      const res = await apiRequest('GET', url);
      if (!res.ok) {
        if (res.status === 401) {
          // Redirect to login page for authentication
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
          throw new Error('Please log in to access this project');
        }
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await res.json();
          throw new Error(error.message || error.error || 'Failed to fetch project');
        } else {
          throw new Error(`Failed to fetch project (${res.status})`);
        }
      }
      return res.json();
    },
    enabled: !!projectId || (!!username && !!projectSlug),
  });

  // Query for project files
  const { 
    data: files, 
    isLoading: filesLoading, 
    error: filesError 
  } = useQuery<File[]>({
    queryKey: ['/api/projects', project?.id || projectId, 'files'],
    enabled: !!(project?.id || projectId),
  });

  // Mobile bottom navigation matching Replit's design
  const MobileBottomNav = () => {
    // Split tabs into primary and secondary for better mobile UX
    const primaryTabs = ['files', 'agent', 'console', 'preview'];
    const secondaryTabs = ['secrets', 'database', 'auth'];
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    
    return (
      <>
        <div className="bg-background border-t h-16 md:hidden">
          <div className="flex h-full">
            <button
              onClick={() => setMobileTab('files')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
                mobileTab === 'files' 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              )}
            >
              <FileCode className="h-5 w-5" />
              <span className="text-[10px] font-medium">Files</span>
            </button>

            <button
              onClick={() => setMobileTab('agent')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
                mobileTab === 'agent' 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              )}
            >
              <Bot className="h-5 w-5" />
              <span className="text-[10px] font-medium">Agent</span>
            </button>

            <button
              onClick={() => setMobileTab('console')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
                mobileTab === 'console' 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              )}
            >
              <TerminalIcon className="h-5 w-5" />
              <span className="text-[10px] font-medium">Console</span>
            </button>

            <button
              onClick={() => setMobileTab('preview')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
                mobileTab === 'preview' 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              )}
            >
              <Globe className="h-5 w-5" />
              <span className="text-[10px] font-medium">Preview</span>
            </button>

            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
                (secondaryTabs.includes(mobileTab as string) || showMoreMenu)
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              )}
            >
              <MoreVertical className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </div>

        {/* More menu popup */}
        {showMoreMenu && (
          <div className="absolute bottom-16 right-0 bg-background border rounded-lg shadow-lg p-2 m-2">
            <button
              onClick={() => {
                setMobileTab('secrets');
                setShowMoreMenu(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <Key className="h-4 w-4" />
              <span className="text-sm">Secrets</span>
            </button>
            <button
              onClick={() => {
                setMobileTab('database');
                setShowMoreMenu(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <Database className="h-4 w-4" />
              <span className="text-sm">Database</span>
            </button>
            <button
              onClick={() => {
                setMobileTab('auth');
                setShowMoreMenu(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <UserCheck className="h-4 w-4" />
              <span className="text-sm">Auth</span>
            </button>
          </div>
        )}
      </>
    );
  };

  // Mutation for saving file
  const saveFileMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await apiRequest('PATCH', `/api/files/${id}`, { content });
      if (!res.ok) throw new Error('Failed to save file');
      return res.json();
    },
    onSuccess: (_, variables) => {
      setUnsavedChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[variables.id];
        return newChanges;
      });
      toast({ title: "File saved" });
    },
  });

  // Mutation for running project
  const runProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project ID');
      const res = await apiRequest('POST', `/api/runtime/${projectId}/start`);
      if (!res.ok) throw new Error('Failed to run project');
      return res.json();
    },
    onSuccess: (data) => {
      setExecutionId(data.executionId);
      setProjectRunning(true);
      setShowTerminal(true);
    },
  });

  // Mutation for stopping project
  const stopProjectMutation = useMutation({
    mutationFn: async () => {
      if (!executionId) throw new Error('No execution ID');
      const res = await apiRequest('POST', `/api/runtime/${projectId}/stop`);
      if (!res.ok) throw new Error('Failed to stop project');
      return res.json();
    },
    onSuccess: () => {
      setProjectRunning(false);
      setExecutionId(undefined);
    },
  });

  // Mutation for creating files/folders
  const createFileMutation = useMutation({
    mutationFn: async ({ projectId, name, content, isFolder, parentId }: {
      projectId: number;
      name: string;
      content: string;
      isFolder: boolean;
      parentId?: number | null;
    }) => {
      const res = await apiRequest('POST', `/api/files/${projectId}`, {
        name,
        content,
        isDirectory: isFolder,
        parentId
      });
      if (!res.ok) throw new Error('Failed to create file/folder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
      toast({
        title: 'Success',
        description: 'File/folder created successfully',
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (file.isDirectory) return;
    setSelectedFile(file);
  };

  // Handle file content change
  const handleFileContentChange = (fileId: number, content: string) => {
    setUnsavedChanges(prev => ({ ...prev, [fileId]: content }));
  };

  // Handle apply code from assistant
  const handleApplyCode = async (code: string, fileName?: string) => {
    try {
      let targetFile = selectedFile;
      
      // If a specific file name is provided, find or create it
      if (fileName && fileName !== selectedFile?.name) {
        const existingFile = files?.find(f => f.name === fileName);
        if (existingFile) {
          targetFile = existingFile;
          setSelectedFile(existingFile);
        } else {
          // Create new file
          const response = await apiRequest('POST', `/api/files/${projectId}`, {
            name: fileName,
            content: code
          });
          
          if (response.ok) {
            const newFile = await response.json();
            await queryClient.invalidateQueries({ queryKey: ['/api/files', projectId] });
            setSelectedFile(newFile);
            toast({
              title: 'File Created',
              description: `Created ${fileName} and applied code`
            });
            return;
          }
        }
      }
      
      if (!targetFile) {
        toast({
          title: 'No File Selected',
          description: 'Please select a file first',
          variant: 'destructive'
        });
        return;
      }
      
      // Apply code to the file
      setUnsavedChanges(prev => ({
        ...prev,
        [targetFile.id]: code
      }));
      
      // Auto-save the file
      const response = await apiRequest('PATCH', `/api/files/${targetFile.id}`, {
        content: code
      });
      
      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
        setUnsavedChanges(prev => {
          const updated = { ...prev };
          delete updated[targetFile.id];
          return updated;
        });
        
        toast({
          title: 'Code Applied',
          description: `Applied code to ${targetFile.name}`
        });
      }
    } catch (error) {
      console.error('Error applying code:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply code',
        variant: 'destructive'
      });
    }
  };

  // Handle file save
  const handleFileSave = async () => {
    if (!selectedFile || !unsavedChanges[selectedFile.id]) return;
    await saveFileMutation.mutateAsync({
      id: selectedFile.id,
      content: unsavedChanges[selectedFile.id],
    });
  };

  // Auto-save effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleFileSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, unsavedChanges]);

  if (projectLoading || filesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <ECodeLoading size="lg" text="Loading project..." />
      </div>
    );
  }

  if (projectError || filesError || !project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading project</h2>
          <p className="text-muted-foreground mb-4">
            {projectError?.message || filesError?.message || 'Project not found'}
          </p>
          <Button onClick={() => navigate('/projects')} variant="outline">
            Back to projects
          </Button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    // Mobile layout matching Replit's exact design
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Mobile header - fixed height */}
        <div className="border-b h-14 flex items-center px-4 gap-3 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate('/projects')}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 flex items-center justify-center">
            <span className="font-medium">{project?.name || 'ReplitClone'}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              // Settings or more options
            }}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile content area - properly constrained between header and bottom nav */}
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3.5rem - 4rem)' }}>
          {mobileTab === 'secrets' && (
            <div className="h-full overflow-auto">
              <ReplitSecrets projectId={projectId} />
            </div>
          )}
          
          {mobileTab === 'database' && (
            <div className="h-full overflow-auto">
              <ReplitDatabase projectId={projectId} />
            </div>
          )}
          
          {mobileTab === 'auth' && (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Manage authentication settings for your app
                </p>
              </div>
            </div>
          )}
          
          {mobileTab === 'agent' && (
            <div className="h-full overflow-hidden">
              <MobileAgentInterface projectId={projectId || 0} />
            </div>
          )}

          {mobileTab === 'files' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-auto">
                {selectedFile ? (
                  <CodeEditor
                    file={{
                      ...selectedFile,
                      content: unsavedChanges[selectedFile.id] || selectedFile.content || ''
                    }}
                    onChange={(content) => handleFileContentChange(selectedFile.id, content)}
                    collaboration={collaboration}
                  />
                ) : (
                  <FileExplorer
                    files={files || []}
                    selectedFile={selectedFile || undefined}
                    onFileSelect={handleFileSelect}
                  />
                )}
              </div>
            </div>
          )}

          {mobileTab === 'console' && (
            <div className="h-full overflow-hidden">
              <ConsolePanel projectId={projectId || 0} />
            </div>
          )}

          {mobileTab === 'preview' && (
            <div className="h-full overflow-hidden">
              <PreviewPanel 
                projectId={projectId || 0} 
                projectUrl={executionId ? `https://localhost:5000/preview/${executionId}` : undefined}
              />
            </div>
          )}
        </div>

        {/* Mobile bottom navigation - fixed position */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <MobileBottomNav />
        </div>
      </div>
    );
  }

  // Desktop layout - Replit-style 4-column layout
  return (
    <div className="h-screen flex bg-background">
      {/* Column 1: Left Sidebar - Icon Navigation (max 52px = ~1.3cm) */}
      <div className="w-[52px] border-r bg-background flex flex-col items-center py-2">
        {/* Home Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/projects')}
          className="h-10 w-10 mb-2"
          title="Home"
        >
          <Home className="h-5 w-5" />
        </Button>
        
        {/* Toggle Files Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowFileExplorer(!showFileExplorer)}
          className="h-10 w-10 mb-4"
          title={showFileExplorer ? "Hide Files" : "Show Files"}
        >
          <FileCode className="h-5 w-5" />
        </Button>
        
        <div className="h-px w-8 bg-border mb-4" />
        
        {/* Main Tools - Always visible in sidebar */}
        <Button
          variant={leftPanelMode === 'agent' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setLeftPanelMode('agent')}
          className="h-10 w-10 mb-2"
          title="AI Agent"
        >
          <Bot className="h-5 w-5" />
        </Button>
        
        <Button
          variant={leftPanelMode === 'assistant' ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setLeftPanelMode('assistant')}
          className="h-10 w-10 mb-2"
          title="AI Assistant"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
        
        <Button
          variant={openTools.includes('preview') ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => {
            if (!openTools.includes('preview')) {
              setOpenTools([...openTools, 'preview']);
            }
            setRightPanelMode('preview');
          }}
          className="h-10 w-10 mb-2"
          title="Preview"
        >
          <Globe className="h-5 w-5" />
        </Button>
        
        {/* Other open tabs as icons */}
        <div className="flex-1 flex flex-col items-center">
          {openTools.filter(tool => !['preview', 'agent', 'assistant'].includes(tool)).slice(0, 5).map((tool) => {
            const getIcon = (toolName: string) => {
              switch (toolName) {
                case 'console': return <TerminalIcon className="h-5 w-5" />;
                case 'database': return <Database className="h-5 w-5" />;
                case 'secrets': return <Key className="h-5 w-5" />;
                case 'deployment': return <Rocket className="h-5 w-5" />;
                case 'shell': return <TerminalIcon className="h-5 w-5" />;
                default: return <FileCode className="h-5 w-5" />;
              }
            };
            
            return (
              <Button
                key={tool}
                variant={rightPanelMode === tool ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setRightPanelMode(tool as any)}
                className="h-10 w-10 mb-2"
                title={tool}
              >
                {getIcon(tool)}
              </Button>
            );
          })}
        </div>
        
        {/* More Tools Dropdown */}
        {openTools.length > 8 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end">
              <DropdownMenuItem onClick={() => {
                if (!openTools.includes('console')) setOpenTools([...openTools, 'console']);
                setRightPanelMode('console');
              }}>
                <TerminalIcon className="h-4 w-4 mr-2" />
                Console
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!openTools.includes('database')) setOpenTools([...openTools, 'database']);
                setRightPanelMode('database');
              }}>
                <Database className="h-4 w-4 mr-2" />
                Database
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!openTools.includes('secrets')) setOpenTools([...openTools, 'secrets']);
                setRightPanelMode('secrets');
              }}>
                <Key className="h-4 w-4 mr-2" />
                Secrets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (!openTools.includes('deployment')) setOpenTools([...openTools, 'deployment']);
                setRightPanelMode('deployments');
              }}>
                <Rocket className="h-4 w-4 mr-2" />
                Deployments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Column 2: File Explorer (max 160px = ~4cm) */}
      {showFileExplorer && (
        <div className="w-[160px] border-r flex flex-col">
          <div className="h-12 border-b flex items-center justify-between px-2">
            <span className="text-sm font-medium">Files</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  const fileName = prompt('Enter file name:');
                  if (fileName && projectId) {
                    createFileMutation.mutate({
                      projectId,
                      name: fileName,
                      content: '',
                      isFolder: false,
                      parentId: null
                    });
                  }
                }}>
                  <FileIcon className="h-4 w-4 mr-2" />
                  New file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const folderName = prompt('Enter folder name:');
                  if (folderName && projectId) {
                    createFileMutation.mutate({
                      projectId,
                      name: folderName,
                      content: '',
                      isFolder: true,
                      parentId: null
                    });
                  }
                }}>
                  <FolderIcon className="h-4 w-4 mr-2" />
                  New folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.onchange = async (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && projectId) {
                      for (const file of Array.from(files)) {
                        const content = await file.text();
                        createFileMutation.mutate({
                          projectId,
                          name: file.name,
                          content,
                          isFolder: false,
                          parentId: null
                        });
                      }
                    }
                  };
                  input.click();
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "Upload folder",
                    description: "Folder upload is not yet implemented"
                  });
                }}>
                  <FolderIcon className="h-4 w-4 mr-2" />
                  Upload folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  if (project) {
                    window.open(`/api/export/${projectId}/zip`, '_blank');
                  }
                }}>
                  <Download className="h-4 w-4 mr-2" />
                  Download as zip
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  toast({
                    title: "Hidden files",
                    description: "Hidden file toggling coming soon"
                  });
                }}>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide hidden files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowFileExplorer(false)}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Collapse all
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  setSelectedFile(undefined);
                  toast({
                    title: "Files closed",
                    description: "All open files have been closed"
                  });
                }}>
                  <X className="h-4 w-4 mr-2" />
                  Close files
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex-1 overflow-auto">
            <FileExplorer
              files={files || []}
              selectedFile={selectedFile || undefined}
              onFileSelect={handleFileSelect}
            />
          </div>
        </div>
      )}

      {/* Column 3: AI Agent/Assistant Panel */}
      <div className="w-[400px] border-r flex flex-col">
        <div className="h-12 border-b flex items-center px-4 gap-2">
          <h2 className="text-sm font-medium flex-1">
            {leftPanelMode === 'agent' ? 'AI Agent' : 'AI Assistant'}
          </h2>
          <Button
            onClick={() => projectRunning ? stopProjectMutation.mutate() : runProjectMutation.mutate()}
            disabled={runProjectMutation.isPending || stopProjectMutation.isPending}
            size="sm"
            className={cn(
              "gap-2",
              projectRunning ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
            )}
          >
            {projectRunning ? (
              <>
                <Square className="h-3 w-3" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-3 w-3" />
                Run
              </>
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          {leftPanelMode === 'agent' ? (
            <UnifiedAgentInterface projectId={projectId} />
          ) : (
            <ReplitAssistant 
              projectId={projectId}
              currentFile={selectedFile?.name}
              selectedCode={selectedCode}
              onApplyCode={handleApplyCode}
            />
          )}
        </div>
      </div>

      {/* Column 4: Main Content Area (Preview, Console, Database, etc.) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar */}
        <div className="h-12 border-b flex items-center">
          <div className="flex-1 flex items-center min-w-0">
            <div className="flex items-center overflow-x-auto scrollbar-thin">
              {openTools.filter(tool => tool !== 'agent' && tool !== 'assistant').map((tool) => {
                const getIcon = (toolName: string) => {
                  switch (toolName) {
                    case 'preview': return <Globe className="h-4 w-4" />;
                    case 'console': return <TerminalIcon className="h-4 w-4" />;
                    case 'database': return <Database className="h-4 w-4" />;
                    case 'deployments': return <Rocket className="h-4 w-4" />;
                    case 'secrets': return <Key className="h-4 w-4" />;
                    case 'shell': return <TerminalIcon className="h-4 w-4" />;
                    case 'collaboration': return <Users className="h-4 w-4" />;
                    case 'comments': return <MessageSquare className="h-4 w-4" />;
                    case 'history': return <Clock className="h-4 w-4" />;
                    case 'extensions': return <Puzzle className="h-4 w-4" />;
                    default: return <FileCode className="h-4 w-4" />;
                  }
                };
                
                const getLabel = (toolName: string) => {
                  return toolName.charAt(0).toUpperCase() + toolName.slice(1);
                };
                
                return (
                  <div
                    key={tool}
                    className={cn(
                      "relative flex items-center gap-2 px-3 py-2 cursor-pointer border-b-2 transition-colors",
                      rightPanelMode === tool
                        ? "bg-accent text-accent-foreground border-primary"
                        : "border-transparent hover:bg-accent/50"
                    )}
                    onClick={() => setRightPanelMode(tool as any)}
                  >
                    {getIcon(tool)}
                    <span className="text-sm">{getLabel(tool)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenTools(openTools.filter(t => t !== tool));
                        if (rightPanelMode === tool && openTools.length > 1) {
                          const nextTool = openTools.find(t => t !== tool && t !== 'agent' && t !== 'assistant');
                          if (nextTool) setRightPanelMode(nextTool as any);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
              
              {/* Add new tab button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-2">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('preview')) {
                      setOpenTools([...openTools, 'preview']);
                      setRightPanelMode('preview');
                    } else {
                      setRightPanelMode('preview');
                    }
                  }}>
                    <Globe className="h-4 w-4 mr-2" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('console')) {
                      setOpenTools([...openTools, 'console']);
                      setRightPanelMode('console');
                    } else {
                      setRightPanelMode('console');
                    }
                  }}>
                    <TerminalIcon className="h-4 w-4 mr-2" />
                    Console
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('database')) {
                      setOpenTools([...openTools, 'database']);
                      setRightPanelMode('database');
                    } else {
                      setRightPanelMode('database');
                    }
                  }}>
                    <Database className="h-4 w-4 mr-2" />
                    Database
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('deployments')) {
                      setOpenTools([...openTools, 'deployments']);
                      setRightPanelMode('deployments');
                    } else {
                      setRightPanelMode('deployments');
                    }
                  }}>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deployments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('secrets')) {
                      setOpenTools([...openTools, 'secrets']);
                      setRightPanelMode('secrets');
                    } else {
                      setRightPanelMode('secrets');
                    }
                  }}>
                    <Key className="h-4 w-4 mr-2" />
                    Secrets
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('comments')) {
                      setOpenTools([...openTools, 'comments']);
                      setRightPanelMode('comments');
                    } else {
                      setRightPanelMode('comments');
                    }
                  }}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('checkpoints')) {
                      setOpenTools([...openTools, 'checkpoints']);
                      setRightPanelMode('checkpoints');
                    } else {
                      setRightPanelMode('checkpoints');
                    }
                  }}>
                    <Clock className="h-4 w-4 mr-2" />
                    Checkpoints
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('time-tracking')) {
                      setOpenTools([...openTools, 'time-tracking']);
                      setRightPanelMode('time-tracking');
                    } else {
                      setRightPanelMode('time-tracking');
                    }
                  }}>
                    <Activity className="h-4 w-4 mr-2" />
                    Time Tracking
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('screenshots')) {
                      setOpenTools([...openTools, 'screenshots']);
                      setRightPanelMode('screenshots');
                    } else {
                      setRightPanelMode('screenshots');
                    }
                  }}>
                    <FileIcon className="h-4 w-4 mr-2" />
                    Screenshots
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('task-summaries')) {
                      setOpenTools([...openTools, 'task-summaries']);
                      setRightPanelMode('task-summaries');
                    } else {
                      setRightPanelMode('task-summaries');
                    }
                  }}>
                    <FileCode className="h-4 w-4 mr-2" />
                    Task Summaries
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('agent-v2')) {
                      setOpenTools([...openTools, 'agent-v2']);
                      setRightPanelMode('agent-v2');
                    } else {
                      setRightPanelMode('agent-v2');
                    }
                  }}>
                    <Bot className="h-4 w-4 mr-2" />
                    Agent v2 (Claude 4.0)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('effort-pricing')) {
                      setOpenTools([...openTools, 'effort-pricing']);
                      setRightPanelMode('effort-pricing');
                    } else {
                      setRightPanelMode('effort-pricing');
                    }
                  }}>
                    <Activity className="h-4 w-4 mr-2" />
                    Effort Pricing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!openTools.includes('mobile-app')) {
                      setOpenTools([...openTools, 'mobile-app']);
                      setRightPanelMode('mobile-app');
                    } else {
                      setRightPanelMode('mobile-app');
                    }
                  }}>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile App Development
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {rightPanelMode === 'preview' && (
            <EnhancedPreview projectId={projectId} />
          )}
          {rightPanelMode === 'console' && (
            <ConsolePanel
              projectId={projectId}
            />
          )}
          {rightPanelMode === 'database' && (
            <DatabaseManagement projectId={projectId.toString()} />
          )}
          {rightPanelMode === 'deployments' && (
            <DeploymentPanel projectId={projectId} />
          )}
          {rightPanelMode === 'secrets' && (
            <SecretManagement projectId={projectId.toString()} />
          )}
          {rightPanelMode === 'shell' && (
            <Terminal projectId={projectId} />
          )}
          {rightPanelMode === 'collaboration' && (
            <CollaborationPanel 
              projectId={projectId}
              onFollowUser={(userId) => collaboration.followUser(parseInt(userId))}
            />
          )}
          {rightPanelMode === 'comments' && (
            <CommentsPanel projectId={projectId} />
          )}
          {rightPanelMode === 'checkpoints' && (
            <CheckpointManager projectId={projectId} />
          )}
          {rightPanelMode === 'time-tracking' && (
            <TimeTrackingPanel projectId={projectId} userId={user?.id || 0} />
          )}
          {rightPanelMode === 'screenshots' && (
            <ScreenshotsPanel projectId={projectId} />
          )}
          {rightPanelMode === 'task-summaries' && (
            <TaskSummariesPanel projectId={projectId} />
          )}
          {rightPanelMode === 'history' && (
            <HistoryTimeline projectId={projectId} />
          )}
          {rightPanelMode === 'extensions' && (
            <ExtensionsMarketplace projectId={projectId} />
          )}
          {rightPanelMode === 'fork-graph' && (
            <ReplitForkGraph projectId={projectId} />
          )}
          {rightPanelMode === 'version-control' && (
            <ReplitVersionControl projectId={projectId} />
          )}
          {rightPanelMode === 'package-explorer' && (
            <ReplitPackageExplorer projectId={projectId} />
          )}
          {rightPanelMode === 'resource-monitor' && (
            <ReplitResourceMonitor projectId={projectId} />
          )}
          {rightPanelMode === 'deployment-pipeline' && (
            <ReplitDeploymentPipeline projectId={projectId} />
          )}
          {rightPanelMode === 'effort-pricing' && (
            <EffortPricingDisplay projectId={projectId} />
          )}

          {rightPanelMode === 'mobile-app' && (
            <MobileAppDevelopment projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReplitProjectPage;
