import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';

interface EditorInstance {
  fileId: number;
  fileName: string;
  language: string;
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  viewState: Monaco.editor.ICodeEditorViewState | null;
  content: string;
}

interface MultiEditorManagerProps {
  tabs: Array<{
    fileId: number;
    fileName: string;
    content: string;
    language: string;
  }>;
  activeTabId: number | null;
  onContentChange: (fileId: number, content: string) => void;
  className?: string;
}

export function MultiEditorManager({
  tabs,
  activeTabId,
  onContentChange,
  className,
}: MultiEditorManagerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstancesRef = useRef<Map<number, EditorInstance>>(new Map());
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonacoReady, setIsMonacoReady] = useState(false); // Track Monaco initialization

  // Get language from file extension
  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  // Create a new editor instance for a tab
  const createEditorInstance = useCallback(
    (tab: typeof tabs[0], monaco: typeof Monaco) => {
      if (!containerRef.current) return null;

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.right = '0';
      container.style.bottom = '0';
      container.style.display = 'none'; // Hidden by default
      containerRef.current.appendChild(container);

      const editor = monaco.editor.create(container, {
        value: tab.content,
        language: tab.language,
        theme: 'vs-dark',
        fontSize: isMobile ? 12 : 13,
        fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        minimap: { enabled: !isMobile },
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        tabSize: 2,
        wordWrap: 'on',
        automaticLayout: true,
        fixedOverflowWidgets: true,
        lineNumbers: isMobile ? 'off' : 'on',
        folding: !isMobile,
        glyphMargin: !isMobile,
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showKeywords: true,
          showSnippets: true,
        },
      });

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const content = editor.getValue();
        onContentChange(tab.fileId, content);
      });

      const instance: EditorInstance = {
        fileId: tab.fileId,
        fileName: tab.fileName,
        language: tab.language,
        editor,
        viewState: null,
        content: tab.content,
      };

      editorInstancesRef.current.set(tab.fileId, instance);
      return instance;
    },
    [isMobile, onContentChange]
  );

  // Show the active editor and hide others
  const switchToEditor = useCallback((fileId: number) => {
    editorInstancesRef.current.forEach((instance, id) => {
      if (instance.editor) {
        const container = instance.editor.getContainerDomNode();
        
        if (id === fileId) {
          // Show this editor
          container.style.display = 'block';
          
          // Restore view state if available
          if (instance.viewState) {
            instance.editor.restoreViewState(instance.viewState);
          }
          
          // Focus the editor
          instance.editor.focus();
          
          // Trigger layout update
          instance.editor.layout();
        } else {
          // Hide this editor and save its state
          instance.viewState = instance.editor.saveViewState();
          container.style.display = 'none';
        }
      }
    });
  }, []);

  // Handle Monaco initialization
  const handleEditorMount = useCallback(
    (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
      monacoRef.current = monaco;
      setIsLoading(false);
      setIsMonacoReady(true); // Trigger effect to create editors
      
      console.log('[MultiEditorManager] Monaco initialized successfully');
    },
    []
  );

  // Manage editor instances when tabs change OR Monaco becomes ready
  useEffect(() => {
    if (!monacoRef.current || !isMonacoReady) return;

    // Create editors for new tabs
    tabs.forEach(tab => {
      if (!editorInstancesRef.current.has(tab.fileId)) {
        createEditorInstance(tab, monacoRef.current!);
      }
    });

    // Remove editors for closed tabs
    const tabIds = new Set(tabs.map(t => t.fileId));
    editorInstancesRef.current.forEach((instance, fileId) => {
      if (!tabIds.has(fileId)) {
        if (instance.editor) {
          const container = instance.editor.getContainerDomNode();
          instance.editor.dispose();
          container.remove();
        }
        editorInstancesRef.current.delete(fileId);
      }
    });
  }, [tabs, createEditorInstance, isMonacoReady]);

  // Switch to active tab (runs after editors are created)
  useEffect(() => {
    if (activeTabId !== null && isMonacoReady) {
      switchToEditor(activeTabId);
    }
  }, [activeTabId, switchToEditor, isMonacoReady]);

  // Update editor content when tab content changes externally
  useEffect(() => {
    tabs.forEach(tab => {
      const instance = editorInstancesRef.current.get(tab.fileId);
      if (instance?.editor && instance.content !== tab.content) {
        const currentValue = instance.editor.getValue();
        if (currentValue !== tab.content) {
          instance.editor.setValue(tab.content);
          instance.content = tab.content;
        }
      }
    });
  }, [tabs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      editorInstancesRef.current.forEach(instance => {
        if (instance.editor) {
          instance.editor.dispose();
        }
      });
      editorInstancesRef.current.clear();
    };
  }, []);

  // Use a hidden editor to initialize Monaco
  // Once initialized, we'll create actual editor instances
  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Hidden initialization editor */}
      {isLoading && (
        <div className="absolute inset-0 z-10">
          <Editor
            height="100%"
            language="javascript"
            value=""
            theme="vs-dark"
            onMount={handleEditorMount}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <Skeleton className="h-4 w-32 mx-auto" />
                  <p className="text-sm text-[var(--ecode-text-muted)]">
                    Initializing editors...
                  </p>
                </div>
              </div>
            }
          />
        </div>
      )}

      {/* Container for multiple editor instances */}
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  );
}
