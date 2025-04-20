import React, { useState } from 'react';
import Terminal from './Terminal';
import { Button } from '@/components/ui/button';
import { TerminalSquare } from 'lucide-react';

interface TerminalPanelProps {
  projectId: number;
  showByDefault?: boolean;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ 
  projectId,
  showByDefault = false
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
    <div className="terminal-panel">
      {!showTerminal ? (
        <div className="flex justify-end p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTerminal}
            className="flex items-center gap-1"
          >
            <TerminalSquare className="h-4 w-4" />
            <span>Show Terminal</span>
          </Button>
        </div>
      ) : (
        <div className={`terminal-wrapper ${isMaximized ? 'z-50' : ''}`}>
          <Terminal
            projectId={projectId}
            onClose={toggleTerminal}
            isMaximized={isMaximized}
            onToggleMaximize={toggleMaximize}
          />
        </div>
      )}
    </div>
  );
};

export default TerminalPanel;