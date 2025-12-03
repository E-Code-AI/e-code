import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Table } from 'lucide-react';

interface GridFallbackProps {
  height?: string | number;
  rows?: number;
}

function GridFallback({ height = '400px', rows = 5 }: GridFallbackProps) {
  return (
    <div 
      className="flex flex-col bg-background rounded-md border overflow-hidden"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <Table className="h-4 w-4 text-muted-foreground" />
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading data grid...</span>
      </div>
      <div className="flex-1 p-2 space-y-2">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export const LazyAgentSessionsGrid = lazy(() => 
  import('@/components/grids/AgentSessionsGrid').then(mod => ({ default: mod.AgentSessionsGrid }))
);

export const LazyAgentActionsGrid = lazy(() => 
  import('@/components/grids/AgentActionsGrid').then(mod => ({ default: mod.AgentActionsGrid }))
);

export const LazyConversationHistoryGrid = lazy(() => 
  import('@/components/grids/ConversationHistoryGrid').then(mod => ({ default: mod.ConversationHistoryGrid }))
);

export const LazyFileOperationsGrid = lazy(() => 
  import('@/components/grids/FileOperationsGrid').then(mod => ({ default: mod.FileOperationsGrid }))
);

interface LazyGridWrapperProps {
  Component: ComponentType<any>;
  fallbackHeight?: string | number;
  fallbackRows?: number;
  [key: string]: any;
}

export function LazyGridWrapper({ 
  Component, 
  fallbackHeight = '400px',
  fallbackRows = 5,
  ...props 
}: LazyGridWrapperProps) {
  return (
    <Suspense fallback={<GridFallback height={fallbackHeight} rows={fallbackRows} />}>
      <Component {...props} />
    </Suspense>
  );
}

export function withLazyGrid<P extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallbackHeight?: string | number,
  fallbackRows?: number
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyGridHOC(props: P) {
    return (
      <Suspense fallback={<GridFallback height={fallbackHeight} rows={fallbackRows} />}>
        <LazyComponent {...props as any} />
      </Suspense>
    );
  };
}
