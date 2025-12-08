import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Terminal,
  Trash2,
  Lock,
  Unlock,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { BuildLog } from '@shared/schema';

interface OutputLine {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
}

interface ReplitOutputPanelProps {
  projectId?: string;
}

function ShimmerSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div 
            className="h-4 w-16 rounded bg-[#3d4452] animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
          <div 
            className="h-4 w-12 rounded bg-[#3d4452] animate-pulse"
            style={{ animationDelay: `${i * 100 + 50}ms` }}
          />
          <div 
            className="h-4 flex-1 rounded bg-[#3d4452] animate-pulse"
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-[#242b3d] flex items-center justify-center mb-4">
        <Terminal className="w-[18px] h-[18px] text-[#5c6670]" />
      </div>
      <h3 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2">
        No output yet
      </h3>
      <p className="text-[15px] leading-[20px] text-[#5c6670] max-w-[280px]">
        Run your project to see output, logs, and build information here.
      </p>
    </div>
  );
}

export function ReplitOutputPanel({ projectId }: ReplitOutputPanelProps) {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedSource, setSelectedSource] = useState('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: initialLogs, isLoading } = useQuery<BuildLog[]>({
    queryKey: ['/api/workspace/projects', projectId, 'build-logs'],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (initialLogs) {
      const logs: OutputLine[] = initialLogs.map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleTimeString(),
        level: log.level as 'info' | 'warn' | 'error' | 'debug',
        message: log.message,
        source: log.source || 'build',
      }));
      setOutput(logs);
    }
  }, [initialLogs]);

  useEffect(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/build-logs/ws?projectId=${projectId}`);

    ws.onopen = () => {};

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'initial') {
          return;
        }
        
        if (data.type === 'log' && data.log) {
          const log = data.log as BuildLog;
          const newLine: OutputLine = {
            id: log.id,
            timestamp: new Date(log.timestamp).toLocaleTimeString(),
            level: log.level as 'info' | 'warn' | 'error' | 'debug',
            message: log.message,
            source: log.source || 'build',
          };
          setOutput(prev => [...prev, newLine]);
        }
        
        if (data.type === 'cleared') {
          setOutput([]);
        }
      } catch (error) {
        console.error('[Output] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Output] WebSocket error:', error);
    };

    ws.onclose = () => {};

    return () => {
      ws.close();
    };
  }, [projectId]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, autoScroll]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-[#ff6b6b]';
      case 'warn':
        return 'text-[#ffc107]';
      case 'info':
        return 'text-[#0079f2]';
      case 'debug':
        return 'text-[#9da2a6]';
      default:
        return 'text-[#d4d8dd]';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <span className="text-[11px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#ff6b6b]/20 text-[#ff6b6b]">
            ERROR
          </span>
        );
      case 'warn':
        return (
          <span className="text-[11px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#ffc107]/20 text-[#ffc107]">
            WARN
          </span>
        );
      case 'info':
        return (
          <span className="text-[11px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#0079f2]/20 text-[#0079f2]">
            INFO
          </span>
        );
      case 'debug':
        return (
          <span className="text-[11px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#3d4452] text-[#9da2a6]">
            DEBUG
          </span>
        );
      default:
        return null;
    }
  };

  const sources = ['all', ...new Set(output.map(line => line.source))];

  const filteredOutput = output.filter(line => {
    if (filter !== 'all' && line.level !== filter) return false;
    if (selectedSource !== 'all' && line.source !== selectedSource) return false;
    if (searchQuery && !line.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const clearOutput = async () => {
    if (!projectId) return;
    
    try {
      await apiRequest('DELETE', `/api/workspace/projects/${projectId}/build-logs`, {});
      setOutput([]);
    } catch (error) {
      console.error('[Output] Error clearing logs:', error);
    }
  };

  const showEmpty = !isLoading && output.length === 0;
  const showNoMatches = !isLoading && output.length > 0 && filteredOutput.length === 0;

  return (
    <div className="h-full flex flex-col bg-[#0e1525]">
      {/* Header */}
      <div className="p-3 border-b border-[#3d4452] flex-shrink-0 min-h-[48px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-[18px] h-[18px] text-[#5c6670]" />
            <h3 className="text-[17px] font-medium leading-tight text-[#ffffff]">
              Output
            </h3>
            <span className="text-[11px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded bg-[#242b3d] text-[#9da2a6]">
              {filteredOutput.length} lines
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="h-8 w-8 p-0 rounded-lg hover:bg-[#242b3d]"
              data-testid="button-toggle-autoscroll"
            >
              {autoScroll ? (
                <Unlock className="w-[18px] h-[18px] text-[#9da2a6]" />
              ) : (
                <Lock className="w-[18px] h-[18px] text-[#9da2a6]" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOutput}
              className="h-8 w-8 p-0 rounded-lg hover:bg-[#242b3d]"
              data-testid="button-clear-output"
            >
              <Trash2 className="w-[18px] h-[18px] text-[#9da2a6]" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-8 w-32 text-[13px] rounded-lg bg-[#1c2333] border-[#3d4452] text-[#d4d8dd]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1c2333] border-[#3d4452]">
              {sources.map(source => (
                <SelectItem 
                  key={source} 
                  value={source} 
                  className="text-[13px] text-[#d4d8dd] focus:bg-[#242b3d] focus:text-[#ffffff]"
                >
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-8 w-28 text-[13px] rounded-lg bg-[#1c2333] border-[#3d4452] text-[#d4d8dd]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1c2333] border-[#3d4452]">
              <SelectItem value="all" className="text-[13px] text-[#d4d8dd] focus:bg-[#242b3d] focus:text-[#ffffff]">All</SelectItem>
              <SelectItem value="info" className="text-[13px] text-[#d4d8dd] focus:bg-[#242b3d] focus:text-[#ffffff]">Info</SelectItem>
              <SelectItem value="warn" className="text-[13px] text-[#d4d8dd] focus:bg-[#242b3d] focus:text-[#ffffff]">Warnings</SelectItem>
              <SelectItem value="error" className="text-[13px] text-[#d4d8dd] focus:bg-[#242b3d] focus:text-[#ffffff]">Errors</SelectItem>
              <SelectItem value="debug" className="text-[13px] text-[#d4d8dd] focus:bg-[#242b3d] focus:text-[#ffffff]">Debug</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#5c6670]" />
            <Input
              type="text"
              placeholder="Search output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9 text-[13px] rounded-lg bg-[#1c2333] border-[#3d4452] text-[#d4d8dd] placeholder:text-[#5c6670]"
              data-testid="input-search-output"
            />
          </div>
        </div>
      </div>

      {/* Output Lines */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        {isLoading ? (
          <ShimmerSkeleton />
        ) : showEmpty ? (
          <EmptyState />
        ) : showNoMatches ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-[#242b3d] flex items-center justify-center mb-4">
              <Search className="w-[18px] h-[18px] text-[#5c6670]" />
            </div>
            <h3 className="text-[17px] font-medium leading-tight text-[#ffffff] mb-2">
              No matching output
            </h3>
            <p className="text-[15px] leading-[20px] text-[#5c6670] max-w-[280px]">
              Try adjusting your filters or search query.
            </p>
          </div>
        ) : (
          <div className="p-3 font-mono text-[13px]">
            {filteredOutput.map((line) => (
              <div
                key={line.id}
                className="flex items-start gap-3 py-1.5 px-2 hover:bg-[#1c2333] rounded-lg transition-colors"
                data-testid={`output-line-${line.level}`}
              >
                <span className="text-[13px] text-[#5c6670] flex-shrink-0 tabular-nums">
                  {line.timestamp}
                </span>
                <span className="flex-shrink-0">
                  {getLevelBadge(line.level)}
                </span>
                <span className={cn("flex-1 break-all whitespace-pre-wrap text-[15px] leading-[20px]", getLevelColor(line.level))}>
                  {line.message}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
