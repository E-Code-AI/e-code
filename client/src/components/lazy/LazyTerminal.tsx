import { lazy, Suspense, ComponentType } from 'react';
import { Loader2, Terminal as TerminalIcon } from 'lucide-react';

interface TerminalFallbackProps {
  height?: string | number;
}

function TerminalFallback({ height = '300px' }: TerminalFallbackProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center bg-zinc-900 rounded-md border border-zinc-800"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <TerminalIcon className="h-8 w-8 text-zinc-500 mb-2" />
      <Loader2 className="h-5 w-5 animate-spin text-zinc-400 mb-2" />
      <span className="text-sm text-zinc-400">Loading terminal...</span>
    </div>
  );
}

export const LazyTerminal = lazy(() => import('@/components/Terminal'));

export const LazyReplitTerminal = lazy(() => 
  import('@/components/terminal/ReplitTerminal').then(mod => ({ default: mod.ReplitTerminal }))
);

export const LazyAdvancedTerminal = lazy(() => 
  import('@/components/terminal/AdvancedTerminal').then(mod => ({ default: mod.AdvancedTerminal }))
);

export const LazyReplitTerminalPanel = lazy(() => 
  import('@/components/editor/ReplitTerminalPanel').then(mod => ({ default: mod.ReplitTerminalPanel }))
);

export const LazyMobileTerminal = lazy(() => 
  import('@/components/mobile/MobileTerminal').then(mod => ({ default: mod.MobileTerminal }))
);

interface LazyTerminalWrapperProps {
  Component: ComponentType<any>;
  fallbackHeight?: string | number;
  [key: string]: any;
}

export function LazyTerminalWrapper({ 
  Component, 
  fallbackHeight = '300px',
  ...props 
}: LazyTerminalWrapperProps) {
  return (
    <Suspense fallback={<TerminalFallback height={fallbackHeight} />}>
      <Component {...props} />
    </Suspense>
  );
}

export function withLazyTerminal<P extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  fallbackHeight?: string | number
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyTerminalHOC(props: P) {
    return (
      <Suspense fallback={<TerminalFallback height={fallbackHeight} />}>
        <LazyComponent {...props as any} />
      </Suspense>
    );
  };
}
