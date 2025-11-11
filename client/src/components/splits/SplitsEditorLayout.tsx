import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { File } from '@shared/schema';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ReplitToolDock } from '../editor/ReplitToolDock';
import { ReplitFileSidebar } from '../editor/ReplitFileSidebar';
import { ReplitSearchPanel } from '../editor/ReplitSearchPanel';
import { ReplitSettingsPanel } from '../editor/ReplitSettingsPanel';
import { ReplitAgentPanel } from '../editor/ReplitAgentPanel';
import { ReplitGitPanel } from '../editor/ReplitGitPanel';
import { ReplitDebuggerPanel } from '../editor/ReplitDebuggerPanel';
import { ReplitTestingPanel } from '../editor/ReplitTestingPanel';
import { ReplitDatabasePanel } from '../editor/ReplitDatabasePanel';
import { ReplitPackagesPanel } from '../editor/ReplitPackagesPanel';
import { ReplitHistoryPanel } from '../editor/ReplitHistoryPanel';
import { ReplitSecretsPanel } from '../editor/ReplitSecretsPanel';
import { ReplitProblemsPanel } from '../editor/ReplitProblemsPanel';
import { ReplitOutputPanel } from '../editor/ReplitOutputPanel';
import { ReplitStatusBar } from '../editor/ReplitStatusBar';
import { ReplitBreadcrumbs } from '../editor/ReplitBreadcrumbs';
import { ReplitTerminal } from '../terminal/ReplitTerminal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Play, Share2, Rocket, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResponsive } from '@/hooks/useResponsive';
import { useLayoutStore } from '@/../../shared/stores/layoutStore';
import { MultiTabEditor } from '../editor/MultiTabEditor';
import { CommandPalette, generateDefaultCommands } from '../command-palette/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

interface SplitsEditorLayoutProps {
  files?: File[];
  activeFileId?: number;
  onFileSelect?: (file: File) => void;
  onFileCreate?: (name: string, isFolder: boolean, parentId?: number) => void;
  onFileDelete?: (fileId: number) => void;
  onFileRename?: (fileId: number, newName: string) => void;
  projectName?: string;
  projectId?: string;
  editorContent?: React.ReactNode;
  terminalContent?: React.ReactNode;
  previewContent?: React.ReactNode;
  consoleContent?: React.ReactNode;
  className?: string;
}

export function SplitsEditorLayout({
  files = [],
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  projectName = 'Untitled Project',
  projectId,
  editorContent,
  terminalContent,
  previewContent,
  consoleContent,
  className,
}: SplitsEditorLayoutProps) {
  // Responsive state detection
  const responsive = useResponsive();
  
  // Global layout state store (Zustand)
  const {
    deviceType,
    setDeviceType,
    activeTool,
    setActiveTool,
    leftPanelOpen,
    rightPanelOpen,
    bottomPanelOpen,
    togglePanel,
    openTabs,
    openFile,
  } = useLayoutStore();

  // Command Palette (CMD/CTRL + K)
  const commandPalette = useCommandPalette();
  
  // Update device type on responsive changes
  useEffect(() => {
    setDeviceType(responsive.deviceType);
  }, [responsive.deviceType, setDeviceType]);
  
  // Auto-populate openTabs when activeFileId changes (fixes architect feedback #2)
  useEffect(() => {
    if (activeFileId && !openTabs.includes(activeFileId)) {
      openFile(activeFileId);
    }
  }, [activeFileId, openTabs, openFile]);
  
  // Local state helpers (wrappers around global store)
  const setLeftPanelOpen = (open: boolean) => {
    if (leftPanelOpen !== open) togglePanel('left');
  };
  const setRightPanelOpen = (open: boolean) => {
    if (rightPanelOpen !== open) togglePanel('right');
  };
  const setBottomPanelOpen = (open: boolean) => {
    if (bottomPanelOpen !== open) togglePanel('bottom');
  };

  // TODO PHASE 2 & 3: Render different layouts based on device type
  // - Mobile: MobileWorkspace component with bottom tabs, swipe gestures, FAB
  // - Tablet: TabletWorkspace component with hybrid layout, keyboard mode
  // - Desktop/Laptop: Current 3-column desktop layout (below)
  //
  // Example:
  // if (responsive.isMobile) return <MobileWorkspace {...props} />;
  // if (responsive.isTablet) return <TabletWorkspace {...props} />;
  
  // Render the left tool panel content
  const renderToolPanel = () => {
    switch (activeTool) {
      case 'files':
        return (
          <ReplitFileSidebar
            files={files}
            activeFileId={activeFileId}
            onFileSelect={onFileSelect}
            onFileCreate={onFileCreate}
            onFileDelete={onFileDelete}
            onFileRename={onFileRename}
            projectName={projectName}
            projectId={Number(projectId)}
            onClose={() => setLeftPanelOpen(false)}
          />
        );
      case 'search':
        return <ReplitSearchPanel />;
      case 'git':
        return <ReplitGitPanel projectId={projectId} />;
      case 'debugger':
        return <ReplitDebuggerPanel projectId={projectId} />;
      case 'testing':
        return <ReplitTestingPanel projectId={projectId} />;
      case 'database':
        return <ReplitDatabasePanel projectId={projectId} />;
      case 'packages':
        return <ReplitPackagesPanel projectId={projectId} />;
      case 'history':
        return <ReplitHistoryPanel projectId={projectId} />;
      case 'secrets':
        return <ReplitSecretsPanel projectId={projectId} />;
      case 'agent':
        return <ReplitAgentPanel projectId={projectId} />;
      case 'settings':
        return <ReplitSettingsPanel />;
      default:
        return null;
    }
  };

  // Generate command palette commands
  const commands = generateDefaultCommands({
    onToolSelect: (tool) => {
      setActiveTool(tool);
      if (!leftPanelOpen) {
        togglePanel('left');
      }
    },
    onNavigate: (path) => {
      // Navigation handler
    },
  });

  return (
    <>
      {/* Command Palette (CMD/CTRL + K) */}
      <CommandPalette
        open={commandPalette.isOpen}
        onOpenChange={commandPalette.setIsOpen}
        commands={commands}
        files={files}
        onFileSelect={onFileSelect}
        onToolSelect={setActiveTool}
      />

      <div className={cn("flex flex-col h-full w-full bg-[var(--ecode-background)]", className)}>
        {/* Top Toolbar - Replit Style */}
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
            className="bg-[var(--ecode-button-primary)] hover:bg-[var(--ecode-button-primary-hover)] text-white gap-2 font-[family-name:var(--ecode-font-sans)]"
            data-testid="button-run-project"
          >
            <Play className="h-4 w-4" />
            Run
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 border-[var(--ecode-border)] text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]" 
            data-testid="button-share-project"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 border-[var(--ecode-border)] text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]" 
            data-testid="button-deploy-project"
          >
            <Rocket className="h-4 w-4" />
            Deploy
          </Button>
        </div>
      </div>

      {/* Main Layout - 3 Column Resizable */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Tool Dock - 40px */}
        <ReplitToolDock
          activeTool={activeTool}
          onToolChange={setActiveTool}
        />

        {/* Resizable Panel Group - Left + Center + Right */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Files/Search/AI Agent/Settings */}
          {leftPanelOpen && (
            <>
              <ResizablePanel 
                defaultSize={18} 
                minSize={12} 
                maxSize={30}
                className="bg-[var(--ecode-surface)]"
              >
                <div className="h-full border-r border-[var(--ecode-border)] bg-[var(--ecode-surface)] flex flex-col">
                  {/* Left Panel Tabs - Scrollable for all tools */}
                  <div className="h-10 border-b border-[var(--ecode-border)] flex items-center px-2 bg-[var(--ecode-surface)] justify-between flex-shrink-0">
                    <Tabs value={activeTool} onValueChange={setActiveTool} className="flex-1 overflow-x-auto">
                      <TabsList className="bg-transparent border-0 h-9 inline-flex">
                        <TabsTrigger value="files" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-files">
                          Files
                        </TabsTrigger>
                        <TabsTrigger value="search" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-search">
                          Search
                        </TabsTrigger>
                        <TabsTrigger value="git" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-git">
                          Git
                        </TabsTrigger>
                        <TabsTrigger value="debugger" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-debugger">
                          Debugger
                        </TabsTrigger>
                        <TabsTrigger value="testing" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-testing">
                          Testing
                        </TabsTrigger>
                        <TabsTrigger value="database" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-database">
                          Database
                        </TabsTrigger>
                        <TabsTrigger value="packages" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-packages">
                          Packages
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-history">
                          History
                        </TabsTrigger>
                        <TabsTrigger value="secrets" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-secrets">
                          Secrets
                        </TabsTrigger>
                        <TabsTrigger value="agent" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-agent">
                          AI Agent
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-[var(--ecode-surface-hover)] text-xs" data-testid="tab-settings">
                          Settings
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    <button
                      onClick={() => setLeftPanelOpen(false)}
                      className="p-1 hover:bg-[var(--ecode-surface-hover)] rounded ml-2 flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
                    </button>
                  </div>

                  {/* Left Panel Content */}
                  <div className="flex-1 overflow-hidden bg-[var(--ecode-surface)]">
                    {renderToolPanel()}
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle className="w-[1px] bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent)] hover:w-[2px] transition-all" />
            </>
          )}

          {/* Center Panel - Code Editor + Bottom Panels */}
          <ResizablePanel 
            defaultSize={rightPanelOpen ? 52 : 70} 
            minSize={30}
            className="bg-[var(--ecode-editor-bg)] flex flex-col"
          >
            {bottomPanelOpen ? (
              <ResizablePanelGroup direction="vertical">
                {/* Code Editor with Breadcrumbs */}
                <ResizablePanel defaultSize={70} minSize={30}>
                  <div className="h-full bg-[var(--ecode-editor-bg)] flex flex-col">
                    {/* Breadcrumbs Navigation */}
                    <ReplitBreadcrumbs
                      filePath={files?.find(f => f.id === activeFileId)?.path || ''}
                      onNavigate={(path) => {}}
                    />
                    
                    {/* Multi-Tab Editor - One Monaco instance per open tab */}
                    <div className="flex-1 overflow-hidden">
                      <MultiTabEditor
                        files={files}
                        activeFileId={activeFileId}
                        onFileSelect={onFileSelect}
                        onChange={(fileId, content) => {
                          // TODO: Implement file update API call
                        }}
                      />
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle className="h-[1px] bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent)] hover:h-[2px] transition-all" />

                {/* Bottom Panel - Terminal, Output, Problems, Debug Console */}
                <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                  <div className="h-full bg-[var(--ecode-terminal-bg)] border-t border-[var(--ecode-border)]">
                    <Tabs defaultValue="terminal" className="h-full flex flex-col">
                      <div className="h-9 bg-[var(--ecode-terminal-bg)] border-b border-[var(--ecode-border)] flex items-center justify-between px-3 flex-shrink-0">
                        <TabsList className="bg-transparent border-0 h-8 overflow-x-auto">
                          <TabsTrigger value="terminal" className="text-xs" data-testid="tab-terminal">
                            Terminal
                          </TabsTrigger>
                          <TabsTrigger value="output" className="text-xs" data-testid="tab-output">
                            Output
                          </TabsTrigger>
                          <TabsTrigger value="problems" className="text-xs" data-testid="tab-problems">
                            Problems
                          </TabsTrigger>
                          <TabsTrigger value="console" className="text-xs" data-testid="tab-console">
                            Console
                          </TabsTrigger>
                          <TabsTrigger value="debug" className="text-xs" data-testid="tab-debug-console">
                            Debug Console
                          </TabsTrigger>
                        </TabsList>
                        <button
                          onClick={() => setBottomPanelOpen(false)}
                          className="p-1 hover:bg-[var(--ecode-surface-hover)] rounded text-[var(--ecode-terminal-text)] ml-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      
                      <TabsContent value="terminal" className="flex-1 m-0 overflow-hidden">
                        <div className="h-full bg-[var(--ecode-terminal-bg)]">
                          {terminalContent || (
                            <ReplitTerminal 
                              projectId={Number(projectId) || 1} 
                              className="h-full"
                              theme="dark"
                              allowMultipleSessions={true}
                            />
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="output" className="flex-1 m-0 overflow-hidden">
                        <ReplitOutputPanel projectId={projectId} />
                      </TabsContent>
                      
                      <TabsContent value="problems" className="flex-1 m-0 overflow-hidden">
                        <ReplitProblemsPanel 
                          projectId={projectId}
                          onFileNavigate={(file, line, column) => {
                            // TODO: Implement file navigation
                          }}
                        />
                      </TabsContent>
                      
                      <TabsContent value="console" className="flex-1 m-0 overflow-hidden">
                        <div className="h-full bg-[var(--ecode-terminal-bg)]">
                          {consoleContent || (
                            <div className="p-4 text-[var(--ecode-terminal-text)] text-xs font-[family-name:var(--ecode-font-mono)]">
                              Console output will appear here...
                            </div>
                          )}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="debug" className="flex-1 m-0 overflow-hidden">
                        <div className="h-full bg-[var(--ecode-terminal-bg)] p-4">
                          <p className="text-[var(--ecode-terminal-text)] text-xs font-[family-name:var(--ecode-font-mono)]">
                            Debug console ready. Start debugging to see output here.
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              <div className="h-full bg-[var(--ecode-editor-bg)] flex flex-col">
                {/* Breadcrumbs when bottom panel is closed */}
                <ReplitBreadcrumbs
                  filePath={files?.find(f => f.id === activeFileId)?.path || ''}
                  onNavigate={(path) => {}}
                />
                
                {/* Multi-Tab Editor - One Monaco instance per open tab */}
                <div className="flex-1 overflow-hidden">
                  <MultiTabEditor
                    files={files}
                    activeFileId={activeFileId}
                    onFileSelect={onFileSelect}
                    onChange={(fileId, content) => {
                      // TODO: Implement file update API call
                    }}
                  />
                </div>
              </div>
            )}
          </ResizablePanel>

          {/* Right Panel - Preview */}
          {rightPanelOpen && (
            <>
              <ResizableHandle className="w-[1px] bg-[var(--ecode-border)] hover:bg-[var(--ecode-accent)] hover:w-[2px] transition-all" />

              <ResizablePanel 
                defaultSize={30} 
                minSize={20} 
                maxSize={45}
                className="bg-[var(--ecode-surface)]"
              >
                <div className="h-full flex flex-col border-l border-[var(--ecode-border)]">
                  {/* Right Panel Header */}
                  <div className="h-10 border-b border-[var(--ecode-border)] flex items-center px-3 bg-[var(--ecode-surface)] justify-between flex-shrink-0">
                    <span className="text-sm font-medium text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">
                      Preview
                    </span>
                    <button
                      onClick={() => setRightPanelOpen(false)}
                      className="p-1 hover:bg-[var(--ecode-surface-hover)] rounded"
                    >
                      <X className="h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
                    </button>
                  </div>

                  {/* Right Panel Content */}
                  <div className="flex-1 overflow-hidden bg-[var(--ecode-surface)]">
                    {previewContent || (
                      <div className="flex items-center justify-center h-full text-[var(--ecode-text-muted)]">
                        <p className="text-sm font-[family-name:var(--ecode-font-sans)]">Preview will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Floating buttons to reopen panels */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          className="fixed left-[48px] top-20 p-1.5 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-md shadow-sm hover:shadow-md transition-shadow z-10"
          data-testid="button-open-left-panel"
        >
          <ChevronRight className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
        </button>
      )}

      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="fixed right-2 top-20 p-1.5 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-md shadow-sm hover:shadow-md transition-shadow z-10"
          data-testid="button-open-right-panel"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
        </button>
      )}

      {!bottomPanelOpen && (
        <button
          onClick={() => setBottomPanelOpen(true)}
          className="fixed bottom-11 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[var(--ecode-surface)] border border-[var(--ecode-border)] rounded-md shadow-sm hover:shadow-md transition-shadow z-10 flex items-center gap-2"
          data-testid="button-open-console"
        >
          <ChevronUp className="h-4 w-4 text-[var(--ecode-text-secondary)]" />
          <span className="text-sm text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">Show Console</span>
        </button>
      )}
      
      {/* Status Bar - Always visible at bottom */}
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
        onProblemsClick={() => setBottomPanelOpen(true)}
        onGitClick={() => {
          setActiveTool('git');
          setLeftPanelOpen(true);
        }}
        onSettingsClick={() => {
          setActiveTool('settings');
          setLeftPanelOpen(true);
        }}
      />
      </div>
    </>
  );
}
