import React, { useState, useEffect } from 'react';
import { File, Project } from '@shared/schema';
import CodeEditor from './CodeEditor';
import FileExplorer from './FileExplorer';
import { AIAssistant } from './AIAssistant';
import { Terminal } from './Terminal';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Maximize2, Minimize2, Play, Terminal as TerminalIcon, 
  Code, Sparkles, PanelLeft, PanelLeftClose 
} from 'lucide-react';

interface EditorWorkspaceProps {
  project: Project;
  files: File[];
  onFileUpdate: (fileId: number, content: string) => Promise<void>;
  onFileCreate: (name: string, isFolder: boolean, parentId?: number | null) => Promise<void>;
  onFileDelete: (fileId: number) => Promise<void>;
  onActiveFileChange?: (file: File | undefined) => void;
}

export function EditorWorkspace({ 
  project, 
  files, 
  onFileUpdate, 
  onFileCreate, 
  onFileDelete,
  onActiveFileChange
}: EditorWorkspaceProps) {
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [activeFile, setActiveFile] = useState<File | undefined>(undefined);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalMinimized, setTerminalMinimized] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Set active file when files change or on initial load
  useEffect(() => {
    if (!activeFileId && files.length > 0) {
      // Find index.html or the first file
      const indexHtmlFile = files.find(f => f.name === 'index.html' && !f.isFolder);
      const firstFile = files.find(f => !f.isFolder);
      
      if (indexHtmlFile) {
        setActiveFileId(indexHtmlFile.id);
      } else if (firstFile) {
        setActiveFileId(firstFile.id);
      }
    }
  }, [files, activeFileId]);

  // Update active file when activeFileId changes
  useEffect(() => {
    if (activeFileId) {
      const file = files.find(f => f.id === activeFileId);
      setActiveFile(file);
    } else {
      setActiveFile(undefined);
    }
  }, [activeFileId, files]);
  
  // Notify parent component about active file changes
  useEffect(() => {
    if (onActiveFileChange) {
      onActiveFileChange(activeFile);
    }
  }, [activeFile, onActiveFileChange]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.isFolder) {
      setActiveFileId(file.id);
    }
  };

  // Handle file content change
  const handleFileChange = (content: string) => {
    if (activeFileId) {
      onFileUpdate(activeFileId, content);
    }
  };

  // Handle AI assistant suggestions
  const handleApplySuggestion = (content: string) => {
    if (activeFile) {
      onFileUpdate(activeFile.id, content);
    }
  };

  // Toggle various panels
  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
    setTerminalMinimized(false);
  };

  const toggleAIAssistant = () => {
    setShowAIAssistant(!showAIAssistant);
  };

  const toggleFileExplorer = () => {
    setShowFileExplorer(!showFileExplorer);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Editor toolbar - only visible on smaller screens for responsive design */}
      <div className="flex md:hidden items-center justify-between px-4 py-2 border-b border-border bg-background/80">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={toggleFileExplorer}
            className="h-8 w-8 p-0"
            title={showFileExplorer ? "Hide file explorer" : "Show file explorer"}
          >
            {showFileExplorer ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleTerminal}
            className="h-8"
          >
            <TerminalIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Terminal</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleAIAssistant}
            className="h-8"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">AI Assistant</span>
          </Button>
        </div>
      </div>

      {/* Main workspace area */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-[auto,1fr] overflow-hidden">
        {/* File explorer (left sidebar) - Responsive sidebar */}
        {showFileExplorer && (
          <div className={`${showFileExplorer ? 'block' : 'hidden'} md:block w-full md:w-64 border-r border-border bg-background overflow-y-auto`}>
            {/* Desktop toolbar visible only in sidebar */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-border">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={toggleFileExplorer}
                className="h-8 w-8 p-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">Files</span>
            </div>
            
            <FileExplorer 
              files={files} 
              isLoading={false}
              onFileOpen={handleFileSelect}
              onContextMenu={() => {}}
            />
          </div>
        )}

        {/* Right side content - Editor area */}
        <ResizablePanelGroup direction="horizontal" className="w-full">
          {/* Editor area */}
          <ResizablePanel defaultSize={showAIAssistant ? 70 : 100} minSize={40} className="h-full">
            {/* Desktop toolbar */}
            <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-border bg-background/80">
              <h2 className="text-sm font-medium">Editor</h2>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleTerminal}
                  className="h-8"
                >
                  <TerminalIcon className="h-4 w-4 mr-2" />
                  Terminal
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={toggleAIAssistant}
                  className="h-8"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Assistant
                </Button>
              </div>
            </div>
            
            <div className="h-[calc(100%-40px)]">
              {activeFile ? (
                <CodeEditor file={activeFile} onChange={handleFileChange} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-6">
                    <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No file selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a file from the explorer to start editing
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* AI Assistant panel */}
          {showAIAssistant && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25}>
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                    <span className="text-sm font-medium">AI Assistant</span>
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={toggleAIAssistant}
                      className="h-6 w-6 p-0"
                    >
                      <span className="sr-only">Close</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </Button>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <AIAssistant 
                      activeFile={activeFile} 
                      onApplyCompletion={handleApplySuggestion} 
                    />
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Terminal panel */}
      {showTerminal && !terminalMinimized && (
        <div className="h-1/3 border-t border-border">
          <Terminal 
            project={project}
            minimized={terminalMinimized}
            onMinimize={() => setTerminalMinimized(true)}
            onMaximize={() => setTerminalMinimized(false)}
            onClose={() => setShowTerminal(false)}
          />
        </div>
      )}

      {/* Minimized terminal */}
      {showTerminal && terminalMinimized && (
        <div className="fixed bottom-4 right-4 z-50">
          <Terminal
            project={project}
            minimized={terminalMinimized}
            onMinimize={() => setTerminalMinimized(true)}
            onMaximize={() => setTerminalMinimized(false)}
            onClose={() => setShowTerminal(false)}
          />
        </div>
      )}
    </div>
  );
}