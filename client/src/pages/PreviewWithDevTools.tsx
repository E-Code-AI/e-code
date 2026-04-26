import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PreviewDevTools } from '@/components/PreviewDevTools';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Globe, 
  Smartphone, 
  Tablet, 
  Monitor,
  Code,
  Terminal,
  RefreshCw,
  ExternalLink,
  Share2
} from 'lucide-react';

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  icon: React.ReactNode;
}

const devicePresets: DevicePreset[] = [
  { name: 'Desktop', width: 1920, height: 1080, icon: <Monitor className="h-4 w-4" /> },
  { name: 'Laptop', width: 1366, height: 768, icon: <Monitor className="h-4 w-4" /> },
  { name: 'Tablet', width: 768, height: 1024, icon: <Tablet className="h-4 w-4" /> },
  { name: 'Mobile', width: 375, height: 667, icon: <Smartphone className="h-4 w-4" /> },
];

export default function PreviewWithDevTools() {
  const params = useParams();
  const projectId = parseInt(params.id as string);
  const [showDevTools, setShowDevTools] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState('Desktop');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingPreview, setIsStartingPreview] = useState(false);

  // Get project details
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const loadPreviewUrl = async () => {
    if (!projectId) return '';
    setIsLoading(true);

    try {
      const data = await apiRequest<{ previewUrl?: string | null }>('GET', `/api/preview/url?projectId=${projectId}`);
      const resolvedUrl = data?.previewUrl || '';
      setPreviewUrl(resolvedUrl);
      return resolvedUrl;
    } catch (error) {
      console.error('Failed to resolve preview URL:', error);
      setPreviewUrl('');
      return '';
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const resolvedUrl = await loadPreviewUrl();
      if (cancelled && resolvedUrl) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleDeviceChange = (device: string) => {
    setSelectedDevice(device);
    const preset = devicePresets.find(d => d.name === device);
    if (preset) {
      setCustomWidth(preset.width);
      setCustomHeight(preset.height);
    }
  };

  const refreshPreview = () => {
    if (!previewUrl) {
      void loadPreviewUrl();
      return;
    }
    // Force iframe reload
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  const openInNewTab = () => {
    if (!previewUrl) return;
    window.open(previewUrl, '_blank');
  };

  const startPreview = async () => {
    if (!projectId || isStartingPreview) return;

    try {
      setIsStartingPreview(true);
      await apiRequest('POST', `/api/preview/projects/${projectId}/preview/start`, {});
      await loadPreviewUrl();
    } finally {
      setIsStartingPreview(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <Card className="rounded-none border-x-0 border-t-0">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-[15px] flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Preview: {(project as any)?.name || 'Loading...'}
                </CardTitle>
                <Badge variant="outline" className="gap-1">
                  <div className={`h-2 w-2 rounded-full ${previewUrl ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                  {previewUrl ? 'Live' : isStartingPreview ? 'Starting' : 'Not running'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Device selector */}
                <Select value={selectedDevice} onValueChange={handleDeviceChange}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {devicePresets.map((device) => (
                      <SelectItem key={device.name} value={device.name}>
                        <div className="flex items-center gap-2">
                          {device.icon}
                          <span>{device.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {device.width}x{device.height}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6" />

                {/* Actions */}
                <Button size="sm" variant="ghost" onClick={refreshPreview}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={openInNewTab}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                {!previewUrl && (
                  <Button size="sm" variant="outline" onClick={startPreview} disabled={isStartingPreview}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isStartingPreview ? 'animate-spin' : ''}`} />
                    {isStartingPreview ? 'Starting...' : 'Run Preview'}
                  </Button>
                )}
                <Button size="sm" variant="ghost">
                  <Share2 className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                {/* Dev Tools Toggle */}
                <Button
                  size="sm"
                  variant={showDevTools ? "default" : "outline"}
                  onClick={() => setShowDevTools(!showDevTools)}
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  DevTools
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Preview Container */}
        <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-gray-800 shadow-2xl rounded-lg overflow-hidden transition-all duration-300"
              style={{
                width: `${customWidth}px`,
                maxWidth: '100%',
                height: `${customHeight}px`,
                maxHeight: showDevTools ? 'calc(100% - 400px)' : '100%',
              }}
            >
              {!previewUrl && isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading preview...</p>
                    {(project as any)?.name && (
                      <p className="text-[12px] text-foreground mt-2">
                        Requested app: <span className="font-medium">{(project as any).name}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : !previewUrl ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4 max-w-md px-6">
                    <Globe className="h-10 w-10 mx-auto text-muted-foreground" />
                    <div className="space-y-1">
                      <h3 className="text-[15px] font-semibold">Preview not running</h3>
                      {(project as any)?.name && (
                        <p className="text-[12px] text-foreground">
                          Requested app: <span className="font-medium">{(project as any).name}</span>
                        </p>
                      )}
                      <p className="text-[13px] text-muted-foreground">
                        Start the app to load the live preview with devtools.
                      </p>
                    </div>
                    <Button onClick={startPreview} disabled={isStartingPreview}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${isStartingPreview ? 'animate-spin' : ''}`} />
                      {isStartingPreview ? 'Starting...' : 'Run Preview'}
                    </Button>
                  </div>
                </div>
              ) : (
                <iframe
                  id="preview-iframe"
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Project Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                />
              )}
            </div>
          </div>

          {/* Device frame indicators */}
          <div className="absolute bottom-4 left-4 text-[11px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
            {customWidth} × {customHeight}
          </div>
        </div>

        {/* Dev Tools */}
        {showDevTools && (
          <PreviewDevTools
            previewUrl={previewUrl}
            projectId={projectId}
            onClose={() => setShowDevTools(false)}
          />
        )}
      </div>
  );
}
