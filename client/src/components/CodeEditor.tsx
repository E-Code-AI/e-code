import { useEffect, useRef } from "react";
import * as monaco from 'monaco-editor';
import { setupMonacoTheme } from "@/lib/monaco-setup";
import { File } from "@shared/schema";

interface CodeEditorProps {
  file: File;
  onChange: (content: string) => void;
}

const CodeEditor = ({ file, onChange }: CodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
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
      monacoEditorRef.current.onDidChangeModelContent(() => {
        const newValue = monacoEditorRef.current?.getValue() || '';
        onChange(newValue);
      });
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
    <div className="h-full w-full">
      <div 
        ref={editorRef} 
        className="h-full w-full"
      />
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