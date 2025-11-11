import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Project, File } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import TopNavbar from "@/components/TopNavbar";
import { ReplitEditorLayout } from "@/components/editor/ReplitEditorLayout";
import { ReplitFileSidebar } from "@/components/editor/ReplitFileSidebar";
import { ReplitCodeEditor } from "@/components/editor/ReplitCodeEditor";
import { ReplitAgent } from "@/components/ReplitAgent";
import { WebPreview } from "@/components/WebPreview";
import { ReplitConsole } from "@/components/editor/ReplitConsole";
import { ReplitDB } from "@/components/ReplitDB";
import { NixConfig } from "@/components/NixConfig";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { Bot, Database, Globe, Package } from "lucide-react";

type EditorProps = {
  projectId?: string | null;
  initialProject?: Project | null;
};

export default function Editor(props: EditorProps = {}) {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const agentRef = useRef<any>(null);
  const hasStartedAgent = useRef(false);

  const resolvedProjectId = props.projectId ?? id ?? null;
  const initialProject = props.initialProject ?? null;

  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightPanel, setActiveRightPanel] = useState<string | null>("preview");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const [isProjectRunning, setIsProjectRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | undefined>();
  const [initialAgentPrompt, setInitialAgentPrompt] = useState<string | null>(null);

  const { data: project, isLoading: isProjectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${resolvedProjectId}`],
    enabled: !!resolvedProjectId && !!user,
    initialData:
      initialProject &&
      resolvedProjectId &&
      initialProject.id === resolvedProjectId
        ? initialProject
        : undefined,
  });

  const { data: files = [], isLoading: isFilesLoading } = useQuery<File[]>({
    queryKey: [`/api/projects/${resolvedProjectId}/files`],
    enabled: !!resolvedProjectId && !!user,
  });

  // Check for agent auto-start from URL params or sessionStorage (Vibe flow)
  useEffect(() => {
    if (!hasStartedAgent.current && user && resolvedProjectId) {
      const urlParams = new URLSearchParams(window.location.search);
      const isAgent = urlParams.get('agent') === 'true';
      const promptFromUrl = urlParams.get('prompt');
      
      // Check sessionStorage for prompt from Dashboard/Workflow (Vibe creation flow)
      const promptFromSession = window.sessionStorage.getItem(`agent-prompt-${resolvedProjectId}`);
      
      // Determine initial prompt source and handle encoding correctly
      let initialPrompt: string | null = null;
      if (promptFromUrl) {
        // URL params are percent-encoded, must decode
        try {
          initialPrompt = decodeURIComponent(promptFromUrl);
        } catch (e) {
          console.error('Failed to decode URL prompt:', e);
          initialPrompt = promptFromUrl; // Fallback to raw value
        }
      } else if (promptFromSession) {
        // SessionStorage values are NOT encoded, use directly
        initialPrompt = promptFromSession;
      }
      
      if (isAgent && initialPrompt) {
        // Open the agent panel
        setActiveRightPanel('agent');
        setRightPanelOpen(true);
        setInitialAgentPrompt(initialPrompt);
        hasStartedAgent.current = true;
        
        // Clean up sessionStorage to prevent re-trigger
        if (promptFromSession) {
          window.sessionStorage.removeItem(`agent-prompt-${resolvedProjectId}`);
        }
        
        // Clean up the URL to remove the query parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    }
  }, [user, resolvedProjectId]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setActiveFileId(null);
      return;
    }

    if (activeFileId) {
      const stillExists = files.some(file => file.id === activeFileId);
      if (!stillExists) {
        setActiveFileId(null);
      }
      return;
    }

    const firstFile = files.find(file => !file.isDirectory);
    if (firstFile) {
      setActiveFileId(firstFile.id);
    }
  }, [files, activeFileId]);

  const activeFile = useMemo(
    () => files.find(file => file.id === activeFileId),
    [files, activeFileId]
  );

  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number, content: string }) => {
      return await apiRequest("PATCH", `/api/files/${fileId}`, { content });
    },
    onSuccess: (data) => {
      if (!resolvedProjectId) return;
      queryClient.setQueryData<File[]>([`/api/projects/${resolvedProjectId}/files`], (old) => {
        if (!old) return old;
        return old.map(file => file.id === data.id ? { ...file, content: data.content } : file);
      });
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

  const createFileMutation = useMutation({
    mutationFn: async ({ name, isFolder, parentId }: { name: string, isFolder: boolean, parentId?: number | null }) => {
      if (!resolvedProjectId) {
        throw new Error("Project is not available for file creation");
      }
      return await apiRequest("POST", `/api/files/${resolvedProjectId}`, {
        name,
        isFolder,
        parentId: parentId ?? null,
        content: isFolder ? null : "",
      });
    },
    onSuccess: (data) => {
      if (!resolvedProjectId) return;
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${resolvedProjectId}/files`] });
      toast({
        title: data.isFolder ? "Folder created" : "File created",
        description: `${data.name} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/files/${fileId}`);
      return fileId;
    },
    onSuccess: (fileId) => {
      if (!resolvedProjectId) return;
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${resolvedProjectId}/files`] });
      if (activeFileId === fileId) {
        setActiveFileId(null);
      }
      toast({
        title: "Deleted successfully",
        description: "The item has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, name }: { fileId: number, name: string }) => {
      return await apiRequest("PATCH", `/api/files/${fileId}`, { name });
    },
    onSuccess: (data) => {
      if (!resolvedProjectId) return;
      queryClient.setQueryData<File[]>([`/api/projects/${resolvedProjectId}/files`], (old) => {
        if (!old) return old;
        return old.map(file => file.id === data.id ? { ...file, name: data.name } : file);
      });
      toast({
        title: "File renamed",
        description: `${data.name} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rename",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    const handleToggleFiles = () => setLeftPanelOpen(prev => !prev);
    const handleToggleTerminal = () => setBottomPanelOpen(prev => !prev);
    const handleOpenPackages = () => {
      setActiveRightPanel("nix");
      setRightPanelOpen(true);
    };
    const handleRunProject = () => {
      setIsProjectRunning(true);
      const newExecutionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setExecutionId(newExecutionId);
      setTimeout(() => setIsProjectRunning(false), 2000);
    };

    window.addEventListener("toggle-files", handleToggleFiles as any);
    window.addEventListener("toggle-terminal", handleToggleTerminal as any);
    window.addEventListener("open-packages", handleOpenPackages as any);
    window.addEventListener("run-project", handleRunProject as any);

    return () => {
      window.removeEventListener("toggle-files", handleToggleFiles as any);
      window.removeEventListener("toggle-terminal", handleToggleTerminal as any);
      window.removeEventListener("open-packages", handleOpenPackages as any);
      window.removeEventListener("run-project", handleRunProject as any);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Checking your session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Sign in required</h2>
          <p className="text-muted-foreground">
            Log in to access your workspace and edit files.
          </p>
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            onClick={() => (window.location.href = "/login")}
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  const handleFileSelect = (file: File) => {
    if (file.isDirectory) return;
    setActiveFileId(file.id);
  };

  const handleFileUpdate = (fileId: number, content: string) => {
    setSelectedCode(undefined);
    saveFileMutation.mutate({ fileId, content });
  };

  const handleFileCreate = (name: string, isFolder: boolean, parentId?: number) => {
    createFileMutation.mutate({ name, isFolder, parentId: parentId ?? null });
  };

  const handleFileDelete = (fileId: number) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleFileRename = (fileId: number, newName: string) => {
    renameFileMutation.mutate({ fileId, name: newName });
  };

  const handleCommandPaletteOpen = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  const handleKeyboardShortcutsOpen = () => {
    setShowKeyboardShortcuts(true);
  };

  const handleDatabaseOpen = () => {
    setActiveRightPanel("database");
    setRightPanelOpen(true);
  };

  const handleNixConfigOpen = () => {
    setActiveRightPanel("nix");
    setRightPanelOpen(true);
  };

  const handleCollaborationOpen = () => {
    setActiveRightPanel("agent");
    setRightPanelOpen(true);
  };

  const handlePreviewToggle = () => {
    if (!rightPanelOpen) {
      setRightPanelOpen(true);
      setActiveRightPanel("preview");
      return;
    }

    if (activeRightPanel !== "preview") {
      setActiveRightPanel("preview");
      return;
    }

    setRightPanelOpen(false);
    setActiveRightPanel(null);
  };

  const handleConsoleToggle = () => {
    setBottomPanelOpen((prev) => !prev);
  };

  const activeProjectId = project?.id ?? resolvedProjectId;

  const rightPanels = useMemo(() => {
    const panels: any[] = [
      {
        id: "preview",
        title: "Preview",
        icon: <Globe className="h-3.5 w-3.5" />,
        content: activeProjectId ? (
          <WebPreview
            projectId={activeProjectId as any}
            isRunning={isProjectRunning}
            className="h-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Project preview unavailable
          </div>
        )
      }
    ];

    if (activeProjectId) {
      panels.push({
        id: "agent",
        title: "Agent",
        icon: <Bot className="h-3.5 w-3.5" />,
        content: (
          <div className="h-full overflow-hidden" data-testid="agent-panel">
            <ReplitAgent
              projectId={activeProjectId as any}
              selectedFile={activeFile?.name}
              selectedCode={selectedCode}
              className="h-full"
              initialPrompt={initialAgentPrompt}
            />
          </div>
        )
      });

      panels.push({
        id: "database",
        title: "Database",
        icon: <Database className="h-3.5 w-3.5" />,
        content: (
          <div className="h-full overflow-hidden">
            <ReplitDB projectId={activeProjectId as any} className="h-full" />
          </div>
        )
      });

      panels.push({
        id: "nix",
        title: "Packages",
        icon: <Package className="h-3.5 w-3.5" />,
        content: (
          <div className="h-full overflow-auto p-4">
            <NixConfig projectId={activeProjectId as any} />
          </div>
        )
      });
    }

    return panels;
  }, [project, activeProjectId, activeFile, selectedCode, isProjectRunning, initialAgentPrompt]);

  const bottomPanel = activeProjectId ? (
    <ReplitConsole
      projectId={activeProjectId as any}
      isRunning={isProjectRunning}
      executionId={executionId}
      className="h-full"
    />
  ) : (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      Open a project to view console output
    </div>
  );

  if (isProjectLoading || isFilesLoading) {
    return (
      <div className="h-full flex flex-col">
        <TopNavbar project={project} activeFile={activeFile} isLoading={true} />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TopNavbar
        project={project}
        activeFile={activeFile}
        isLoading={isProjectLoading}
        onNixConfigOpen={handleNixConfigOpen}
        onCommandPaletteOpen={handleCommandPaletteOpen}
        onKeyboardShortcutsOpen={handleKeyboardShortcutsOpen}
        onDatabaseOpen={handleDatabaseOpen}
        onCollaborationOpen={handleCollaborationOpen}
        onToggleFiles={() => setLeftPanelOpen(prev => !prev)}
        onTogglePreview={handlePreviewToggle}
        onToggleConsole={handleConsoleToggle}
        filesOpen={leftPanelOpen}
        previewOpen={rightPanelOpen && activeRightPanel === "preview"}
        consoleOpen={bottomPanelOpen}
      />

      <ReplitEditorLayout
        files={files}
        activeFileId={activeFileId ?? undefined}
        onFileSelect={handleFileSelect}
        onFileCreate={handleFileCreate}
        onFileDelete={handleFileDelete}
        onFileRename={handleFileRename}
        projectName={project?.name}
        projectId={(project?.id ?? resolvedProjectId) as any}
        leftPanel={
          <ReplitFileSidebar
            files={files}
            activeFileId={activeFileId ?? undefined}
            onFileSelect={handleFileSelect}
            onFileCreate={handleFileCreate}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            projectName={project?.name}
          />
        }
        centerPanel={
          <ReplitCodeEditor
            files={files}
            activeFile={activeFile}
            onFileUpdate={handleFileUpdate}
            className="h-full"
          />
        }
        bottomPanel={bottomPanel}
        rightPanels={rightPanels}
        defaultRightPanel="preview"
        activeRightPanel={activeRightPanel}
        onRightPanelChange={setActiveRightPanel}
        leftPanelOpen={leftPanelOpen}
        onLeftPanelOpenChange={setLeftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onRightPanelOpenChange={setRightPanelOpen}
        bottomPanelOpen={bottomPanelOpen}
        onBottomPanelOpenChange={setBottomPanelOpen}
      />

      <KeyboardShortcuts
        open={showKeyboardShortcuts}
        onOpenChange={setShowKeyboardShortcuts}
        onToggleTerminal={() => setBottomPanelOpen(prev => !prev)}
        onToggleAI={handleCollaborationOpen}
      />
    </div>
  );
}
