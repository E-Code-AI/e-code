import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Upload, 
  Github, 
  Figma, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Image,
  Settings,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ImportProgress {
  stage: string;
  progress: number;
  message: string;
  timestamp: Date;
}

interface ImportResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  filesCreated?: number;
  assetsCreated?: number;
  error?: string;
}

export default function ImportHub() {
  const { id: projectId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Common states
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState('url');
  
  // URL Import states
  const [importUrl, setImportUrl] = useState('');
  const [detectedType, setDetectedType] = useState<string | null>(null);
  
  // Figma states
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaToken, setFigmaToken] = useState('');
  const [exportImages, setExportImages] = useState(true);
  const [imageScale, setImageScale] = useState<1 | 2>(1);
  const [componentsOnly, setComponentsOnly] = useState(false);
  
  // Bolt states
  const [boltUrl, setBoltUrl] = useState('');
  const [boltFile, setBoltFile] = useState<File | null>(null);
  const [boltProjectData, setBoltProjectData] = useState('');
  
  // GitHub states
  const [githubUrl, setGithubUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubBranch, setGithubBranch] = useState('');
  const [githubSubdirectory, setGithubSubdirectory] = useState('');
  const [includeHistory, setIncludeHistory] = useState(false);
  const [handleLFS, setHandleLFS] = useState(true);

  // Feature flags (would be loaded from environment/config)
  const [featureFlags] = useState({
    figma: true, // process.env.VITE_FEATURE_FIGMA_IMPORT === 'true',
    bolt: true, // process.env.VITE_FEATURE_BOLT_IMPORT === 'true', 
    githubEnhanced: true // process.env.VITE_FEATURE_GITHUB_ENHANCED === 'true'
  });

  useEffect(() => {
    if (importUrl) {
      detectImportType(importUrl);
    }
  }, [importUrl]);

  const detectImportType = (url: string) => {
    if (url.includes('figma.com')) {
      setDetectedType('figma');
      setFigmaUrl(url);
      setActiveTab('figma');
    } else if (url.includes('bolt.new') || url.includes('stackblitz.com')) {
      setDetectedType('bolt');
      setBoltUrl(url);
      setActiveTab('bolt');
    } else if (url.includes('github.com')) {
      setDetectedType('github');
      setGithubUrl(url);
      setActiveTab('github');
    } else {
      setDetectedType(null);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to import',
        variant: 'destructive'
      });
      return;
    }

    if (!detectedType) {
      toast({
        title: 'Unsupported URL',
        description: 'The URL format is not recognized. Please use the specific import tabs.',
        variant: 'destructive'
      });
      return;
    }

    // Route to appropriate import handler
    switch (detectedType) {
      case 'figma':
        await handleFigmaImport();
        break;
      case 'bolt':
        await handleBoltImport();
        break;
      case 'github':
        await handleGithubImport();
        break;
    }
  };

  const handleFigmaImport = async () => {
    if (!featureFlags.figma) {
      toast({
        title: 'Feature Unavailable',
        description: 'Figma import is currently disabled',
        variant: 'destructive'
      });
      return;
    }

    if (!figmaUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a Figma URL',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    setImportStatus('processing');
    setImportProgress(0);

    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 1000);

    try {
      const response = await apiRequest('POST', '/api/import/figma', {
        projectId: parseInt(projectId!),
        figmaUrl,
        figmaToken: figmaToken || undefined,
        exportImages,
        imageScale,
        componentsOnly
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (response.json.success) {
        setImportStatus('completed');
        setImportResult(response.json.import);
        toast({
          title: 'Import Successful',
          description: `Figma design imported successfully! Created ${response.json.import.metadata?.filesCreated || 0} files.`
        });
        
        setTimeout(() => {
          navigate(`/projects/${projectId}`);
        }, 2000);
      } else {
        throw new Error(response.json.error || 'Import failed');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setImportStatus('failed');
      setImportResult({ 
        id: 'failed', 
        status: 'failed', 
        metadata: {}, 
        error: error.message 
      });
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleBoltImport = async () => {
    if (!featureFlags.bolt) {
      toast({
        title: 'Feature Unavailable',
        description: 'Bolt.new import is currently disabled',
        variant: 'destructive'
      });
      return;
    }

    if (!boltUrl && !boltFile && !boltProjectData) {
      toast({
        title: 'Error',
        description: 'Please provide a Bolt URL, upload a file, or enter project data',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    setImportStatus('processing');
    setImportProgress(0);

    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + Math.random() * 12, 90));
    }, 800);

    try {
      let requestData: any = {
        projectId: parseInt(projectId!),
        boltUrl: boltUrl || undefined
      };

      if (boltProjectData) {
        try {
          requestData.boltProjectData = JSON.parse(boltProjectData);
        } catch (e) {
          throw new Error('Invalid project data JSON format');
        }
      }

      // TODO: Handle file upload
      if (boltFile) {
        // Would need to implement file upload endpoint
        throw new Error('File upload not yet implemented');
      }

      const response = await apiRequest('POST', '/api/import/bolt', requestData);

      clearInterval(progressInterval);
      setImportProgress(100);

      if (response.json.success) {
        setImportStatus('completed');
        setImportResult(response.json.import);
        toast({
          title: 'Import Successful',
          description: `Bolt project imported successfully! Created ${response.json.import.metadata?.filesCreated || 0} files.`
        });
        
        setTimeout(() => {
          navigate(`/projects/${projectId}`);
        }, 2000);
      } else {
        throw new Error(response.json.error || 'Import failed');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setImportStatus('failed');
      setImportResult({ 
        id: 'failed', 
        status: 'failed', 
        metadata: {}, 
        error: error.message 
      });
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleGithubImport = async () => {
    if (!featureFlags.githubEnhanced) {
      toast({
        title: 'Feature Unavailable',
        description: 'Enhanced GitHub import is currently disabled',
        variant: 'destructive'
      });
      return;
    }

    if (!githubUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a GitHub URL',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    setImportStatus('processing');
    setImportProgress(0);

    const progressInterval = setInterval(() => {
      setImportProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 1200);

    try {
      const response = await apiRequest('POST', '/api/import/github', {
        projectId: parseInt(projectId!),
        githubUrl,
        token: githubToken || undefined,
        branch: githubBranch || undefined,
        subdirectory: githubSubdirectory || undefined,
        includeHistory,
        handleLFS
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (response.json.success) {
        setImportStatus('completed');
        setImportResult(response.json.import);
        toast({
          title: 'Import Successful',
          description: `GitHub repository imported successfully! Created ${response.json.import.metadata?.filesCreated || 0} files.`
        });
        
        setTimeout(() => {
          navigate(`/projects/${projectId}`);
        }, 2000);
      } else {
        throw new Error(response.json.error || 'Import failed');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setImportStatus('failed');
      setImportResult({ 
        id: 'failed', 
        status: 'failed', 
        metadata: {}, 
        error: error.message 
      });
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import Project</h1>
        <p className="text-muted-foreground">
          Import projects from various sources into your workspace
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            URL
          </TabsTrigger>
          <TabsTrigger value="figma" disabled={!featureFlags.figma} className="flex items-center gap-2">
            <Figma className="h-4 w-4" />
            Figma
            {!featureFlags.figma && <Badge variant="secondary" className="ml-1 text-xs">Beta</Badge>}
          </TabsTrigger>
          <TabsTrigger value="bolt" disabled={!featureFlags.bolt} className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Bolt.new
            {!featureFlags.bolt && <Badge variant="secondary" className="ml-1 text-xs">Beta</Badge>}
          </TabsTrigger>
          <TabsTrigger value="github" disabled={!featureFlags.githubEnhanced} className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            GitHub
            {!featureFlags.githubEnhanced && <Badge variant="secondary" className="ml-1 text-xs">Enhanced</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* URL Import Tab */}
        <TabsContent value="url" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import from URL
              </CardTitle>
              <CardDescription>
                Paste any supported URL and we'll automatically detect the import type
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-url">URL</Label>
                <Input
                  id="import-url"
                  placeholder="https://figma.com/file/... or https://github.com/... or https://bolt.new/..."
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  disabled={isImporting}
                />
                {detectedType && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Detected: {detectedType === 'figma' ? 'Figma Design' : detectedType === 'bolt' ? 'Bolt.new Project' : 'GitHub Repository'}
                  </div>
                )}
              </div>
              
              <Button onClick={handleUrlImport} disabled={isImporting || !importUrl} className="w-full">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import from URL
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Figma Import Tab */}
        <TabsContent value="figma" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Figma className="h-5 w-5" />
                Import from Figma
              </CardTitle>
              <CardDescription>
                Import designs and components from Figma files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="figma-url">Figma URL</Label>
                <Input
                  id="figma-url"
                  placeholder="https://www.figma.com/file/..."
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                  disabled={isImporting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="figma-token">Access Token (Optional)</Label>
                <Input
                  id="figma-token"
                  type="password"
                  placeholder="fig_..."
                  value={figmaToken}
                  onChange={(e) => setFigmaToken(e.target.value)}
                  disabled={isImporting}
                />
                <p className="text-sm text-muted-foreground">
                  Required for private files. Generate at figma.com/developers/api
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="export-images"
                    checked={exportImages}
                    onCheckedChange={setExportImages}
                    disabled={isImporting}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="export-images">Export component images</Label>
                    <p className="text-sm text-muted-foreground">
                      Export PNG images of components
                    </p>
                  </div>
                </div>

                {exportImages && (
                  <div className="space-y-2 ml-6">
                    <Label>Image Scale</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={imageScale === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImageScale(1)}
                        disabled={isImporting}
                      >
                        1x
                      </Button>
                      <Button
                        variant={imageScale === 2 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setImageScale(2)}
                        disabled={isImporting}
                      >
                        2x
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="components-only"
                    checked={componentsOnly}
                    onCheckedChange={setComponentsOnly}
                    disabled={isImporting}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="components-only">Components only</Label>
                    <p className="text-sm text-muted-foreground">
                      Import only defined components, skip frames
                    </p>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleFigmaImport} disabled={isImporting || !figmaUrl} className="w-full">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing from Figma...
                  </>
                ) : (
                  <>
                    <Figma className="mr-2 h-4 w-4" />
                    Import from Figma
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bolt Import Tab */}
        <TabsContent value="bolt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Import from Bolt.new
              </CardTitle>
              <CardDescription>
                Import projects from Bolt.new or StackBlitz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bolt-url">Bolt.new URL</Label>
                <Input
                  id="bolt-url"
                  placeholder="https://bolt.new/... or https://stackblitz.com/..."
                  value={boltUrl}
                  onChange={(e) => setBoltUrl(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <div className="text-center text-muted-foreground">
                OR
              </div>

              <div className="space-y-2">
                <Label htmlFor="bolt-file">Upload Project File</Label>
                <Input
                  id="bolt-file"
                  type="file"
                  accept=".zip,.json"
                  onChange={(e) => setBoltFile(e.target.files?.[0] || null)}
                  disabled={isImporting}
                />
              </div>

              <div className="text-center text-muted-foreground">
                OR
              </div>

              <div className="space-y-2">
                <Label htmlFor="bolt-data">Project Data (JSON)</Label>
                <Textarea
                  id="bolt-data"
                  placeholder="Paste Bolt project JSON data here..."
                  value={boltProjectData}
                  onChange={(e) => setBoltProjectData(e.target.value)}
                  disabled={isImporting}
                  rows={6}
                />
              </div>
              
              <Button onClick={handleBoltImport} disabled={isImporting || (!boltUrl && !boltFile && !boltProjectData)} className="w-full">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing from Bolt...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Import from Bolt.new
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GitHub Import Tab */}
        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                Enhanced GitHub Import
              </CardTitle>
              <CardDescription>
                Import repositories with advanced features like monorepo detection and LFS support
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="github-url">GitHub URL</Label>
                <Input
                  id="github-url"
                  placeholder="https://github.com/owner/repo"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  disabled={isImporting}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="github-token">Access Token (Optional)</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_..."
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    disabled={isImporting}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="github-branch">Branch (Optional)</Label>
                  <Input
                    id="github-branch"
                    placeholder="main"
                    value={githubBranch}
                    onChange={(e) => setGithubBranch(e.target.value)}
                    disabled={isImporting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="github-subdirectory">Subdirectory (Optional)</Label>
                <Input
                  id="github-subdirectory"
                  placeholder="packages/frontend"
                  value={githubSubdirectory}
                  onChange={(e) => setGithubSubdirectory(e.target.value)}
                  disabled={isImporting}
                />
                <p className="text-sm text-muted-foreground">
                  Import only a specific directory from the repository
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-history"
                    checked={includeHistory}
                    onCheckedChange={setIncludeHistory}
                    disabled={isImporting}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="include-history">Include git history</Label>
                    <p className="text-sm text-muted-foreground">
                      Include commit history (slower but preserves history)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="handle-lfs"
                    checked={handleLFS}
                    onCheckedChange={setHandleLFS}
                    disabled={isImporting}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="handle-lfs">Handle Git LFS files</Label>
                    <p className="text-sm text-muted-foreground">
                      Download actual content for LFS pointer files
                    </p>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleGithubImport} disabled={isImporting || !githubUrl} className="w-full">
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing from GitHub...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Import from GitHub
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Progress */}
      {isImporting && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Import Progress</span>
                <span className="text-sm text-muted-foreground">{Math.round(importProgress)}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing your project...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importStatus !== 'idle' && !isImporting && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            {importStatus === 'completed' && importResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Import Completed Successfully!</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{importResult.filesCreated || 0} files created</span>
                  </div>
                  {importResult.assetsCreated && importResult.assetsCreated > 0 && (
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <span>{importResult.assetsCreated} assets imported</span>
                    </div>
                  )}
                </div>

                {importResult.metadata && Object.keys(importResult.metadata).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Import Details</Label>
                    <div className="bg-muted p-3 rounded-md">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(importResult.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <Button onClick={() => navigate(`/projects/${projectId}`)} className="w-full">
                  Go to Project
                </Button>
              </div>
            )}
            
            {importStatus === 'failed' && importResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Import Failed</span>
                </div>
                
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importResult.error || 'An unknown error occurred during import'}
                  </AlertDescription>
                </Alert>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setImportStatus('idle');
                    setImportResult(null);
                    setImportProgress(0);
                  }}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Import Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Figma Import</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Requires Figma file URL (figma.com/file/...)</li>
              <li>Access token needed for private files</li>
              <li>Extracts design tokens, components, and optionally images</li>
              <li>Generates React components with TypeScript</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Bolt.new Import</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Supports Bolt.new and StackBlitz URLs</li>
              <li>Can upload project zip files</li>
              <li>Detects framework and dependencies automatically</li>
              <li>Preserves project structure and configuration</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">GitHub Import</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Enhanced with monorepo detection</li>
              <li>Supports subdirectory imports</li>
              <li>Handles Git LFS files automatically</li>
              <li>Rate-limit aware with retry logic</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}