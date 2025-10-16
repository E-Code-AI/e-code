// @ts-nocheck
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
  WifiOff,
  Server,
  Globe,
  Zap,
  Copy,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PreviewProps {
  openFiles: File[];
  projectId?: number;
}

interface PreviewService {
  port: number;
  name: string;
  path?: string;
  description?: string;
}

interface PreviewStatus {
  status: 'idle' | 'starting' | 'running' | 'error' | 'stopped';
  runId?: string;
  ports?: number[];
  primaryPort?: number;
  currentPort?: number;
  services?: PreviewService[];
  frameworkType?: string;
  healthChecks?: Record<number, boolean>;
  lastHealthCheck?: string;
  logs?: string[];
}

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
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ status: 'idle' });
  const [deviceMode, setDeviceMode] = useState<keyof typeof DEVICE_PRESETS>('desktop');
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  // Load saved preferences
  useEffect(() => {
    if (projectId) {
      const savedDevice = localStorage.getItem(`preview-device-${projectId}`) as keyof typeof DEVICE_PRESETS;
      const savedPort = localStorage.getItem(`preview-port-${projectId}`);
      
      if (savedDevice && DEVICE_PRESETS[savedDevice]) {
        setDeviceMode(savedDevice);
      }
      if (savedPort) {
        setSelectedPort(parseInt(savedPort));
      }
    }
  }, [projectId]);

  // Save preferences
  const savePreference = (key: string, value: string) => {
    if (projectId) {
      localStorage.setItem(`preview-${key}-${projectId}`, value);
    }
  };

  // Start preview server for project
  const startPreview = async () => {
    if (!projectId) return;
    
    setPreviewStatus({ status: 'starting' });
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', `/api/projects/${projectId}/preview/start`);
      const data = await response.json();
      
      if (data.success && data.preview) {
        const preview = data.preview;
        setPreviewStatus({
          status: 'running',
          runId: preview.runId,
          ports: preview.ports,
          primaryPort: preview.primaryPort,
          services: preview.services,
          frameworkType: preview.frameworkType
        });
        
        // Set initial port selection
        const targetPort = selectedPort && preview.ports.includes(selectedPort) 
          ? selectedPort 
          : preview.primaryPort;
        
        setSelectedPort(targetPort);
        setPreviewUrl(`http://localhost:${targetPort}`);
        
        toast({
          title: "Preview Started",
          description: `${preview.frameworkType || 'Application'} server is running on ${preview.ports.length} port(s)`,
        });
        
        // Auto-inject dev tools if enabled
        if (devToolsEnabled) {
          setTimeout(injectDevTools, 1000);
        }
      } else {
        throw new Error(data.error || 'Failed to start preview');
      }
    } catch (error: any) {
      console.error('Failed to start preview:', error);
      setPreviewStatus({ status: 'error' });
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
      await apiRequest('POST', `/api/projects/${projectId}/preview/stop`);
      setPreviewUrl(null);
      setPreviewStatus({ status: 'idle' });
      setSelectedPort(null);
      
      toast({
        title: "Preview Stopped",
        description: "Preview server has been stopped",
      });
    } catch (error) {
      console.error('Failed to stop preview:', error);
      toast({
        title: "Error",
        description: "Failed to stop preview server",
        variant: "destructive"
      });
    }
  };

  // Switch to different port
  const switchPort = async (port: number) => {
    if (!projectId || !previewStatus.ports?.includes(port)) return;
    
    try {
      const response = await apiRequest('POST', `/api/projects/${projectId}/preview/switch-port`, {
        port
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedPort(port);
        setPreviewUrl(`http://localhost:${port}`);
        savePreference('port', port.toString());
        
        // Update status
        setPreviewStatus(prev => ({
          ...prev,
          currentPort: port
        }));
        
        toast({
          title: "Port Switched",
          description: `Now viewing service on port ${port}`,
        });
      } else {
        throw new Error(data.error || 'Failed to switch port');
      }
    } catch (error: any) {
      console.error('Failed to switch port:', error);
      toast({
        title: "Port Switch Failed",
        description: error.message || "Unable to switch to selected port",
        variant: "destructive"
      });
    }
  };

  // Copy preview URL to clipboard
  const copyPreviewUrl = async () => {
    if (!previewUrl) return;
    
    try {
      // For sharing, we'd use the actual domain
      const shareableUrl = previewUrl.replace('localhost', `${projectId}-user.preview.e-code.com`);
      await navigator.clipboard.writeText(shareableUrl);
      
      toast({
        title: "URL Copied",
        description: "Preview URL copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy URL to clipboard",
        variant: "destructive"
      });
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

  // Toggle device mode and save preference
  const handleDeviceChange = (device: keyof typeof DEVICE_PRESETS) => {
    setDeviceMode(device);
    savePreference('device', device);
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
          setPreviewStatus(prev => ({
            ...prev,
            status: 'running',
            ports: data.ports,
            primaryPort: data.primaryPort,
            services: data.services
          }));
          
          // Set URL for current or primary port
          const targetPort = selectedPort && data.ports.includes(selectedPort) 
            ? selectedPort 
            : data.primaryPort;
          setPreviewUrl(`http://localhost:${targetPort}`);
          setSelectedPort(targetPort);
          break;
          
        case 'preview:stop':
          setPreviewStatus({ status: 'idle' });
          setPreviewUrl(null);
          setSelectedPort(null);
          break;
          
        case 'preview:error':
          setPreviewStatus({ status: 'error' });
          toast({
            title: "Preview Error",
            description: data.error,
            variant: "destructive"
          });
          break;
          
        case 'preview:log':
          // Handle logs from specific services
          console.log(`[${data.service}:${data.port}] ${data.log}`);
          break;
          
        case 'preview:port-switch':
          setSelectedPort(data.port);
          setPreviewUrl(data.url);
          break;
          
        case 'preview:health-check-failed':
          toast({
            title: "Service Health Check Failed",
            description: `Service on port ${data.port} is not responding`,
            variant: "destructive"
          });
          break;
          
        case 'preview:rebuild':
          setPreviewLogs(prev => [...prev, data.message]);
          break;
          
        case 'preview:status':
          setPreviewStatus({
            status: data.status || 'idle',
            runId: data.runId,
            ports: data.ports,
            primaryPort: data.primaryPort,
            services: data.services,
            healthChecks: data.healthChecks,
            lastHealthCheck: data.lastHealthCheck,
            frameworkType: data.frameworkType
          });
          
          if (data.ports && data.primaryPort) {
            const targetPort = selectedPort && data.ports.includes(selectedPort) 
              ? selectedPort 
              : data.primaryPort;
            setPreviewUrl(`http://localhost:${targetPort}`);
            setSelectedPort(targetPort);
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

  // Auto-start preview when project changes (enhanced logic)
  useEffect(() => {
    if (projectId && openFiles.length > 0) {
      // Check if we have runnable files
      const hasExecutable = openFiles.some(f => 
        f.name === 'package.json' || 
        f.name.endsWith('.py') || 
        f.name === 'index.html' ||
        f.name === 'main.py' ||
        f.name === 'app.py' ||
        f.name === 'server.py'
      );
      
      // Check for modern frameworks
      const hasModernFramework = openFiles.some(f => f.content?.includes('@vitejs/plugin-react') ||
        f.content?.includes('@vitejs/plugin-vue') ||
        f.content?.includes('@angular/core'));
      
      if (hasExecutable && previewStatus.status === 'idle') {
        // Auto-start for projects with runnable files
        if (hasModernFramework || openFiles.some(f => f.name === 'package.json')) {
          setTimeout(startPreview, 1000); // Slight delay for better UX
        }
      }
    }
  }, [projectId, openFiles]);

  // Check preview status on component mount
  useEffect(() => {
    if (projectId) {
      checkPreviewStatus();
    }
  }, [projectId]);

  const checkPreviewStatus = async () => {
    if (!projectId) return;
    
    try {
      const response = await apiRequest('GET', `/api/projects/${projectId}/preview/status`);
      const data = await response.json();
      
      if (data.status !== 'stopped') {
        setPreviewStatus({
          status: data.status,
          runId: data.runId,
          ports: data.ports,
          primaryPort: data.primaryPort,
          services: data.services,
          healthChecks: data.healthChecks,
          lastHealthCheck: data.lastHealthCheck,
          frameworkType: data.frameworkType
        });
        
        if (data.status === 'running' && data.ports && data.primaryPort) {
          const targetPort = selectedPort && data.ports.includes(selectedPort) 
            ? selectedPort 
            : data.primaryPort;
          setPreviewUrl(`http://localhost:${targetPort}`);
          setSelectedPort(targetPort);
        }
      }
    } catch (error) {
      console.error('Failed to check preview status:', error);
    }
  };

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
      {/* Preview header - Enhanced Replit style */}
      <div className="flex items-center justify-between p-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Preview</h3>
          
          {/* Status indicator */}
          {previewStatus.status === 'running' && (
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                Live
              </span>
              {previewStatus.frameworkType && (
                <Badge variant="secondary" className="text-xs">
                  {previewStatus.frameworkType}
                </Badge>
              )}
            </div>
          )}
          
          {previewStatus.status === 'starting' && (
            <span className="text-xs text-yellow-600">Starting...</span>
          )}
          
          {previewStatus.status === 'error' && (
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
          {/* Port selector */}
          {previewStatus.ports && previewStatus.ports.length > 1 && (
            <Select 
              value={selectedPort?.toString() || previewStatus.primaryPort?.toString()} 
              onValueChange={(value) => switchPort(parseInt(value))}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {previewStatus.ports.map(port => {
                  const service = previewStatus.services?.find(s => s.port === port);
                  const isHealthy = previewStatus.healthChecks?.[port] !== false;
                  
                  return (
                    <SelectItem key={port} value={port.toString()}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span>{port}</span>
                        {service && (
                          <span className="text-xs text-muted-foreground">
                            {service.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
          
          {/* Start/Stop button */}
          {previewStatus.status !== 'running' ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={startPreview}
              disabled={!projectId || previewStatus.status === 'starting'}
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
          
          {/* Device selector - Enhanced */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Device preview">
                {deviceMode === 'desktop' && <Monitor className="h-4 w-4" />}
                {deviceMode.includes('tablet') && <Tablet className="h-4 w-4" />}
                {deviceMode.includes('mobile') && <Smartphone className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Device Presets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.entries(DEVICE_PRESETS).map(([key, preset]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleDeviceChange(key as keyof typeof DEVICE_PRESETS)}
                  className={deviceMode === key ? 'bg-accent' : ''}
                >
                  <div className="flex items-center gap-2">
                    {key === 'desktop' && <Monitor className="h-4 w-4" />}
                    {key.includes('tablet') && <Tablet className="h-4 w-4" />}
                    {key.includes('mobile') && <Smartphone className="h-4 w-4" />}
                    <span>{preset.label}</span>
                    {preset.width !== '100%' && (
                      <span className="text-xs text-muted-foreground">
                        {preset.width} × {preset.height}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Developer tools toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${devToolsEnabled ? 'text-orange-500' : ''}`}
            onClick={toggleDevTools}
            title="Developer tools (Eruda)"
          >
            <Bug className="h-4 w-4" />
          </Button>
          
          {/* Copy URL button */}
          <Button
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={copyPreviewUrl}
            disabled={!previewUrl}
            title="Copy preview URL"
          >
            <Copy className="h-4 w-4" />
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
            <h3 className="text-lg font-semibold mb-2">
              {previewStatus.status === 'error' ? 'Preview Error' : 'Preview Server Offline'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {projectId 
                ? previewStatus.status === 'error'
                  ? "There was an error starting the preview server. Check your project files and try again."
                  : "Click the play button to start the preview server. Your project will be served with auto-detected framework support."
                : "Open a project to see the preview"
              }
            </p>
            
            {/* Service status indicators */}
            {previewStatus.services && previewStatus.services.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md max-w-lg w-full">
                <h4 className="text-sm font-medium mb-2">Available Services:</h4>
                <div className="space-y-1">
                  {previewStatus.services.map(service => (
                    <div key={service.port} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${
                        previewStatus.healthChecks?.[service.port] !== false ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">:{service.port}</span>
                      {service.description && (
                        <span className="text-muted-foreground">- {service.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Framework detection info */}
            {previewStatus.frameworkType && (
              <div className="mt-2 text-xs text-muted-foreground">
                Detected: {previewStatus.frameworkType} project
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Preview;