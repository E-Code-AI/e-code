import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, ExternalLink, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WebPreviewProps {
  projectId: number;
  port?: number;
  isRunning?: boolean;
}

export function WebPreview({ projectId, port = 3000, isRunning = false }: WebPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isRunning && port) {
      // Use the Replit-style preview URL
      const baseUrl = window.location.hostname;
      const previewHost = `${projectId}-${port}.${baseUrl}`;
      setPreviewUrl(`https://${previewHost}`);
    } else {
      setPreviewUrl('');
    }
  }, [projectId, port, isRunning]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    toast({
      title: 'Preview error',
      description: 'Failed to load preview. Make sure your project is running.',
      variant: 'destructive',
    });
  };

  return (
    <Card className="h-full overflow-hidden flex flex-col">
      <CardHeader className="border-b bg-muted/20 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <CardTitle className="text-base">Preview</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <>
                <Input
                  value={previewUrl}
                  readOnly
                  className="h-8 text-xs font-mono w-64"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={isLoading || !previewUrl}
                  className="h-8 w-8"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleOpenExternal}
                  disabled={!previewUrl}
                  className="h-8 w-8"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {isRunning && previewUrl ? (
          <div className="relative h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation"
              title="Web Preview"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {isRunning ? 'Loading preview...' : 'Run your project to see the preview'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}