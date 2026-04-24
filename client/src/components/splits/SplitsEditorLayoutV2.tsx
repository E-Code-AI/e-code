// @ts-nocheck
/**
 * SplitsEditorLayout V2 - Using SplitsLayout with Floating Panes
 * Simplified version to prove floating panes work on desktop
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { File } from '@shared/schema';
import { SplitsLayout } from './SplitsLayout';
import { ReplitToolDock } from '../editor/ReplitToolDock';
import { ReplitStatusBar } from '../editor/ReplitStatusBar';
import { ReplitBreadcrumbs } from '../editor/ReplitBreadcrumbs';
import { MultiTabEditor } from '../editor/MultiTabEditor';
import { ReplitFileExplorer } from '../editor/ReplitFileExplorer';
import { CommandPalette, generateDefaultCommands } from '../command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useLayoutStore } from '@/../../shared/stores/layoutStore';
import useSplitsStore from '@/stores/splits-store';
import { useDeviceType } from '@/hooks/use-media-query';
import { createEditorDefaultLayout, TOOL_DOCK_TO_TAB_MAP } from './EditorDefaultLayout';
import { Share2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RunButton } from '@/components/RunButton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { instrumentedLazy } from '@/utils/instrumented-lazy';
import { PanelShell } from '../editor/PanelShell';

const ReplitSearchPanel = instrumentedLazy(() => import('../editor/ReplitSearchPanel').then((module) => ({ default: module.ReplitSearchPanel })), 'ReplitSearchPanel');
const ReplitAgentPanelV3 = instrumentedLazy(() => import('../ai/ReplitAgentPanelV3').then((module) => ({ default: module.ReplitAgentPanelV3 })), 'ReplitAgentPanelV3');
const ReplitGitPanel = instrumentedLazy(() => import('../editor/ReplitGitPanel').then((module) => ({ default: module.ReplitGitPanel })), 'ReplitGitPanel');
const ReplitDebuggerPanel = instrumentedLazy(() => import('../editor/ReplitDebuggerPanel').then((module) => ({ default: module.ReplitDebuggerPanel })), 'ReplitDebuggerPanel');
const ReplitTestingPanel = instrumentedLazy(() => import('../editor/ReplitTestingPanel').then((module) => ({ default: module.ReplitTestingPanel })), 'ReplitTestingPanel');
const ReplitDatabasePanel = instrumentedLazy(() => import('../editor/ReplitDatabasePanel').then((module) => ({ default: module.ReplitDatabasePanel })), 'ReplitDatabasePanel');
const ReplitPackagesPanel = instrumentedLazy(() => import('../editor/ReplitPackagesPanel').then((module) => ({ default: module.ReplitPackagesPanel })), 'ReplitPackagesPanel');
const ReplitHistoryPanel = instrumentedLazy(() => import('../editor/ReplitHistoryPanel').then((module) => ({ default: module.ReplitHistoryPanel })), 'ReplitHistoryPanel');
const ReplitSecretsPanel = instrumentedLazy(() => import('../editor/ReplitSecretsPanel').then((module) => ({ default: module.ReplitSecretsPanel })), 'ReplitSecretsPanel');
const ReplitSettingsPanel = instrumentedLazy(() => import('../editor/ReplitSettingsPanel').then((module) => ({ default: module.ReplitSettingsPanel })), 'ReplitSettingsPanel');
const ReplitProblemsPanel = instrumentedLazy(() => import('../editor/ReplitProblemsPanel').then((module) => ({ default: module.ReplitProblemsPanel })), 'ReplitProblemsPanel');
const ReplitOutputPanel = instrumentedLazy(() => import('../editor/ReplitOutputPanel').then((module) => ({ default: module.ReplitOutputPanel })), 'ReplitOutputPanel');
const ReplitTerminalPanel = instrumentedLazy(() => import('../editor/ReplitTerminalPanel').then((module) => ({ default: module.ReplitTerminalPanel })), 'ReplitTerminalPanel');
const ResponsiveWebPreview = instrumentedLazy(() => import('../editor/ResponsiveWebPreview').then((module) => ({ default: module.ResponsiveWebPreview })), 'ResponsiveWebPreview');

function ProjectFileExplorer({ projectId }: { projectId: string }) {
  const { openFile, activeFileId } = useLayoutStore();

  return (
    <ReplitFileExplorer
      projectId={projectId}
      selectedFileId={activeFileId}
      onFileSelect={(file) => {
        if (!file.type || file.type === 'file') {
          openFile(file.id);
        }
      }}
    />
  );
}

function ProjectEditorPane({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const saveTimeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const lastSaveToastAtRef = useRef(0);
  const { activeFileId, openFile } = useLayoutStore();
  const { data: files = [] } = useQuery<File[]>({
    queryKey: [`/api/projects/${projectId}/files`],
    enabled: !!projectId,
  });

  const saveFileMutation = useMutation({
    mutationFn: async ({ fileId, content }: { fileId: number; content: string }) =>
      apiRequest<File>('PATCH', `/api/projects/${projectId}/files/by-id/${fileId}`, { content }),
    onSuccess: (updatedFile) => {
      queryClient.setQueryData<File[]>([`/api/projects/${projectId}/files`], (existing = []) =>
        existing.map((file) => (file.id === updatedFile.id ? { ...file, ...updatedFile } : file))
      );

      if (Date.now() - lastSaveToastAtRef.current > 4000) {
        lastSaveToastAtRef.current = Date.now();
        toast({
          title: 'File saved',
          description: `${updatedFile.name || 'Changes'} synced to your workspace.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save file',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (!activeFileId) {
      const firstFile = files.find((file) => !file.isDirectory);
      if (firstFile?.id) {
        openFile(firstFile.id);
      }
    }
  }, [activeFileId, files, openFile]);

  useEffect(() => {
    return () => {
      for (const timeout of saveTimeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      saveTimeoutsRef.current.clear();
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-[var(--ecode-editor-bg)]">
      <EditorBreadcrumbs projectId={projectId} files={files} />
      <div className="flex-1 overflow-hidden">
        <MultiTabEditor
          files={files}
          onChange={(fileId, content) => {
            const existingTimeout = saveTimeoutsRef.current.get(fileId);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            const timeout = setTimeout(() => {
              saveFileMutation.mutate({ fileId, content });
              saveTimeoutsRef.current.delete(fileId);
            }, 400);

            saveTimeoutsRef.current.set(fileId, timeout);
          }}
        />
      </div>
    </div>
  );
}

function EditorBreadcrumbs({ projectId, files }: { projectId: string; files: File[] }) {
  const { activeFileId } = useLayoutStore();
  const activeFilePath = files.find((file) => file.id === activeFileId)?.path || '';

  return (
    <ReplitBreadcrumbs
      filePath={activeFilePath}
      onNavigate={(path) => {
        const target = files.find((file) => file.path === path);
        if (target?.id) {
          useLayoutStore.getState().openFile(target.id);
        }
      }}
    />
  );
}

function ProjectPreviewPane({ projectId }: { projectId: string }) {
  return (
    <PanelShell title="Preview">
      <ResponsiveWebPreview projectId={projectId} className="h-full" />
    </PanelShell>
  );
}

interface SplitsEditorLayoutV2Props {
  files?: File[];
  activeFileId?: number;
  onFileSelect?: (file: File) => void;
  onFileCreate?: (name: string, isFolder: boolean, parentId?: number) => void;
  onFileDelete?: (fileId: number) => void;
  onFileRename?: (fileId: number, newName: string) => void;
  projectName?: string;
  projectId?: string;
  className?: string;
}

export function SplitsEditorLayoutV2({
  files = [],
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  projectName = 'Untitled Project',
  projectId,
  className,
}: SplitsEditorLayoutV2Props) {
  const commandPalette = useCommandPalette();
  const { activeTool, setActiveTool } = useLayoutStore();
  const effectiveProjectId = projectId || '1';
  
  // Device detection for responsive UI (tablet gets compact mode, laptop gets desktop mode)
  const rawDeviceType = useDeviceType();
  const agentMode = rawDeviceType === 'laptop' ? 'desktop' : rawDeviceType;
  
  const {
    root,
    initializeLayout,
    findNode,
    setActivePane,
    setActiveTab,
    setCenterStackHeight,
  } = useSplitsStore();
  
  // Measure actual center-stack height for Fortune 500-grade 216px minimum enforcement
  const centerStackRef = useRef<HTMLDivElement>(null);

  // Initialize layout on mount with pre-populated content
  useEffect(() => {
    if (!root) {
      const panelContent = {
        files: (
          <PanelShell title="Files">
            <ProjectFileExplorer projectId={effectiveProjectId} />
          </PanelShell>
        ),
        search: (
          <PanelShell title="Search">
            <ReplitSearchPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        git: (
          <PanelShell title="Git">
            <ReplitGitPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        agent: (
          <PanelShell title="AI Agent">
            <ReplitAgentPanelV3 projectId={effectiveProjectId} mode={agentMode as 'desktop' | 'tablet' | 'mobile'} />
          </PanelShell>
        ),
        debugger: (
          <PanelShell title="Debugger">
            <ReplitDebuggerPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        testing: (
          <PanelShell title="Testing">
            <ReplitTestingPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        database: (
          <PanelShell title="Database">
            <ReplitDatabasePanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        packages: (
          <PanelShell title="Packages">
            <ReplitPackagesPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        history: (
          <PanelShell title="History">
            <ReplitHistoryPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        secrets: (
          <PanelShell title="Secrets">
            <ReplitSecretsPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        settings: (
          <PanelShell title="Settings">
            <ReplitSettingsPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        editor: (
          <PanelShell title="Editor">
            <ProjectEditorPane projectId={effectiveProjectId} />
          </PanelShell>
        ),
        terminal: (
          <PanelShell title="Terminal">
            <ReplitTerminalPanel projectId={effectiveProjectId} className="h-full" />
          </PanelShell>
        ),
        output: (
          <PanelShell title="Output">
            <ReplitOutputPanel projectId={effectiveProjectId} />
          </PanelShell>
        ),
        problems: (
          <PanelShell title="Problems">
            <ReplitProblemsPanel 
              projectId={effectiveProjectId}
              onFileNavigate={(file, line, column) => {}}
            />
          </PanelShell>
        ),
        console: (
          <PanelShell title="Console">
            <div className="h-full bg-[var(--ecode-terminal-bg)] p-4">
              <p className="text-[var(--ecode-terminal-text)] text-[11px] font-[family-name:var(--ecode-font-mono)]">
                Console output will appear here...
              </p>
            </div>
          </PanelShell>
        ),
        debugConsole: (
          <PanelShell title="Debug Console">
            <div className="h-full bg-[var(--ecode-terminal-bg)] p-4">
              <p className="text-[var(--ecode-terminal-text)] text-[11px] font-[family-name:var(--ecode-font-mono)]">
                Debug console ready. Start debugging to see output here.
              </p>
            </div>
          </PanelShell>
        ),
        preview: <ProjectPreviewPane projectId={effectiveProjectId} />,
      };
      
      const defaultLayout = createEditorDefaultLayout(effectiveProjectId, panelContent);
      initializeLayout(defaultLayout);
    }
  }, [root, effectiveProjectId, agentMode, initializeLayout]);

  // Sync tool dock with active pane using store actions (no mutations!)
  const handleToolChange = (tool: string) => {
    setActiveTool(tool);
    
    // Map tool to tab and activate via store action
    const tabId = TOOL_DOCK_TO_TAB_MAP[tool];
    if (tabId) {
      // Use store actions to update state properly
      setActivePane('left-dock');
      setActiveTab('left-dock', tabId); // Activate the specific tab by ID
    }
  };

  // Measure center-stack height with ResizeObserver (Fortune 500-grade precision)
  useEffect(() => {
    const container = centerStackRef.current;
    if (!container) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setCenterStackHeight(height);
      }
    });
    
    observer.observe(container);
    
    return () => observer.disconnect();
  }, [setCenterStackHeight]);

  // Command palette commands
  const commands = useMemo(() => generateDefaultCommands({
    onToolSelect: handleToolChange,
    onNavigate: (path) => {},
  }), [handleToolChange]);

  return (
    <>
      {/* Command Palette */}
      <CommandPalette
        open={commandPalette.isOpen}
        onOpenChange={commandPalette.setIsOpen}
        commands={commands}
        files={files}
        onFileSelect={onFileSelect}
        onToolSelect={setActiveTool}
      />

      <div className={cn("flex flex-col h-full w-full bg-[var(--ecode-background)]", className)}>
        {/* Top Toolbar */}
        <div className="h-12 border-b border-[var(--ecode-border)] bg-[var(--ecode-surface)] flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-[13px] font-semibold text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">
              {projectName}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <RunButton
              projectId={effectiveProjectId}
              size="sm"
              className="bg-[var(--ecode-button-primary)] hover:bg-[var(--ecode-button-primary-hover)] text-white"
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-[var(--ecode-border)] text-[var(--ecode-text)]"
              data-testid="button-share-project"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden lg:inline">Share</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-[var(--ecode-border)] text-[var(--ecode-text)]"
              data-testid="button-deploy-project"
            >
              <Rocket className="h-4 w-4" />
              <span className="hidden lg:inline">Deploy</span>
            </Button>
          </div>
        </div>

        {/* Main Layout - Tool Dock + SplitsLayout */}
        <div ref={centerStackRef} className="flex flex-1 overflow-hidden">
          {/* Tool Dock */}
          <ReplitToolDock
            activeTool={activeTool}
            onToolChange={handleToolChange}
          />

          {/* SplitsLayout with Floating Panes Support */}
          <div className="flex-1">
            <SplitsLayout />
          </div>
        </div>

        {/* Status Bar */}
        <ReplitStatusBar
          language={files?.find(f => f.id === activeFileId)?.name?.split('.').pop() || 'plaintext'}
          lineNumber={1}
          columnNumber={1}
          encoding="UTF-8"
          gitBranch="main"
          hasGitChanges={false}
          errorCount={0}
          warningCount={0}
          infoCount={0}
          isConnected={true}
          onProblemsClick={() => setActivePane('center-bottom')}
          onGitClick={() => handleToolChange('git')}
          onSettingsClick={() => handleToolChange('settings')}
        />
      </div>
    </>
  );
}
