import { useEffect, useRef, useState } from "react";
import * as monaco from 'monaco-editor';
import { setupMonacoTheme } from "@/lib/monaco-setup";
import { File } from "@shared/schema";
import { useCollaboration } from "@/lib/collaboration";
import { RemoteCursor } from "@/components/ui/cursor";

interface CodeEditorProps {
  file: File;
  onChange: (content: string) => void;
}

const CodeEditor = ({ file, onChange }: CodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editorDimensions, setEditorDimensions] = useState({
    lineHeight: 21,
    charWidth: 8.4,
  });
  const [editorElement, setEditorElement] = useState<HTMLElement | null>(null);
  
  // Use the collaboration hook
  const { cursors, collaborators, updateCursorPosition, sendEdit } = useCollaboration(
    file.projectId, 
    file.id
  );
  
  useEffect(() => {
    // Setup Monaco themes
    setupMonacoTheme();
    
    // Initialize Monaco editor
    if (editorRef.current && !monacoEditorRef.current) {
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: file.content || '',
        language: getLanguageFromFilename(file.name),
        theme: 'replitDark',
        automaticLayout: true,
        minimap: {
          enabled: true,
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineHeight: 21,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        padding: {
          top: 10,
          bottom: 10,
        },
      });
      
      // Add event listener for content changes
      monacoEditorRef.current.onDidChangeModelContent((e) => {
        const newValue = monacoEditorRef.current?.getValue() || '';
        onChange(newValue);
        
        // Send edit to collaborators
        sendEdit(e.changes);
      });
      
      // Listen for cursor position changes
      monacoEditorRef.current.onDidChangeCursorPosition((e) => {
        updateCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });
      
      // Get dimensions for cursor positioning
      const fontInfo = monacoEditorRef.current.getOption(monaco.editor.EditorOption.fontInfo);
      setEditorDimensions({
        lineHeight: fontInfo.lineHeight,
        charWidth: fontInfo.typicalHalfwidthCharacterWidth,
      });
      
      // Get the dom node for cursor rendering
      setTimeout(() => {
        if (editorRef.current) {
          setEditorElement(
            editorRef.current.querySelector('.monaco-editor .monaco-scrollable-element .lines-content') as HTMLElement
          );
        }
      }, 100);
    }
    
    // Cleanup
    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, []); // Initialize once
  
  // Update content when file changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      const currentValue = monacoEditorRef.current.getValue();
      // Only update if content actually changed to avoid cursor position reset
      if (currentValue !== file.content && file.content !== undefined) {
        monacoEditorRef.current.setValue(file.content || '');
      }
      
      // Update language if file extension changed
      const model = monacoEditorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getLanguageFromFilename(file.name));
      }
    }
  }, [file.name, file.content]);
  
  return (
    <div className="h-full w-full relative">
      <div 
        ref={editorRef} 
        className="h-full w-full"
      />
      
      {/* Collaborators list */}
      {collaborators.length > 0 && (
        <div className="absolute top-2 right-4 z-10 bg-background/80 backdrop-blur-sm p-2 rounded-md border border-border">
          <div className="text-xs font-medium mb-1">Collaborators ({collaborators.length})</div>
          <div className="flex flex-col gap-1">
            {collaborators.map((collaborator) => (
              <div key={collaborator.userId} className="flex items-center gap-1.5 text-xs">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: cursors[collaborator.userId]?.color || '#ccc' }}
                />
                <span>{collaborator.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Remote cursors */}
      {Object.values(cursors).map((cursor) => (
        cursor.fileId === file.id && (
          <RemoteCursor
            key={cursor.userId}
            position={cursor.position}
            color={cursor.color}
            username={cursor.username}
            editorElement={editorElement}
            lineHeight={editorDimensions.lineHeight}
            charWidth={editorDimensions.charWidth}
          />
        )
      ))}
    </div>
  );
};

function getLanguageFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Map extensions to Monaco editor language identifiers
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'go': 'go',
    'php': 'php',
    'rs': 'rust',
    'sql': 'sql',
    'sh': 'shell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'ini',
    'ini': 'ini',
  };
  
  return languageMap[extension] || 'plaintext';
}

export default CodeEditor;