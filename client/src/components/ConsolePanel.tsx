import { useEffect, useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Terminal, Pause, Play, RotateCw, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface ConsoleLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface ConsolePanelProps {
  projectId: number;
  className?: string;
}

export function ConsolePanel({ projectId, className }: ConsolePanelProps) {
  const [isOptimizing, setIsOptimizing] = useState(true);
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulate optimization message
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOptimizing(false);
      // Add initial logs after optimization
      setLogs([
        {
          timestamp: '15:57:48',
          level: 'info',
          message: 'reloading process'
        },
        {
          timestamp: '15:57:48',
          level: 'info',
          message: 'NODE_ENV: development'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Generated icon-144.png'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Generated icon-192.png'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Generated icon-256.png'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Generated icon-512.png'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'All favicon files generated successfully'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: '12:57:50 PM [express] Favicons generated'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Using custom JWT authentication for production'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Next automatic backup scheduled for: 2025-06-22'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: '12:57:50 PM [express] serving on port 5000'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Backup service initialized'
        },
        {
          timestamp: '15:57:50',
          level: 'info',
          message: 'Database connection established'
        }
      ]);
    }, 3000); // Show optimizing for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (!isPaused && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  // Fetch real logs (when backend endpoint is available)
  const { data: realLogs } = useQuery({
    queryKey: [`/api/projects/${projectId}/logs`],
    refetchInterval: isPaused ? false : 2000, // Poll every 2 seconds when not paused
    enabled: !isOptimizing,
  });

  const clearLogs = () => {
    setLogs([]);
  };

  const restart = () => {
    setIsOptimizing(true);
    setLogs([]);
    // Restart optimization simulation
    setTimeout(() => {
      setIsOptimizing(false);
    }, 3000);
  };

  const getLogColor = (level: ConsoleLog['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <Card className={cn("flex flex-col h-full bg-gray-900", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Console</span>
          {!isOptimizing && (
            <Badge variant="outline" className="text-xs text-green-500 border-green-500">
              Running
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPaused(!isPaused)}
            className="h-6 w-6 text-gray-400 hover:text-gray-200"
          >
            {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={restart}
            className="h-6 w-6 text-gray-400 hover:text-gray-200"
          >
            <RotateCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearLogs}
            className="h-6 w-6 text-gray-400 hover:text-gray-200"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 font-mono text-xs">
          {isOptimizing ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
              <p className="text-gray-300 text-sm font-sans">
                Optimizing agent memory. This is taking longer than usual.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-gray-500 whitespace-nowrap">
                    07-27 {log.timestamp}
                  </span>
                  <span className={cn("flex-1", getLogColor(log.level))}>
                    {log.message}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}