import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, RefreshCw, ExternalLink, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  projectId: string;
  isRunning: boolean;
}

export function PreviewPanel({ projectId, isRunning }: PreviewPanelProps) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isRunning) {
      // Generate preview URL based on Replit domains
      const url = `https://${projectId}.replit.dev`;
      setPreviewUrl(url);
      setError(null);
    } else {
      setPreviewUrl('');
    }
  }, [isRunning, projectId]);
  
  const handleRefresh = () => {
    setIsLoading(true);
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
    setTimeout(() => setIsLoading(false), 1000);
  };
  
  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-10 border-b flex items-center justify-between px-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Globe className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Preview</span>
          {isRunning && (
            <Badge variant="secondary" className="text-xs">
              Running
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {previewUrl && (
            <>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {previewUrl}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                data-testid="button-refresh-preview"
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInNewTab}
                data-testid="button-open-preview"
                className="h-7 w-7 p-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Preview Content */}
      <div className="flex-1 relative bg-background dark:bg-background">
        {!isRunning ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <Globe className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Preview not running</h3>
              <p className="text-sm text-muted-foreground">
                Click the Run button to start your project and see a live preview.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center p-8">
            <div>
              <X className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Preview failed to load</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={handleRefresh} className="mt-4" size="sm">
                Try again
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            id="preview-iframe"
            src={previewUrl}
            className="w-full h-full border-0"
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            onError={() => setError('Failed to load preview')}
          />
        )}
      </div>
    </div>
  );
}
