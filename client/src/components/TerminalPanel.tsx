import React, { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { TerminalSquare, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

const Terminal = React.lazy(() => import('./Terminal'));

const TerminalLoadingFallback = () => (
  <div className="h-full flex items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-xs text-muted-foreground">Loading terminal...</p>
    </div>
  </div>
);

interface TerminalPanelProps {
  projectId: number;
  showByDefault?: boolean;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ 
  projectId,
  showByDefault = true // Default to showing the terminal
}) => {
  const [showTerminal, setShowTerminal] = useState(showByDefault);
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleTerminal = () => {
    setShowTerminal(!showTerminal);
    // If we're hiding the terminal, also ensure it's not maximized
    if (showTerminal && isMaximized) {
      setIsMaximized(false);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div className="terminal-panel border-t bg-slate-950">
      {!showTerminal ? (
        <div className="flex justify-between items-center p-2 bg-slate-900 border-b">
          <div className="text-sm font-medium">Terminal</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTerminal}
            className="flex items-center gap-1 text-gray-400 hover:text-white"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="sr-only">Show Terminal</span>
          </Button>
        </div>
      ) : (
        <div className={`terminal-wrapper ${isMaximized ? 'z-50 fixed inset-0' : ''}`}>
          <Suspense fallback={<TerminalLoadingFallback />}>
            <Terminal
              project={{ id: projectId }}
              onClose={toggleTerminal}
              minimized={false}
              onMinimize={() => setIsMaximized(false)}
              onMaximize={() => setIsMaximized(true)}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default TerminalPanel;