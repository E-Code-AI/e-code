import { useState, useEffect, useRef } from 'react';
import { File } from '@shared/schema';
import { 
  RefreshCw, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Smartphone, 
  Tablet, 
  Monitor,
  Bug,
  Play,
  Square,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface PreviewProps {
  openFiles: File[];
  projectId?: number;
}

// Device presets like Replit
const DEVICE_PRESETS = {
  desktop: { width: '100%', height: '100%', label: 'Desktop' },
  tablet: { width: '768px', height: '1024px', label: 'iPad' },
  'tablet-landscape': { width: '1024px', height: '768px', label: 'iPad Landscape' },
  mobile: { width: '375px', height: '667px', label: 'iPhone 8' },
  'mobile-landscape': { width: '667px', height: '375px', label: 'iPhone 8 Landscape' },
  'mobile-xl': { width: '414px', height: '896px', label: 'iPhone 11' },
};

const Preview = ({ openFiles, projectId }: PreviewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [deviceMode, setDeviceMode] = useState<keyof typeof DEVICE_PRESETS>('desktop');
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);
  const [previewLogs, setPreviewLogs] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Start preview server for project
  const startPreview = async () => {
    if (!projectId) return;
    
    setPreviewStatus('starting');
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', `/api/preview/start/${projectId}`);
      const data = await response.json();
      
      if (data.url) {
        // Use the actual preview URL from the service
        setPreviewUrl(`http://localhost:${8000 + projectId}`);
        setPreviewStatus('running');
        setPreviewLogs(data.logs || []);
        
        // Auto-inject Eruda for developer tools
        if (devToolsEnabled) {
          injectDevTools();
        }
      } else {
        throw new Error('Failed to get preview URL');
      }
    } catch (error: any) {
      console.error('Failed to start preview:', error);
      setPreviewStatus('error');
      toast({
        title: "Preview Error",
        description: error.message || "Failed to start preview server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stop preview server
  const stopPreview = async () => {
    if (!projectId) return;
    
    try {
      await apiRequest('POST', `/api/preview/stop/${projectId}`);
      setPreviewUrl(null);
      setPreviewStatus('idle');
      setPreviewLogs([]);
    } catch (error) {
      console.error('Failed to stop preview:', error);
    }
  };

  // Inject Eruda developer tools (like Replit)
  const injectDevTools = () => {
    if (!iframeRef.current) return;
    
    try {
      const iframeDoc = iframeRef.current.contentDocument;
      if (!iframeDoc) return;
      
      // Inject Eruda script
      const script = iframeDoc.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/eruda@3.0.1/eruda.min.js';
      script.onload = () => {
        // Initialize Eruda after loading
        const initScript = iframeDoc.createElement('script');
        initScript.textContent = 'if(window.eruda) eruda.init();';
        iframeDoc.head?.appendChild(initScript);
      };
      iframeDoc.head?.appendChild(script);
    } catch (error) {
      console.error('Failed to inject dev tools:', error);
    }
  };

  // Refresh the preview
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
      setTimeout(() => setIsLoading(false), 500);
    }
  };
  
  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Open in new window
  const openInNewWindow = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  // Toggle dev tools
  const toggleDevTools = () => {
    setDevToolsEnabled(!devToolsEnabled);
    if (!devToolsEnabled) {
      injectDevTools();
    } else {
      handleRefresh(); // Refresh to remove dev tools
    }
  };

  // Setup WebSocket connection for real-time preview updates
  useEffect(() => {
    if (!projectId) return;
    
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/preview`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('Preview WebSocket connected');
      setWsConnected(true);
      // Subscribe to this project's preview updates
      ws.send(JSON.stringify({ type: 'subscribe', projectId }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'preview:start':
          setPreviewStatus('starting');
          setPreviewLogs(prev => [...prev, `Starting preview server on port ${data.port}...`]);
          break;
          
        case 'preview:ready':
          setPreviewStatus('running');
          setPreviewUrl(`http://localhost:${data.port}`);
          setPreviewLogs(prev => [...prev, 'Preview server is ready!']);
          break;
          
        case 'preview:stop':
          setPreviewStatus('idle');
          setPreviewUrl(null);
          setPreviewLogs(prev => [...prev, 'Preview server stopped']);
          break;
          
        case 'preview:error':
          setPreviewStatus('error');
          setPreviewLogs(prev => [...prev, `Error: ${data.error}`]);
          toast({
            title: "Preview Error",
            description: data.error,
            variant: "destructive"
          });
          break;
          
        case 'preview:log':
          setPreviewLogs(prev => [...prev, data.log]);
          break;
          
        case 'preview:rebuild':
          setPreviewLogs(prev => [...prev, data.message]);
          break;
          
        case 'preview:status':
          setPreviewStatus(data.status || 'idle');
          if (data.url) {
            setPreviewUrl(`http://localhost:${data.port}`);
          }
          if (data.logs) {
            setPreviewLogs(data.logs);
          }
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('Preview WebSocket error:', error);
      setWsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('Preview WebSocket disconnected');
      setWsConnected(false);
    };
    
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe' }));
        ws.close();
      }
    };
  }, [projectId, toast]);

  // Auto-start preview when project changes
  useEffect(() => {
    if (projectId && openFiles.length > 0) {
      // Check if we have executable files
      const hasExecutable = openFiles.some(f => 
        f.name === 'package.json' || 
        f.name.endsWith('.py') || 
        f.name === 'index.html'
      );
      
      if (hasExecutable && previewStatus === 'idle') {
        startPreview();
      }
    }
  }, [projectId, openFiles]);

  // Clean up preview on unmount
  useEffect(() => {
    return () => {
      if (previewStatus === 'running') {
        stopPreview();
      }
    };
  }, []);

  // Device preset styles
  const deviceStyles = deviceMode === 'desktop' 
    ? {} 
    : {
        width: DEVICE_PRESETS[deviceMode].width,
        height: DEVICE_PRESETS[deviceMode].height,
        maxWidth: '100%',
        maxHeight: '100%',
        margin: '0 auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.2)',
        borderRadius: '8px',
        overflow: 'hidden'
      };
  
  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Preview header - Replit style */}
      <div className="flex items-center justify-between p-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Preview</h3>
          {previewStatus === 'running' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {previewStatus === 'starting' && (
            <span className="text-xs text-yellow-600">Starting...</span>
          )}
          {previewStatus === 'error' && (
            <span className="text-xs text-red-600">Error</span>
          )}
          {/* WebSocket connection status */}
          {wsConnected ? (
            <Wifi className="h-3 w-3 text-green-600" title="Real-time updates connected" />
          ) : (
            <WifiOff className="h-3 w-3 text-gray-400" title="Real-time updates disconnected" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Start/Stop button */}
          {previewStatus !== 'running' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={startPreview}
              disabled={!projectId || previewStatus === 'starting'}
              title="Start preview"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={stopPreview}
              title="Stop preview"
            >
              <Square className="h-4 w-4" />
            </Button>
          )}
          
          {/* Device selector - Replit style */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Device preview">
                {deviceMode === 'desktop' && <Monitor className="h-4 w-4" />}
                {deviceMode.includes('tablet') && <Tablet className="h-4 w-4" />}
                {deviceMode.includes('mobile') && <Smartphone className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {Object.entries(DEVICE_PRESETS).map(([key, preset]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setDeviceMode(key as keyof typeof DEVICE_PRESETS)}
                >
                  {preset.label}
                  {preset.width !== '100%' && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {preset.width} × {preset.height}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Developer tools toggle - Like Replit */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${devToolsEnabled ? 'text-orange-500' : ''}`}
            onClick={toggleDevTools}
            title="Developer tools (Eruda)"
          >
            <Bug className="h-4 w-4" />
          </Button>
          
          {/* Refresh button */}
          <Button
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={!previewUrl}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Open in new window */}
          <Button
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={openInNewWindow}
            disabled={!previewUrl}
            title="Open in new window"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          {/* Fullscreen toggle */}
          <Button
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Preview iframe or status message */}
      <div className={`flex-1 bg-gray-100 ${deviceMode !== 'desktop' ? 'p-4 flex items-center justify-center' : ''}`}>
        {previewUrl ? (
          <div style={deviceStyles} className="h-full bg-white">
            <iframe
              ref={iframeRef}
              className="w-full h-full border-none"
              src={previewUrl}
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Preview Server Offline</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {projectId 
                ? "Click the play button to start the preview server. Your project will be served on a unique port."
                : "Open a project to see the preview"
              }
            </p>
            {previewLogs.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md max-w-lg w-full text-left">
                <p className="text-xs font-mono">
                  {previewLogs.slice(-3).join('\n')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Preview;