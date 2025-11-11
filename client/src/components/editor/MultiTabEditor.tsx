/**
 * MultiTabEditor - Replit-Style Multi-Tab Code Editor
 * 
 * Maintains one Monaco editor instance per open tab to preserve:
 * - Undo/redo history per file
 * - Language mode per file
 * - Cursor position per file
 * - Editor state per file
 * 
 * This fixes the critical bug where a single editor instance was reused for all files.
 */

import React, { useRef, useEffect, useState } from 'react';
import { File } from '@shared/schema';
import * as monaco from 'monaco-editor';
import { setupMonacoTheme, getMonacoEditorOptions } from '@/lib/monaco-setup';
import { cn } from '@/lib/utils';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLayoutStore } from '@/../../shared/stores/layoutStore';
import { DraggableTabBar } from './DraggableTabBar';
import { EditorToolbar } from './EditorToolbar';

interface EditorInstance {
  editor: monaco.editor.IStandaloneCodeEditor;
  model: monaco.editor.ITextModel;
  viewState: monaco.editor.ICodeEditorViewState | null;
}

interface MultiTabEditorProps {
  files: File[];
  activeFileId?: number;
  onFileSelect?: (file: File) => void;
  onChange?: (fileId: number, content: string) => void;
  className?: string;
}

export function MultiTabEditor({
  files,
  activeFileId,
  onFileSelect,
  onChange,
  className,
}: MultiTabEditorProps) {
  // Global layout store for open tabs state
  const { 
    openTabs, 
    activeFileId: storeActiveFileId, 
    minimapEnabled,
    openFile, 
    closeFile, 
    reorderTabs,
    toggleMinimap,
  } = useLayoutStore();
  
  // Container ref for Monaco editors
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Map of file ID to Monaco editor instance
  const editorsRef = useRef<Map<number, EditorInstance>>(new Map());
  
  // Current active file (prefer prop over store)
  const currentActiveFileId = activeFileId ?? storeActiveFileId;
  
  // Initialize Monaco theme once
  useEffect(() => {
    setupMonacoTheme();
  }, []);
  
  // Helper: Get language from filename
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      scss: 'scss',
      md: 'markdown',
      py: 'python',
      sh: 'shell',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      go: 'go',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      java: 'java',
      php: 'php',
      rb: 'ruby',
    };
    return languageMap[ext] || 'plaintext';
  };
  
  // Create a new Monaco editor instance for a file
  const createEditorInstance = (file: File, containerDiv: HTMLDivElement): EditorInstance | null => {
    try {
      const options = getMonacoEditorOptions({
        theme: 'replitDark',
        fontSize: 14,
        tabSize: 2,
        wordWrap: 'on',
        minimap: minimapEnabled,
        bracketPairColorization: true,
        formatOnPaste: true,
        formatOnType: false,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
      });
      
      // Create unique model for this file
      const model = monaco.editor.createModel(
        file.content || '',
        getLanguageFromFilename(file.name),
        monaco.Uri.file(file.path || file.name)
      );
      
      // Create editor instance
      const editor = monaco.editor.create(containerDiv, {
        ...options,
        model,
      });
      
      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newContent = editor.getValue();
        if (onChange && file.id) {
          onChange(file.id, newContent);
        }
      });
      
      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Save file (TODO: implement save API call)
      });
      
      return {
        editor,
        model,
        viewState: null,
      };
    } catch (error) {
      console.error('Failed to create editor instance for file:', file.name, error);
      return null;
    }
  };
  
  // Get or create editor instance for a file
  const getOrCreateEditor = (file: File): EditorInstance | null => {
    if (!file.id || !containerRef.current) return null;
    
    // Return existing editor if available
    if (editorsRef.current.has(file.id)) {
      return editorsRef.current.get(file.id) || null;
    }
    
    // Create new hidden container for this editor
    const editorDiv = document.createElement('div');
    editorDiv.id = `editor-${file.id}`;
    editorDiv.style.position = 'absolute';
    editorDiv.style.top = '0';
    editorDiv.style.left = '0';
    editorDiv.style.width = '100%';
    editorDiv.style.height = '100%';
    editorDiv.style.display = 'none'; // Hidden by default
    containerRef.current.appendChild(editorDiv);
    
    // Create editor instance
    const instance = createEditorInstance(file, editorDiv);
    if (instance) {
      editorsRef.current.set(file.id, instance);
      return instance;
    }
    
    // Cleanup if failed
    editorDiv.remove();
    return null;
  };
  
  // Show active editor and hide others
  useEffect(() => {
    if (!currentActiveFileId || !containerRef.current) return;
    
    const activeFile = files.find(f => f.id === currentActiveFileId);
    if (!activeFile) return;
    
    // Get or create editor for active file
    const activeInstance = getOrCreateEditor(activeFile);
    if (!activeInstance) return;
    
    // Hide all editors first
    editorsRef.current.forEach((instance, fileId) => {
      const editorDiv = document.getElementById(`editor-${fileId}`);
      if (editorDiv) {
        editorDiv.style.display = 'none';
        
        // Save view state before hiding
        instance.viewState = instance.editor.saveViewState();
      }
    });
    
    // Show active editor
    const activeDiv = document.getElementById(`editor-${currentActiveFileId}`);
    if (activeDiv) {
      activeDiv.style.display = 'block';
      
      // Restore view state if available
      if (activeInstance.viewState) {
        activeInstance.editor.restoreViewState(activeInstance.viewState);
      }
      
      // Layout editor (required after display change)
      activeInstance.editor.layout();
      
      // Focus editor
      activeInstance.editor.focus();
    }
  }, [currentActiveFileId, files]);
  
  // Update minimap for all editors when state changes
  useEffect(() => {
    editorsRef.current.forEach((instance) => {
      instance.editor.updateOptions({
        minimap: { enabled: minimapEnabled },
      });
    });
  }, [minimapEnabled]);
  
  // Update content when file changes (external updates)
  useEffect(() => {
    files.forEach((file) => {
      if (!file.id) return;
      
      const instance = editorsRef.current.get(file.id);
      if (instance) {
        const currentValue = instance.model.getValue();
        if (currentValue !== file.content && file.content !== undefined) {
          instance.model.setValue(file.content || '');
        }
      }
    });
  }, [files]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      editorsRef.current.forEach((instance) => {
        instance.editor.layout();
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Cleanup: Dispose all editors on unmount
  useEffect(() => {
    return () => {
      editorsRef.current.forEach((instance) => {
        instance.model.dispose();
        instance.editor.dispose();
      });
      editorsRef.current.clear();
    };
  }, []);
  
  // Handle tab close
  const handleCloseTab = (fileId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Dispose editor and model
    const instance = editorsRef.current.get(fileId);
    if (instance) {
      instance.model.dispose();
      instance.editor.dispose();
      editorsRef.current.delete(fileId);
      
      // Remove DOM node
      const editorDiv = document.getElementById(`editor-${fileId}`);
      if (editorDiv) {
        editorDiv.remove();
      }
    }
    
    // Update global state
    closeFile(fileId);
    
    // Switch to another tab if this was the active one
    if (currentActiveFileId === fileId && openTabs.length > 1) {
      const remainingTabs = openTabs.filter(id => id !== fileId);
      const nextFileId = remainingTabs[remainingTabs.length - 1];
      const nextFile = files.find(f => f.id === nextFileId);
      if (nextFile && onFileSelect) {
        onFileSelect(nextFile);
      }
    }
  };
  
  // Handle tab click
  const handleTabClick = (file: File) => {
    if (file.id) {
      openFile(file.id);
    }
    if (onFileSelect) {
      onFileSelect(file);
    }
  };
  
  // Get files for open tabs
  const tabFiles = openTabs
    .map(id => files.find(f => f.id === id))
    .filter((f): f is File => f !== undefined);
  
  return (
    <div className={cn("flex flex-col h-full w-full bg-[var(--ecode-editor-bg)]", className)}>
      {/* Draggable Tab Bar */}
      <DraggableTabBar
        tabs={openTabs}
        files={files}
        activeFileId={currentActiveFileId}
        onTabSelect={(fileId) => {
          const file = files.find(f => f.id === fileId);
          if (file && onFileSelect) {
            onFileSelect(file);
          }
          openFile(fileId);
        }}
        onTabClose={(fileId) => {
          const instance = editorsRef.current.get(fileId);
          if (instance) {
            instance.model.dispose();
            instance.editor.dispose();
            editorsRef.current.delete(fileId);
            const editorDiv = document.getElementById(`editor-${fileId}`);
            if (editorDiv) editorDiv.remove();
          }
          closeFile(fileId);
        }}
        onTabsReorder={reorderTabs}
      />
      
      {/* Editor Toolbar */}
      {currentActiveFileId && (
        <EditorToolbar
          filePath={files.find(f => f.id === currentActiveFileId)?.path}
          fileName={files.find(f => f.id === currentActiveFileId)?.name}
          minimapEnabled={minimapEnabled}
          onToggleMinimap={toggleMinimap}
          onBreadcrumbClick={(segment, index) => {
            // TODO: Implement file tree reveal/navigation
          }}
        />
      )}
      
      {/* Editor Container */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[var(--ecode-editor-bg)]">
        {/* Monaco editor instances will be created and appended here dynamically */}
        {!currentActiveFileId && (
          <div className="flex items-center justify-center h-full text-[var(--ecode-text-muted)]">
            <p className="text-sm font-[family-name:var(--ecode-font-sans)]">Select a file to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
