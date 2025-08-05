import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  ExternalLink, 
  Smartphone, 
  Monitor, 
  Tablet,
  AlertCircle,
  Globe,
  Lock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LivePreviewProps {
  projectId: number;
  content?: string;
  url?: string;
  className?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' }
};

export function LivePreview({ projectId, content, url, className }: LivePreviewProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (url) {
      setPreviewUrl(url);
    } else if (projectId) {
      // Use the preview server URL for the project
      setPreviewUrl(`/preview/${projectId}`);
    }
  }, [projectId, url]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      setIsLoading(true);
    }
  };

  const handleOpenExternal = () => {
    window.open(previewUrl, '_blank');
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load preview. The server might be starting up.');
  };

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Live Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Auto-refresh
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pb-3">
        {/* Device Selector */}
        <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="desktop" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Desktop
            </TabsTrigger>
            <TabsTrigger value="tablet" className="flex items-center gap-2">
              <Tablet className="h-4 w-4" />
              Tablet
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Preview Area */}
        <div className="flex-1 relative bg-muted/20 rounded-lg overflow-hidden">
          {error && (
            <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center">
            {isLoading && (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-muted-foreground">Loading preview...</span>
              </div>
            )}
          </div>

          <div 
            className={cn(
              "relative mx-auto h-full transition-all duration-300",
              device === 'desktop' ? 'w-full' : 'border-x border-muted'
            )}
            style={{
              width: device === 'desktop' ? '100%' : DEVICE_SIZES[device].width,
              maxHeight: device === 'desktop' ? '100%' : DEVICE_SIZES[device].height
            }}
          >
            {content ? (
              <div 
                className="w-full h-full overflow-auto bg-white"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title="Live Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            )}
          </div>
        </div>

        {/* Preview Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Secure sandbox
            </span>
            <span>{DEVICE_SIZES[device].width} × {DEVICE_SIZES[device].height}</span>
          </div>
          <span className="font-mono">{previewUrl}</span>
        </div>
      </CardContent>
    </Card>
  );
}