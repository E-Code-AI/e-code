/**
 * SplitsEditorLayout V2 - Using SplitsLayout with Floating Panes
 * Simplified version to prove floating panes work on desktop
 */

import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { File } from '@shared/schema';
import { SplitsLayout } from './SplitsLayout';
import { ReplitToolDock } from '../editor/ReplitToolDock';
import { ReplitFileSidebar } from '../editor/ReplitFileSidebar';
import { ReplitSearchPanel } from '../editor/ReplitSearchPanel';
import { ReplitAgentPanel } from '../editor/ReplitAgentPanel';
import { ReplitGitPanel } from '../editor/ReplitGitPanel';
import { ReplitDebuggerPanel } from '../editor/ReplitDebuggerPanel';
import { ReplitTestingPanel } from '../editor/ReplitTestingPanel';
import { ReplitDatabasePanel } from '../editor/ReplitDatabasePanel';
import { ReplitPackagesPanel } from '../editor/ReplitPackagesPanel';
import { ReplitHistoryPanel } from '../editor/ReplitHistoryPanel';
import { ReplitSecretsPanel } from '../editor/ReplitSecretsPanel';
import { ReplitSettingsPanel } from '../editor/ReplitSettingsPanel';
import { ReplitProblemsPanel } from '../editor/ReplitProblemsPanel';
import { ReplitOutputPanel } from '../editor/ReplitOutputPanel';
import { ReplitStatusBar } from '../editor/ReplitStatusBar';
import { ReplitBreadcrumbs } from '../editor/ReplitBreadcrumbs';
import { ReplitTerminal } from '../terminal/ReplitTerminal';
import { MultiTabEditor } from '../editor/MultiTabEditor';
import { CommandPalette, generateDefaultCommands } from '../command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { useLayoutStore } from '@/../../shared/stores/layoutStore';
import useSplitsStore from '@/stores/splits-store';
import { createEditorDefaultLayout, TOOL_DOCK_TO_TAB_MAP } from './EditorDefaultLayout';
import { Play, Share2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPaneGroup } from '@/types/splits';

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
          <ReplitFileSidebar
            files={files}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onFileCreate={onFileCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            projectName={projectName}
            projectId={Number(projectId)}
          />
        ),
        search: <ReplitSearchPanel />,
        git: <ReplitGitPanel projectId={projectId} />,
        agent: <ReplitAgentPanel projectId={projectId} />,
        debugger: <ReplitDebuggerPanel projectId={projectId} />,
        testing: <ReplitTestingPanel projectId={projectId} />,
        database: <ReplitDatabasePanel projectId={projectId} />,
        packages: <ReplitPackagesPanel projectId={projectId} />,
        history: <ReplitHistoryPanel projectId={projectId} />,
        secrets: <ReplitSecretsPanel projectId={projectId} />,
        settings: <ReplitSettingsPanel />,
        editor: (
          <div className="h-full flex flex-col bg-[var(--ecode-editor-bg)]">
            <ReplitBreadcrumbs
              filePath={files?.find(f => f.id === activeFileId)?.path || ''}
              onNavigate={(path) => console.log('Navigate to:', path)}
            />
            <div className="flex-1 overflow-hidden">
              <MultiTabEditor
                files={files}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onChange={(fileId, content) => {
                  console.log('File changed:', fileId, content);
                }}
              />
            </div>
          </div>
        ),
        terminal: (
          <ReplitTerminal 
            projectId={Number(projectId) || 1} 
            className="h-full"
            theme="dark"
            allowMultipleSessions={true}
          />
        ),
        output: <ReplitOutputPanel projectId={projectId} />,
        problems: (
          <ReplitProblemsPanel 
            projectId={projectId}
            onFileNavigate={(file, line, column) => {
              console.log('Navigate to:', file, line, column);
            }}
          />
        ),
        console: (
          <div className="h-full bg-[var(--ecode-terminal-bg)] p-4">
            <p className="text-[var(--ecode-terminal-text)] text-xs font-[family-name:var(--ecode-font-mono)]">
              Console output will appear here...
            </p>
          </div>
        ),
        debugConsole: (
          <div className="h-full bg-[var(--ecode-terminal-bg)] p-4">
            <p className="text-[var(--ecode-terminal-text)] text-xs font-[family-name:var(--ecode-font-mono)]">
              Debug console ready. Start debugging to see output here.
            </p>
          </div>
        ),
        preview: (
          <div className="flex items-center justify-center h-full text-[var(--ecode-text-muted)]">
            <p className="text-sm font-[family-name:var(--ecode-font-sans)]">Preview will appear here</p>
          </div>
        ),
      };
      
      const defaultLayout = createEditorDefaultLayout(projectId || '1', panelContent);
      initializeLayout(defaultLayout);
    }
  }, [root, projectId, files, activeFileId, onFileSelect, onFileCreate, onFileDelete, onFileRename, projectName, initializeLayout]);

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
    onNavigate: (path) => {
      console.log('Navigate to:', path);
    },
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
            <h1 className="text-sm font-semibold text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">
              {projectName}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="default"
              className="bg-[var(--ecode-button-primary)] hover:bg-[var(--ecode-button-primary-hover)] text-white gap-2"
              data-testid="button-run-project"
            >
              <Play className="h-4 w-4" />
              Run
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-[var(--ecode-border)] text-[var(--ecode-text)]"
              data-testid="button-share-project"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2 border-[var(--ecode-border)] text-[var(--ecode-text)]"
              data-testid="button-deploy-project"
            >
              <Rocket className="h-4 w-4" />
              Deploy
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
