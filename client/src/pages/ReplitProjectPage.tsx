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
import { ReplitAgentChat } from '@/components/ReplitAgentChat';
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
  Bot
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

// Import collaboration components
import { CollaborationPanel } from '@/components/CollaborationPanel';
import { useYjsCollaboration } from '@/hooks/useYjsCollaboration';

type MobileTab = 'files' | 'agent' | 'secrets' | 'database' | 'auth';

const ReplitProjectPage = () => {
  const [, params] = useRoute('/project/:id');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const projectId = params?.id ? parseInt(params.id) : 0;
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [unsavedChanges, setUnsavedChanges] = useState<Record<number, string>>({});
  const [projectRunning, setProjectRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [showAIChat, setShowAIChat] = useState(true); // Show AI chat by default
  const [showTerminal, setShowTerminal] = useState(false); // Hide terminal by default like Replit
  const [mobileTab, setMobileTab] = useState<MobileTab>('agent'); // Default to agent on mobile like Replit
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [aiMode, setAIMode] = useState<'agent' | 'advanced'>('agent'); // Default to agent mode

  // Initialize collaboration
  const collaboration = useYjsCollaboration({
    projectId: projectId || 0,
    fileId: selectedFile?.id || 0
  });

  // Query for project details
  const { 
    data: project, 
    isLoading: projectLoading, 
    error: projectError 
  } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  // Query for project files
  const { 
    data: files, 
    isLoading: filesLoading, 
    error: filesError 
  } = useQuery<File[]>({
    queryKey: ['/api/projects', projectId, 'files'],
    enabled: !!projectId,
  });

  // Mobile bottom navigation matching Replit's design
  const MobileBottomNav = () => (
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
          onClick={() => setMobileTab('secrets')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
            mobileTab === 'secrets' 
              ? 'text-primary' 
              : 'text-muted-foreground'
          )}
        >
          <Key className="h-5 w-5" />
          <span className="text-[10px] font-medium">Secrets</span>
        </button>

        <button
          onClick={() => setMobileTab('database')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
            mobileTab === 'database' 
              ? 'text-primary' 
              : 'text-muted-foreground'
          )}
        >
          <Database className="h-5 w-5" />
          <span className="text-[10px] font-medium">Database</span>
        </button>

        <button
          onClick={() => setMobileTab('auth')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors py-2",
            mobileTab === 'auth' 
              ? 'text-primary' 
              : 'text-muted-foreground'
          )}
        >
          <UserCheck className="h-5 w-5" />
          <span className="text-[10px] font-medium">Auth</span>
        </button>
      </div>
    </div>
  );

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
      const res = await apiRequest('POST', `/api/projects/${projectId}/run`);
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
      const res = await apiRequest('POST', `/api/projects/${projectId}/stop`, { executionId });
      if (!res.ok) throw new Error('Failed to stop project');
      return res.json();
    },
    onSuccess: () => {
      setProjectRunning(false);
      setExecutionId(undefined);
    },
  });

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (file.isFolder) return;
    setSelectedFile(file);
  };

  // Handle file content change
  const handleFileContentChange = (fileId: number, content: string) => {
    setUnsavedChanges(prev => ({ ...prev, [fileId]: content }));
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

        {/* Mobile content area - takes remaining space minus bottom nav */}
        <div className="flex-1 overflow-hidden" style={{ paddingBottom: '64px' }}>
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
              <ReplitAgentChat projectId={projectId || 0} />
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
        </div>

        {/* Mobile bottom navigation - fixed position */}
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <MobileBottomNav />
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/projects')}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 flex items-center gap-2">
          <h1 className="text-sm font-medium truncate">{project.name}</h1>
        </div>

        <div className="flex items-center gap-2">
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

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAIChat(!showAIChat)}
            className="h-8 w-8"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          {collaboration.collaborators.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCollaboration(!showCollaboration)}
              className="h-8 w-8 relative"
            >
              <Users className="h-4 w-4" />
              {collaboration.collaborators.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {collaboration.collaborators.length}
                </span>
              )}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Users className="h-4 w-4 mr-2" />
                Invite
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* File Explorer */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full overflow-auto">
              <FileExplorer
                files={files || []}
                selectedFile={selectedFile || undefined}
                onFileSelect={handleFileSelect}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Code Editor */}
          <ResizablePanel defaultSize={showAIChat ? 50 : 80}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={showTerminal ? 70 : 100}>
                <div className="h-full overflow-hidden">
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
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Select a file to edit
                    </div>
                  )}
                </div>
              </ResizablePanel>

              {showTerminal && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                    <Terminal 
                      projectId={projectId || undefined}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* AI Panel */}
          {showAIChat && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full overflow-hidden flex flex-col">
                  <Tabs value={aiMode} onValueChange={(value) => setAIMode(value as 'agent' | 'advanced')} className="h-full flex flex-col">
                    <div className="border-b px-4 py-2">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="agent" className="text-sm">
                          <Bot className="h-4 w-4 mr-2" />
                          AI Agent
                        </TabsTrigger>
                        <TabsTrigger value="advanced" className="text-sm">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Advanced AI
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="agent" className="flex-1 mt-0">
                      <ReplitAgentChat
                        projectId={projectId || 0}
                      />
                    </TabsContent>
                    <TabsContent value="advanced" className="flex-1 mt-0">
                      <AdvancedAIPanel
                        projectId={projectId.toString()}
                        selectedCode={selectedFile?.content || ''}
                        selectedLanguage={project?.data?.language || 'javascript'}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </ResizablePanel>
            </>
          )}

          {/* Collaboration Panel */}
          {showCollaboration && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full overflow-hidden">
                  <CollaborationPanel
                    collaborators={collaboration.collaborators}
                    followingUserId={collaboration.followingUserId}
                    onFollowUser={collaboration.followUser}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default ReplitProjectPage;