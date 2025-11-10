import { Button } from '@/components/ui/button';
import { Command, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  gitBranch: string;
  isRunning: boolean;
  cursorPosition: { line: number; column: number };
  language: string;
  encoding: string;
  onShowShortcuts: () => void;
}

export function StatusBar({
  gitBranch,
  isRunning,
  cursorPosition,
  language,
  encoding,
  onShowShortcuts
}: StatusBarProps) {
  return (
    <div className="h-6 border-t bg-muted/50 flex items-center px-4 gap-4 text-xs">
      {/* Git Branch */}
      <div className="flex items-center gap-2" data-testid="status-git-branch">
        <span className="text-muted-foreground">Branch:</span>
        <span className="font-medium">{gitBranch}</span>
      </div>
      
      {/* Running Status */}
      <div className="flex items-center gap-2" data-testid="status-running">
        <Circle
          className={cn(
            "h-2 w-2",
            isRunning ? "fill-green-500 text-green-500" : "fill-gray-500 text-gray-500"
          )}
        />
        <span>{isRunning ? 'Running' : 'Stopped'}</span>
      </div>
      
      {/* Spacer */}
      <div className="flex-1" />
      
      {/* Cursor Position */}
      <div className="flex items-center gap-2" data-testid="status-cursor">
        <span className="text-muted-foreground">Ln</span>
        <span>{cursorPosition.line}</span>
        <span className="text-muted-foreground">,</span>
        <span className="text-muted-foreground">Col</span>
        <span>{cursorPosition.column}</span>
      </div>
      
      {/* Language */}
      <div className="flex items-center gap-2" data-testid="status-language">
        <span>{language}</span>
      </div>
      
      {/* Encoding */}
      <div className="flex items-center gap-2" data-testid="status-encoding">
        <span>{encoding}</span>
      </div>
      
      {/* Shortcuts Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShowShortcuts}
        data-testid="button-show-shortcuts"
        className="h-5 px-2 gap-1"
      >
        <Command className="h-3 w-3" />
        <span>Shortcuts</span>
      </Button>
    </div>
  );
}
