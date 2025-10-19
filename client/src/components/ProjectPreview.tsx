// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  RefreshCw, 
  Maximize2,
  Minimize2,
  ExternalLink,
  Terminal,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: Date;
  count?: number;
}

interface ProjectPreviewProps {
  projectId: number;
  url?: string;
  onRefresh?: () => void;
  className?: string;
}

const deviceSizes = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'Tablet' },
  mobile: { width: '375px', height: '667px', label: 'Mobile' },
};

export default function ProjectPreview({ 
  projectId, 
  url: providedUrl, 
  onRefresh,
  className 
}: ProjectPreviewProps) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Construct the preview URL
  const previewUrl = providedUrl || `/preview/${projectId}`;
  
  // Setup console message listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console') {
        const newLog: ConsoleLog = {
          type: event.data.level || 'log',
          message: event.data.message,
          timestamp: new Date(),
        };
        
        setConsoleLogs(prev => {
          // Check if this is a duplicate of the last message
          const lastLog = prev[prev.length - 1];
          if (lastLog && lastLog.message === newLog.message && lastLog.type === newLog.type) {
            // Update count instead of adding duplicate
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastLog,
              count: (lastLog.count || 1) + 1,
            };
            return updated;
          }
          
          // Keep only last 100 logs
          const logs = prev.length >= 100 ? prev.slice(-99) : prev;
          return [...logs, newLog];
        });
        
        // Auto-scroll to bottom
        setTimeout(() => {
          consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 10);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      // Set up auto-refresh interval (every 3 seconds)
      autoRefreshIntervalRef.current = setInterval(() => {
        handleRefresh();
      }, 3000);
    } else {
      // Clear interval if auto-refresh is disabled
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }
    
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [autoRefresh]);
  
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
      setLastRefresh(new Date());
      if (onRefresh) {
        onRefresh();
      }
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const clearConsole = () => {
    setConsoleLogs([]);
  };
  
  const getLogIcon = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'warn':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'info':
        return <Info className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };
  
  const getLogClass = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400 bg-red-950/20';
      case 'warn':
        return 'text-yellow-400 bg-yellow-950/20';
      case 'info':
        return 'text-blue-400 bg-blue-950/20';
      default:
        return 'text-gray-300';
    }
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  
  return (
    <div 
      className={cn(
        "flex flex-col h-full",
        isFullscreen && "fixed inset-0 z-50 bg-background",
        className
      )}
    >
      {/* Preview Toolbar */}
      <div className="h-10 border-b border-border flex items-center px-2 justify-between bg-background">
        <div className="flex items-center gap-2">
          {/* Device selector */}
          <Select value={deviceMode} onValueChange={(value: any) => setDeviceMode(value)}>
            <SelectTrigger className="w-32 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">
                <div className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  Desktop
                </div>
              </SelectItem>
              <SelectItem value="tablet">
                <div className="flex items-center gap-1">
                  <Tablet className="h-3 w-3" />
                  Tablet
                </div>
              </SelectItem>
              <SelectItem value="mobile">
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Mobile
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Device dimensions */}
          {deviceMode !== 'desktop' && (
            <Badge variant="secondary" className="text-xs">
              {deviceSizes[deviceMode].width} × {deviceSizes[deviceMode].height}
            </Badge>
          )}
          
          {/* Auto-refresh toggle */}
          <Button
            variant={autoRefresh ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", autoRefresh && "animate-spin-slow")} />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Loading indicator */}
          {isLoading && (
            <Badge variant="secondary" className="text-xs">
              Loading...
            </Badge>
          )}
          
          {/* Manual refresh */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh preview</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Console toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showConsole ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowConsole(!showConsole)}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  {consoleLogs.length > 0 && !showConsole && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px]">
                      {consoleLogs.length}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle console</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Open in new tab */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open in new tab</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Fullscreen toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview iframe container */}
        <div className={cn(
          "flex-1 flex items-center justify-center bg-muted/20 p-4",
          showConsole && "flex-[2]"
        )}>
          <div 
            className={cn(
              "bg-background rounded-lg shadow-lg overflow-hidden transition-all duration-300",
              deviceMode === 'desktop' && "w-full h-full",
              deviceMode === 'tablet' && "max-w-[768px] w-full h-full max-h-[1024px]",
              deviceMode === 'mobile' && "max-w-[375px] w-full h-full max-h-[667px]"
            )}
            style={{
              width: deviceMode !== 'desktop' ? deviceSizes[deviceMode].width : undefined,
              height: deviceMode !== 'desktop' ? deviceSizes[deviceMode].height : undefined,
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
            />
          </div>
        </div>
        
        {/* Console panel */}
        {showConsole && (
          <div className="flex-1 border-t border-border bg-background">
            <div className="h-8 border-b border-border flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Console</span>
                {consoleLogs.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-1">
                    {consoleLogs.length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={clearConsole}
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowConsole(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100%-32px)]">
              <div className="p-2 font-mono text-xs space-y-1">
                {consoleLogs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-4">
                    No console output yet
                  </div>
                ) : (
                  consoleLogs.map((log, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 px-2 py-1 rounded",
                        getLogClass(log.type)
                      )}
                    >
                      <span className="text-muted-foreground opacity-50 shrink-0">
                        {formatTime(log.timestamp)}
                      </span>
                      {getLogIcon(log.type)}
                      <span className="flex-1 break-all whitespace-pre-wrap">
                        {log.message}
                      </span>
                      {log.count && log.count > 1 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] shrink-0">
                          {log.count}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
                <div ref={consoleEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}