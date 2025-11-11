import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Terminal,
  Trash2,
  Lock,
  Unlock,
  Filter,
  Search,
  ChevronDown
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

export function ReplitOutputPanel({ projectId }: ReplitOutputPanelProps) {
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedSource, setSelectedSource] = useState('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch initial build logs from API
  const { data: initialLogs } = useQuery<BuildLog[]>({
    queryKey: ['/api/workspace/projects', projectId, 'build-logs'],
    enabled: !!projectId,
  });

  // Load initial logs when they're fetched
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

  // Connect to real-time output stream via WebSocket
  useEffect(() => {
    if (!projectId) return;

    // Connect to build logs WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/build-logs/ws?projectId=${projectId}`);

    ws.onopen = () => {
      console.log('[Output] Connected to build logs stream');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'initial') {
          // Initial logs already loaded from API, skip
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

    ws.onclose = () => {
      console.log('[Output] Disconnected from build logs stream');
    };

    return () => {
      ws.close();
    };
  }, [projectId]);

  // Auto-scroll to bottom when new output arrives
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, autoScroll]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-status-critical';
      case 'warn':
        return 'text-status-warning';
      case 'info':
        return 'text-status-info';
      case 'debug':
        return 'text-muted-foreground';
      default:
        return 'text-[var(--ecode-text)]';
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive" className="text-xs">ERROR</Badge>;
      case 'warn':
        return <Badge className="text-xs bg-status-warning/100">WARN</Badge>;
      case 'info':
        return <Badge variant="secondary" className="text-xs">INFO</Badge>;
      case 'debug':
        return <Badge variant="outline" className="text-xs">DEBUG</Badge>;
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

  return (
    <div className="h-full flex flex-col bg-[var(--ecode-surface)]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-[var(--ecode-border)] flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-[var(--ecode-text-secondary)]" />
            <h3 className="font-semibold text-[var(--ecode-text)] font-[family-name:var(--ecode-font-sans)]">
              Output
            </h3>
            <Badge variant="secondary" className="text-xs">
              {filteredOutput.length} lines
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="h-7 px-2"
              data-testid="button-toggle-autoscroll"
            >
              {autoScroll ? (
                <Unlock className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOutput}
              className="h-7 px-2"
              data-testid="button-clear-output"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sources.map(source => (
                <SelectItem key={source} value={source} className="text-xs">
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="info" className="text-xs">Info</SelectItem>
              <SelectItem value="warn" className="text-xs">Warnings</SelectItem>
              <SelectItem value="error" className="text-xs">Errors</SelectItem>
              <SelectItem value="debug" className="text-xs">Debug</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ecode-text-secondary)]" />
            <Input
              type="text"
              placeholder="Search output..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-7 text-xs"
              data-testid="input-search-output"
            />
          </div>
        </div>
      </div>

      {/* Output Lines */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-2 font-[family-name:var(--ecode-font-mono)] text-xs">
          {filteredOutput.length === 0 ? (
            <div className="text-center py-8 text-[var(--ecode-text-secondary)]">
              {output.length === 0 ? 'No output yet. Run your project to see output here.' : 'No matching output lines.'}
            </div>
          ) : (
            filteredOutput.map((line) => (
              <div
                key={line.id}
                className="flex items-start gap-2 py-1 hover:bg-[var(--ecode-sidebar-hover)] px-2 rounded"
                data-testid={`output-line-${line.level}`}
              >
                <span className="text-[var(--ecode-text-secondary)] flex-shrink-0">
                  {line.timestamp}
                </span>
                <span className="flex-shrink-0">
                  {getLevelBadge(line.level)}
                </span>
                <span className={cn("flex-1 break-all whitespace-pre-wrap", getLevelColor(line.level))}>
                  {line.message}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
