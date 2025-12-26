import { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Copy, 
  Download, 
  Play,
  CheckCircle, 
  XCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRuntimeLogs, RuntimeLogEntry } from '@/hooks/useRuntimeLogs';
import { useToast } from '@/hooks/use-toast';

interface ConsoleLog {
  id: string;
  type: 'info' | 'error' | 'warn' | 'log' | 'debug' | 'stdout' | 'stderr' | 'system' | 'exit';
  message: string;
  timestamp: Date;
  stack?: string;
}

interface ReplitConsolePanelProps {
  projectId: string | number;
  userId?: string | number;
  isRunning?: boolean;
  executionId?: string;
  className?: string;
}

export function ReplitConsolePanel({ projectId, userId, isRunning, executionId, className }: ReplitConsolePanelProps) {
  const { toast } = useToast();
  
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const handleLog = useCallback((log: RuntimeLogEntry) => {
    const consoleLog: ConsoleLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: log.type === 'stderr' ? 'error' : log.type === 'exit' ? 'info' : log.type,
      message: log.content,
      timestamp: new Date(log.timestamp),
    };
    
    setLogs(prev => [...prev, consoleLog]);
    
    if (autoScrollRef.current && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 10);
    }
  }, []);

  const { isConnected, isComplete, exitCode, connect, disconnect, clearLogs: clearWsLogs } = useRuntimeLogs({
    projectId,
    userId,
    executionId,
    enabled: Boolean(isRunning && executionId),
    onLog: handleLog,
  });

  useEffect(() => {
    if (isRunning && executionId) {
      setLogs([]);
      connect(executionId);
    } else if (!isRunning) {
      disconnect();
    }
  }, [isRunning, executionId, connect, disconnect]);

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const clearLogs = () => {
    setLogs([]);
    clearWsLogs();
  };

  const copyLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.timestamp.toLocaleTimeString()}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const downloadLogs = () => {
    const text = filteredLogs
      .map(log => `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.message}${log.stack ? '\n' + log.stack : ''}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${projectId}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
      case 'stderr':
        return 'text-destructive';
      case 'warn': 
        return 'text-[hsl(var(--chart-4))]';
      case 'info':
      case 'system':
        return 'text-primary';
      case 'debug': 
        return 'text-muted-foreground';
      case 'stdout':
      case 'log':
        return 'text-foreground';
      case 'exit':
        return 'text-[hsl(var(--chart-2))]';
      default: 
        return 'text-foreground';
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)} data-testid="replit-console-panel">
      <div className="h-9 flex items-center justify-between px-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted border border-border">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-medium">Console</span>
          </div>
          
          {isRunning && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className={cn(
                "w-2 h-2 rounded-full animate-pulse",
                isConnected ? "bg-green-500" : "bg-yellow-500"
              )} />
              <span>{isConnected ? 'Live' : 'Connecting...'}</span>
            </div>
          )}
          
          {isComplete && exitCode !== null && (
            <div className="flex items-center gap-1">
              {exitCode === 0 ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={cn("text-xs", exitCode === 0 ? "text-green-500" : "text-red-500")}>
                Exit: {exitCode}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setFilter('all')}
            data-testid="console-filter-all"
          >
            All ({logs.length})
          </Button>
          <Button
            variant={filter === 'error' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setFilter('error')}
            data-testid="console-filter-error"
          >
            Errors
          </Button>
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearLogs} title="Clear" data-testid="console-clear">
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyLogs} title="Copy" data-testid="console-copy">
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={downloadLogs} title="Download" data-testid="console-download">
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <ScrollArea 
        className="flex-1 font-mono text-xs"
        onScroll={(e) => {
          const target = e.target as HTMLElement;
          const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight;
          autoScrollRef.current = isAtBottom;
        }}
      >
        <div className="p-2 space-y-0.5">
          {filteredLogs.length === 0 ? (
            <div className="text-muted-foreground text-center py-8" data-testid="console-empty">
              {isRunning ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Waiting for output...</span>
                </div>
              ) : (
                <span>Click "Run" to see output</span>
              )}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="group hover:bg-muted/50 px-2 py-0.5 rounded" data-testid={`console-log-${log.id}`}>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">
                    [{log.timestamp.toLocaleTimeString()}]
                  </span>
                  <span className={cn("font-semibold uppercase text-[10px]", getLogColor(log.type))}>
                    {log.type}
                  </span>
                  <span className="break-all whitespace-pre-wrap">{log.message}</span>
                </div>
                {log.stack && (
                  <pre className="ml-16 mt-1 text-muted-foreground text-[10px] whitespace-pre-wrap">
                    {log.stack}
                  </pre>
                )}
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
