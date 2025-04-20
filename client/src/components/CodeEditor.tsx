import { useRef, useEffect } from "react";
import * as monaco from "monaco-editor";
import { File } from "@shared/schema";
import { setupMonacoTheme } from "@/lib/monaco-setup";
import { Skeleton } from "@/components/ui/skeleton";

interface CodeEditorProps {
  file: File;
  onChange: (content: string) => void;
}

const CodeEditor = ({ file, onChange }: CodeEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    // Setup Monaco theme when component mounts
    setupMonacoTheme();

    // Dispose editor when component unmounts
    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    if (!monacoEditorRef.current) {
      // Create Monaco editor
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: file.content || "",
        language: getLanguageFromFilename(file.name),
        theme: "vs-dark",
        automaticLayout: true,
        minimap: {
          enabled: true,
          scale: 0.75,
        },
        scrollBeyondLastLine: false,
        fontSize: 14,
        tabSize: 2,
        fontFamily: "'Fira Code', Menlo, Monaco, 'Courier New', monospace",
        fontLigatures: true,
      });

      // Set up change handler
      monacoEditorRef.current.onDidChangeModelContent(() => {
        const value = monacoEditorRef.current?.getValue() || "";
        onChange(value);
      });
    } else {
      // Update editor model if file changes
      const model = monacoEditorRef.current.getModel();
      
      if (model) {
        const currentContent = model.getValue();
        
        if (file.content !== currentContent) {
          // Reuse existing model
          model.setValue(file.content || "");
          monaco.editor.setModelLanguage(model, getLanguageFromFilename(file.name));
        }
      } else {
        // Create a new model if it doesn't exist
        const newModel = monaco.editor.createModel(
          file.content || "",
          getLanguageFromFilename(file.name)
        );
        monacoEditorRef.current.setModel(newModel);
      }
    }
  }, [file, onChange]);

  const getLanguageFromFilename = (filename: string): string => {
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    
    // Map file extensions to Monaco language IDs
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      py: "python",
      rb: "ruby",
      go: "go",
      java: "java",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
      php: "php",
      swift: "swift",
      rs: "rust",
      sh: "shell",
      sql: "sql",
    };

    return languageMap[extension] || "plaintext";
  };

  if (!file) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background text-muted-foreground">
        <p>No file selected</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center px-2 py-1 border-b bg-muted/40">
        <span className="text-sm">{file.name}</span>
      </div>
      {!editorRef.current ? (
        <Skeleton className="h-full w-full" />
      ) : (
        <div ref={editorRef} className="flex-1 overflow-hidden" />
      )}
    </div>
  );
};

export default CodeEditor;