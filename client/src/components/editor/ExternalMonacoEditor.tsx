/**
 * ExternalMonacoEditor - A Monaco Editor component that uses the globally loaded Monaco instance.
 * 
 * This component does NOT import from 'monaco-editor' or '@monaco-editor/react' at runtime.
 * Monaco is loaded via CDN script in index.html and accessed via window.monaco.
 * 
 * Type imports are OK as they're stripped at compile time.
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { getMonaco, initMonaco, type Monaco } from '@/lib/monaco-cdn-loader';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExternalMonacoEditorProps {
  value?: string;
  defaultValue?: string;
  language?: string;
  theme?: string;
  height?: string | number;
  width?: string | number;
  options?: MonacoEditorType.IStandaloneEditorConstructionOptions;
  onChange?: (value: string | undefined, ev: MonacoEditorType.IModelContentChangedEvent) => void;
  onMount?: (editor: MonacoEditorType.IStandaloneCodeEditor, monaco: Monaco) => void;
  beforeMount?: (monaco: Monaco) => void;
  className?: string;
  loading?: React.ReactNode;
  line?: number;
  saveViewState?: boolean;
  keepCurrentModel?: boolean;
  path?: string;
}

export interface ExternalMonacoEditorHandle {
  getEditor: () => MonacoEditorType.IStandaloneCodeEditor | null;
  getMonaco: () => Monaco | null;
  getValue: () => string | undefined;
  setValue: (value: string) => void;
  focus: () => void;
}

function EditorLoading({ height }: { height?: string | number }) {
  return (
    <div 
      className="flex flex-col items-center justify-center bg-muted/30 rounded-md border"
      style={{ height: typeof height === 'number' ? `${height}px` : height || '100%', minHeight: '200px' }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">Loading editor...</span>
    </div>
  );
}

export const ExternalMonacoEditor = forwardRef<ExternalMonacoEditorHandle, ExternalMonacoEditorProps>(
  function ExternalMonacoEditor(props, ref) {
    const {
      value,
      defaultValue,
      language = 'javascript',
      theme = 'vs-dark',
      height = '100%',
      width = '100%',
      options = {},
      onChange,
      onMount,
      beforeMount,
      className,
      loading,
      line,
      saveViewState = true,
      keepCurrentModel = false,
      path,
    } = props;

    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const subscriptionRef = useRef<MonacoEditorType.IDisposable | null>(null);
    const viewStatesRef = useRef<Map<string, MonacoEditorType.ICodeEditorViewState>>(new Map());
    const [isMonacoReady, setIsMonacoReady] = useState(false);
    const [isEditorMounted, setIsEditorMounted] = useState(false);
    const valueRef = useRef(value ?? defaultValue ?? '');
    const preventOnChangeRef = useRef(false);

    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
      getMonaco: () => monacoRef.current,
      getValue: () => editorRef.current?.getValue(),
      setValue: (newValue: string) => {
        if (editorRef.current) {
          preventOnChangeRef.current = true;
          editorRef.current.setValue(newValue);
          preventOnChangeRef.current = false;
        }
      },
      focus: () => editorRef.current?.focus(),
    }));

    useEffect(() => {
      let cancelled = false;

      initMonaco()
        .then((monaco) => {
          if (!cancelled) {
            monacoRef.current = monaco;
            setIsMonacoReady(true);
          }
        })
        .catch((error) => {
          console.error('[ExternalMonacoEditor] Failed to load Monaco:', error);
        });

      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      if (!isMonacoReady || !containerRef.current || !monacoRef.current) return;

      const monaco = monacoRef.current;

      if (beforeMount) {
        beforeMount(monaco);
      }

      const defaultOptions: MonacoEditorType.IStandaloneEditorConstructionOptions = {
        automaticLayout: true,
        fontSize: 14,
        fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        mouseWheelZoom: true,
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always',
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        selectionHighlight: true,
        formatOnType: true,
        formatOnPaste: true,
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showClasses: true,
          showFunctions: true,
          showVariables: true,
          showModules: true,
          showProperties: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        ...options,
      };

      const modelUri = path ? monaco.Uri.parse(path) : undefined;
      let model = modelUri ? monaco.editor.getModel(modelUri) : null;
      
      if (!model) {
        model = monaco.editor.createModel(
          valueRef.current,
          language,
          modelUri
        );
      } else if (!keepCurrentModel) {
        model.setValue(valueRef.current);
        monaco.editor.setModelLanguage(model, language);
      }

      const editor = monaco.editor.create(containerRef.current, {
        model,
        theme,
        ...defaultOptions,
      });

      editorRef.current = editor;

      if (line) {
        editor.revealLineInCenter(line);
        editor.setPosition({ lineNumber: line, column: 1 });
      }

      if (path && saveViewState) {
        const viewState = viewStatesRef.current.get(path);
        if (viewState) {
          editor.restoreViewState(viewState);
        }
      }

      subscriptionRef.current = editor.onDidChangeModelContent((event) => {
        if (preventOnChangeRef.current) return;
        const currentValue = editor.getValue();
        valueRef.current = currentValue;
        onChange?.(currentValue, event);
      });

      if (onMount) {
        onMount(editor, monaco);
      }

      setIsEditorMounted(true);

      return () => {
        if (path && saveViewState && editorRef.current) {
          const viewState = editorRef.current.saveViewState();
          if (viewState) {
            viewStatesRef.current.set(path, viewState);
          }
        }

        subscriptionRef.current?.dispose();
        
        if (!keepCurrentModel) {
          editorRef.current?.getModel()?.dispose();
        }
        
        editorRef.current?.dispose();
        editorRef.current = null;
        setIsEditorMounted(false);
      };
    }, [isMonacoReady, path, keepCurrentModel]);

    useEffect(() => {
      if (editorRef.current && value !== undefined && value !== editorRef.current.getValue()) {
        preventOnChangeRef.current = true;
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(value);
        if (position) {
          editorRef.current.setPosition(position);
        }
        preventOnChangeRef.current = false;
        valueRef.current = value;
      }
    }, [value]);

    useEffect(() => {
      if (editorRef.current && monacoRef.current && language) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelLanguage(model, language);
        }
      }
    }, [language]);

    useEffect(() => {
      if (editorRef.current && monacoRef.current && theme) {
        monacoRef.current.editor.setTheme(theme);
      }
    }, [theme]);

    useEffect(() => {
      if (editorRef.current && options) {
        editorRef.current.updateOptions(options);
      }
    }, [options]);

    if (!isMonacoReady) {
      return loading ?? <EditorLoading height={height} />;
    }

    return (
      <div
        ref={containerRef}
        className={cn('overflow-hidden', className)}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: typeof width === 'number' ? `${width}px` : width,
        }}
      />
    );
  }
);

export default ExternalMonacoEditor;
