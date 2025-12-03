/**
 * LazyCM6Editor - Lazy loading wrappers for CodeMirror 6 editor components.
 * 
 * This module provides React.lazy() wrappers for the CM6Editor component
 * to enable code splitting and improve initial load performance.
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface EditorFallbackProps {
  height?: string | number;
}

function EditorFallback({ height = '100%' }: EditorFallbackProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center bg-muted/30 rounded-md border"
      style={{ height: typeof height === 'number' ? `${height}px` : height, minHeight: '200px' }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
      <span className="text-sm text-muted-foreground">Loading editor...</span>
    </div>
  );
}

export const LazyCM6Editor = lazy(() => 
  import('@/components/editor/CM6Editor').then(mod => ({ default: mod.CM6Editor }))
);

export const LazyCodeEditor = lazy(() => import('@/components/CodeEditor'));

export const LazyReplitCodeEditor = lazy(() => 
  import('@/components/editor/ReplitCodeEditor').then(mod => ({ default: mod.ReplitCodeEditor }))
);

export const LazyMultiTabEditor = lazy(() => 
  import('@/components/editor/MultiTabEditor').then(mod => ({ default: mod.MultiTabEditor }))
);

export const LazyVisualDiffEditor = lazy(() => 
  import('@/components/git/VisualDiffEditor').then(mod => ({ default: mod.VisualDiffEditor }))
);

interface LazyEditorWrapperProps {
  Component: ComponentType<any>;
  fallbackHeight?: string | number;
  [key: string]: any;
}

export function LazyEditorWrapper({ 
  Component, 
  fallbackHeight = '100%',
  ...props 
}: LazyEditorWrapperProps) {
  return (
    <Suspense fallback={<EditorFallback height={fallbackHeight} />}>
      <Component {...props} />
    </Suspense>
  );
}

export function withLazyEditor<P extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallbackHeight?: string | number
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyEditorHOC(props: P) {
    return (
      <Suspense fallback={<EditorFallback height={fallbackHeight} />}>
        <LazyComponent {...props as any} />
      </Suspense>
    );
  };
}

export { EditorFallback };
