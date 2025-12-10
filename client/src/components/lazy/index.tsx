export * from './LazyCM6Editor';
export * from './LazyTerminal';
export * from './LazyAgGrid';
export * from './LazyCharts';

import { lazy, Suspense, ReactNode } from 'react';
import { ECodeLoading } from '@/components/ECodeLoading';

export const LazyDatabaseManagement = lazy(() => 
  import('@/components/DatabaseManagement').then(mod => ({ default: mod.DatabaseManagement }))
);

export const LazyReplitJSONEditor = lazy(() => 
  import('@/components/ReplitJSONEditor').then(mod => ({ default: mod.ReplitJSONEditor }))
);

export const LazyCodeGenerationPanel = lazy(() => 
  import('@/components/CodeGenerationPanel').then(mod => ({ default: mod.CodeGenerationPanel }))
);

export const LazyRealTimeCollaboration = lazy(() => 
  import('@/components/collaboration/RealTimeCollaboration').then(mod => ({ default: mod.RealTimeCollaboration }))
);

export const LazyGitBlameDecorator = lazy(() => 
  import('@/components/git/GitBlameDecorator').then(mod => ({ default: mod.GitBlameDecorator }))
);

export function createSuspenseWrapper<P extends object>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<P>>,
  fallback?: ReactNode
): React.FC<P> {
  return function SuspenseWrapper(props: P) {
    const Component = LazyComponent as unknown as React.ComponentType<P>;
    return (
      <Suspense fallback={fallback || <ECodeLoading size="md" text="Loading..." />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
