import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import { File } from "@/lib/types";
import { setupMonacoTheme } from "@/lib/monaco-setup";

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

const CodeEditor = ({ file, onChange }: CodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // Load Monaco editor
    import('monaco-editor').then(monaco => {
      // Register Monaco editor
      if (editorRef.current && !monacoEditorRef.current) {
        // Setup theme
        setupMonacoTheme();

        // Create editor instance
        monacoEditorRef.current = monaco.editor.create(editorRef.current, {
          value: file.content,
          language: getLanguage(file.name),
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
          lineNumbers: 'on',
          padding: { top: 10 },
          tabSize: 2,
          theme: 'plotDark',
        });

        // Set up change handling
        monacoEditorRef.current.onDidChangeModelContent(() => {
          if (monacoEditorRef.current) {
            onChange(monacoEditorRef.current.getValue());
          }
        });

        setIsEditorReady(true);
      }
    });

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, []);

  // Update editor content when file changes
  useEffect(() => {
    if (monacoEditorRef.current && isEditorReady) {
      // Only update if the model value is different to prevent cursor jumping
      if (monacoEditorRef.current.getValue() !== file.content) {
        monacoEditorRef.current.setValue(file.content);
      }
      
      // Update language when file changes
      monaco.editor.setModelLanguage(
        monacoEditorRef.current.getModel()!,
        getLanguage(file.name)
      );
    }
  }, [file, isEditorReady]);

  return (
    <div className="flex-1 overflow-auto bg-dark">
      <div ref={editorRef} className="h-full w-full" />
    </div>
  );
};

export default CodeEditor;
