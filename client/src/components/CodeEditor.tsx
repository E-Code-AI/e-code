import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { File } from "@shared/schema";
import { setupMonacoTheme } from "@/lib/monaco-setup";

// Initialize Monaco theme
setupMonacoTheme();

interface CodeEditorProps {
  file: File;
  onChange: (content: string) => void;
}

const CodeEditor = ({ file, onChange }: CodeEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  
  // Initialize editor
  useEffect(() => {
    if (containerRef.current) {
      // Get language from file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      let language = 'plaintext';
      
      // Map extensions to languages
      switch (ext) {
        case 'js':
          language = 'javascript';
          break;
        case 'jsx':
          language = 'javascript';
          break;
        case 'ts':
          language = 'typescript';
          break;
        case 'tsx':
          language = 'typescript';
          break;
        case 'html':
          language = 'html';
          break;
        case 'css':
          language = 'css';
          break;
        case 'json':
          language = 'json';
          break;
        case 'md':
          language = 'markdown';
          break;
        case 'py':
          language = 'python';
          break;
        default:
          language = 'plaintext';
      }
      
      // Create editor
      const editor = monaco.editor.create(containerRef.current, {
        value: file.content || '',
        language,
        theme: 'replitDark',
        automaticLayout: true,
        minimap: {
          enabled: true,
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        tabSize: 2,
        wordWrap: 'on',
      });
      
      // Set up change event
      const changeDisposable = editor.onDidChangeModelContent(() => {
        const value = editor.getValue();
        onChange(value);
      });
      
      editorRef.current = editor;
      
      // Cleanup
      return () => {
        changeDisposable.dispose();
        editor.dispose();
      };
    }
  }, [file.id]); // Only recreate the editor when the file changes
  
  // Update editor content when file content changes
  useEffect(() => {
    if (editorRef.current && containerRef.current) {
      const currentValue = editorRef.current.getValue();
      const newValue = file.content || '';
      
      // Only update if the values are different to avoid cursor jumping
      if (currentValue !== newValue) {
        editorRef.current.setValue(newValue);
      }
    }
  }, [file.content]);
  
  return (
    <div ref={containerRef} className="w-full h-full" />
  );
};

export default CodeEditor;