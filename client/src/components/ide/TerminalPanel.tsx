import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ReplitTerminalPanel = React.lazy(() => 
  import('@/components/editor/ReplitTerminalPanel').then(module => ({ default: module.ReplitTerminalPanel }))
);

const TerminalFallback = () => (
  <div className="h-full flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Loading terminal...</p>
    </div>
  </div>
);

interface TerminalPanelProps {
  projectId: string;
}

export function TerminalPanel({ projectId }: TerminalPanelProps) {
  return (
    <div className="h-full">
      <Suspense fallback={<TerminalFallback />}>
        <ReplitTerminalPanel projectId={projectId} />
      </Suspense>
    </div>
  );
}
