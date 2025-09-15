import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Globe, Camera, FileText, Loader2 } from 'lucide-react';

interface WebImportWidgetProps {
  onContentImported?: (content: any) => void;
  projectId?: number;
  compact?: boolean;
}

export function WebImportWidget({ 
  onContentImported, 
  projectId, 
  compact = false 
}: WebImportWidgetProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleQuickImport = async (type: 'content' | 'screenshot' | 'text') => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = type === 'screenshot' ? '/api/import/screenshot' : '/api/import/url';
      const body = type === 'screenshot' 
        ? { url: url.trim() }
        : { 
            url: url.trim(), 
            projectId,
            options: {
              includeScreenshot: type === 'content',
              saveArtifacts: true,
              extractionType: type === 'text' ? 'content-only' : 'readability'
            }
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        onContentImported?.(data.data);
        setUrl('');
        
        toast({
          title: "Import Successful",
          description: `Successfully imported ${type} from URL`,
        });
      } else {
        throw new Error(data.error || 'Import failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Enter URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleQuickImport('content')}
            disabled={isLoading}
            className="text-xs"
          />
          <Button 
            size="sm"
            onClick={() => handleQuickImport('content')}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
          </Button>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickImport('screenshot')}
            disabled={isLoading || !url.trim()}
            className="flex-1 text-xs"
          >
            <Camera className="h-3 w-3" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickImport('text')}
            disabled={isLoading || !url.trim()}
            className="flex-1 text-xs"
          >
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Quick Web Import
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleQuickImport('content')}
            disabled={isLoading}
          />
          <Button 
            onClick={() => handleQuickImport('content')}
            disabled={isLoading || !url.trim()}
            size="sm"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickImport('screenshot')}
            disabled={isLoading || !url.trim()}
            className="gap-1"
          >
            <Camera className="h-3 w-3" />
            Screenshot
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleQuickImport('text')}
            disabled={isLoading || !url.trim()}
            className="gap-1"
          >
            <FileText className="h-3 w-3" />
            Text Only
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}