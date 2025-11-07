import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load Monaco Editor with dynamic import
const MonacoEditor = lazy(() => 
  import('monaco-editor').then(monaco => {
    // Configure Monaco on first load
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });
    
    return import('@/components/CodeEditor');
  })
);

interface LazyMonacoEditorProps {
  file: any;
  onChange: (content: string) => void;
  onSelectionChange?: (selectedText: string | undefined) => void;
  collaboration?: any;
}

// Loading skeleton that matches editor dimensions
const EditorSkeleton = () => (
  <div className="flex flex-col h-full w-full bg-[var(--ecode-editor-bg)]">
    <div className="h-12 bg-[var(--ecode-surface)] border-b border-[var(--ecode-border)] px-4 flex items-center space-x-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-6 w-20" />
      <div className="flex-1" />
      <Skeleton className="h-6 w-6 rounded" />
      <Skeleton className="h-6 w-6 rounded" />
    </div>
    <div className="flex-1 p-4 space-y-2">
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  </div>
);

export function LazyMonacoEditor(props: LazyMonacoEditorProps) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <MonacoEditor {...props} />
    </Suspense>
  );
}