import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { File } from "@/lib/types";

interface CodeEditorProps {
  file: File;
  onChange: (content: string) => void;
}

// Helper to get language from file extension
const getLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'sh': 'shell',
  };
  
  return languageMap[ext] || 'plaintext';
};

// Simple Monaco setup
if (typeof window !== 'undefined') {
  (window as any).MonacoEnvironment = {
    getWorkerUrl: function() {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
        self.MonacoEnvironment = {
          baseUrl: 'https://unpkg.com/monaco-editor@0.36.1/min/'
        };
        importScripts('https://unpkg.com/monaco-editor@0.36.1/min/vs/base/worker/workerMain.js');
      `)}`;
    }
  };
}

const CodeEditor = ({ file, onChange }: CodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Init editor
  useEffect(() => {
    if (!editorRef.current) return;
    
    // Create editor
    const editorInstance = monaco.editor.create(editorRef.current, {
      value: file.content,
      language: getLanguage(file.name),
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
      lineNumbers: 'on',
      tabSize: 2,
      theme: 'vs-dark',
    });
    
    // Set up change event
    editorInstance.onDidChangeModelContent(() => {
      onChange(editorInstance.getValue());
    });
    
    setEditor(editorInstance);
    
    // Cleanup
    return () => {
      editorInstance.dispose();
    };
  }, []);
  
  // Update content when file changes
  useEffect(() => {
    if (editor) {
      // Only update if value is different
      if (editor.getValue() !== file.content) {
        editor.setValue(file.content);
      }
      
      // Update language
      monaco.editor.setModelLanguage(
        editor.getModel()!,
        getLanguage(file.name)
      );
    }
  }, [file, editor]);
  
  return (
    <div className="flex-1 overflow-auto bg-dark">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
};

export default CodeEditor;
