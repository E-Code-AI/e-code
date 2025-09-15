import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  Download, 
  Camera, 
  FileText, 
  Globe, 
  ExternalLink, 
  Image, 
  Clock, 
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Settings
} from 'lucide-react';

interface WebImportOptions {
  includeScreenshot: boolean;
  saveArtifacts: boolean;
  extractionType: 'full' | 'content-only' | 'readability';
}

interface WebImportResult {
  content: {
    title: string;
    description: string;
    content: string;
    markdown: string;
    url: string;
    wordCount: number;
    readingTime: number;
    images: string[];
    links: string[];
    codeBlocks: string[];
  };
  screenshot?: {
    fullPageScreenshot: string;
    aboveTheFoldScreenshot: string;
    metadata: {
      width: number;
      height: number;
      fullPageHeight: number;
      capturedAt: string;
      url: string;
    };
  };
  metadata: {
    importId: string;
    processingTime: number;
    wordCount: number;
    readingTime: number;
  };
}

interface FeatureStatus {
  urlImport: boolean;
  screenshotCapture: boolean;
  textExtraction: boolean;
  readabilityAlgorithm: boolean;
  htmlToMarkdown: boolean;
}

export function WebContentImport({ 
  onContentImported,
  projectId 
}: { 
  onContentImported?: (result: WebImportResult) => void;
  projectId?: number;
}) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WebImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [features, setFeatures] = useState<FeatureStatus | null>(null);
  const [options, setOptions] = useState<WebImportOptions>({
    includeScreenshot: false,
    saveArtifacts: true,
    extractionType: 'readability'
  });
  const [open, setOpen] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch feature status on mount
  useEffect(() => {
    if (user) {
      fetchFeatureStatus();
    }
  }, [user]);

  const fetchFeatureStatus = async () => {
    try {
      const response = await fetch('/api/import/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.data.features);
      }
    } catch (error) {
      console.error('Failed to fetch feature status:', error);
    }
  };

  const handleImport = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid URL to import content from.",
        variant: "destructive"
      });
      return;
    }

    if (!features?.urlImport) {
      toast({
        title: "Feature Not Available",
        description: "Web import feature is not enabled for your account.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const response = await fetch('/api/import/url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: url.trim(),
          projectId,
          options
        })
      });

      const data = await response.json();

      if (data.success) {
        setProgress(100);
        setResult(data.data);
        onContentImported?.(data.data);
        
        toast({
          title: "Import Successful",
          description: `Successfully imported "${data.data.content.title}"`,
        });
      } else {
        throw new Error(data.error || 'Import failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      clearInterval(progressInterval);
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleScreenshotOnly = async () => {
    if (!url.trim()) {
      toast({
        title: "URL Required", 
        description: "Please enter a valid URL to capture screenshot from.",
        variant: "destructive"
      });
      return;
    }

    if (!features?.screenshotCapture) {
      toast({
        title: "Feature Not Available",
        description: "Screenshot capture feature is not enabled for your account.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/import/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await response.json();

      if (data.success) {
        // Create a simplified result with just screenshot
        const screenshotResult: WebImportResult = {
          content: {
            title: `Screenshot from ${new URL(url).hostname}`,
            description: `Screenshot captured from ${url}`,
            content: '',
            markdown: '',
            url,
            wordCount: 0,
            readingTime: 0,
            images: [],
            links: [],
            codeBlocks: []
          },
          screenshot: data.data.screenshot,
          metadata: {
            importId: `screenshot_${Date.now()}`,
            processingTime: data.data.metadata.processingTime,
            wordCount: 0,
            readingTime: 0
          }
        };

        setResult(screenshotResult);
        onContentImported?.(screenshotResult);

        toast({
          title: "Screenshot Captured",
          description: "Successfully captured screenshot from the URL",
        });
      } else {
        throw new Error(data.error || 'Screenshot capture failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Screenshot Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const FeatureStatusBadge = ({ enabled, label }: { enabled: boolean; label: string }) => (
    <Badge variant={enabled ? "default" : "secondary"} className="gap-1">
      {enabled ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Globe className="h-4 w-4" />
          Import from URL
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import Web Content
          </DialogTitle>
          <DialogDescription>
            Import content, take screenshots, and extract text from any web page
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feature Status */}
          {features && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Feature Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <FeatureStatusBadge enabled={features.urlImport} label="URL Import" />
                  <FeatureStatusBadge enabled={features.screenshotCapture} label="Screenshots" />
                  <FeatureStatusBadge enabled={features.textExtraction} label="Text Extraction" />
                  <FeatureStatusBadge enabled={features.readabilityAlgorithm} label="Smart Reading" />
                  <FeatureStatusBadge enabled={features.htmlToMarkdown} label="Markdown Convert" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* URL Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <div className="flex gap-2">
                <Input
                  id="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleImport()}
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleImport} 
                  disabled={isLoading || !url.trim() || !features?.urlImport}
                  className="shrink-0"
                >
                  {isLoading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  Import
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={handleScreenshotOnly}
                disabled={isLoading || !url.trim() || !features?.screenshotCapture}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                Screenshot Only
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setOptions({ ...options, extractionType: 'content-only' })}
                disabled={isLoading}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Text Only
              </Button>
            </div>

            {/* Options */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Import Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="screenshot-option">Include Screenshot</Label>
                  <Switch
                    id="screenshot-option"
                    checked={options.includeScreenshot}
                    onCheckedChange={(checked) => setOptions({ ...options, includeScreenshot: checked })}
                    disabled={!features?.screenshotCapture}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="save-artifacts">Save Artifacts</Label>
                  <Switch
                    id="save-artifacts"
                    checked={options.saveArtifacts}
                    onCheckedChange={(checked) => setOptions({ ...options, saveArtifacts: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loading Progress */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    <span className="text-sm">Processing web content...</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Import Complete
                </CardTitle>
                <CardDescription>
                  Processed in {result.metadata.processingTime}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="markdown">Markdown</TabsTrigger>
                    {result.screenshot && <TabsTrigger value="screenshot">Screenshot</TabsTrigger>}
                    <TabsTrigger value="metadata">Details</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold">{result.content.title}</h3>
                        {result.content.description && (
                          <p className="text-sm text-muted-foreground">{result.content.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {result.content.wordCount} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {result.content.readingTime} min read
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(result.content.content, 'Content')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm">{result.content.content}</pre>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="markdown" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Markdown Format</h3>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => copyToClipboard(result.content.markdown, 'Markdown')}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">{result.content.markdown}</pre>
                    </div>
                  </TabsContent>

                  {result.screenshot && (
                    <TabsContent value="screenshot" className="space-y-4">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Above the Fold</h3>
                          <img 
                            src={`data:image/png;base64,${result.screenshot.aboveTheFoldScreenshot}`}
                            alt="Above the fold screenshot"
                            className="w-full border rounded-md"
                          />
                        </div>
                        <details>
                          <summary className="font-semibold cursor-pointer">Full Page Screenshot</summary>
                          <div className="mt-2">
                            <img 
                              src={`data:image/png;base64,${result.screenshot.fullPageScreenshot}`}
                              alt="Full page screenshot"
                              className="w-full border rounded-md"
                            />
                          </div>
                        </details>
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="metadata" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Import ID:</strong> {result.metadata.importId}
                      </div>
                      <div>
                        <strong>Processing Time:</strong> {result.metadata.processingTime}ms
                      </div>
                      <div>
                        <strong>Word Count:</strong> {result.content.wordCount}
                      </div>
                      <div>
                        <strong>Reading Time:</strong> {result.content.readingTime} minutes
                      </div>
                      <div>
                        <strong>Images Found:</strong> {result.content.images.length}
                      </div>
                      <div>
                        <strong>Links Found:</strong> {result.content.links.length}
                      </div>
                      <div>
                        <strong>Code Blocks:</strong> {result.content.codeBlocks.length}
                      </div>
                      <div className="col-span-2">
                        <strong>Source URL:</strong> 
                        <a 
                          href={result.content.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline ml-1"
                        >
                          {result.content.url}
                          <ExternalLink className="h-3 w-3 inline ml-1" />
                        </a>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}