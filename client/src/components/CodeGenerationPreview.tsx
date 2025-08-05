import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Wand2, 
  Code2, 
  Eye, 
  Copy, 
  Download, 
  Play, 
  Sparkles, 
  FileText, 
  Settings, 
  Zap,
  CheckCircle,
  Clock,
  Terminal,
  Globe
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface CodeGenerationPreviewProps {
  projectId?: number;
  className?: string;
}

interface GeneratedCode {
  id: string;
  language: string;
  fileName: string;
  content: string;
  description: string;
  dependencies?: string[];
}

interface PreviewResponse {
  id: string;
  description: string;
  files: GeneratedCode[];
  preview: string;
  estimatedTime: number;
  complexity: 'simple' | 'moderate' | 'complex';
  technologies: string[];
  features: string[];
}

const QUICK_PROMPTS = [
  {
    title: 'Todo App',
    prompt: 'Create a simple todo app with add, edit, delete, and mark complete functionality',
    tags: ['React', 'Basic']
  },
  {
    title: 'Weather Dashboard',
    prompt: 'Build a weather dashboard that shows current weather and 5-day forecast with charts',
    tags: ['API', 'Charts']
  },
  {
    title: 'Login Form',
    prompt: 'Create a modern login form with validation, forgot password, and social login options',
    tags: ['Auth', 'Forms']
  },
  {
    title: 'Product Card',
    prompt: 'Design a product card component with image, price, rating, and add to cart button',
    tags: ['E-commerce', 'UI']
  },
  {
    title: 'Data Table',
    prompt: 'Build a data table with sorting, filtering, pagination, and search functionality',
    tags: ['Data', 'Complex']
  },
  {
    title: 'Chat Interface',
    prompt: 'Create a chat interface with message bubbles, typing indicators, and emoji support',
    tags: ['Real-time', 'UI']
  }
];

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'react', label: 'React', icon: '⚛️' },
  { value: 'vue', label: 'Vue.js', icon: '💚' },
  { value: 'html', label: 'HTML/CSS', icon: '🌐' }
];

export function CodeGenerationPreview({ projectId, className }: CodeGenerationPreviewProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('react');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const { toast } = useToast();
  const progressInterval = useRef<NodeJS.Timeout>();

  // Generate preview mutation
  const generatePreview = useMutation({
    mutationFn: (data: { prompt: string; language: string; projectId?: number }) => 
      apiRequest('POST', '/api/ai/generate-preview', data),
    onSuccess: (data: PreviewResponse) => {
      setPreview(data);
      setIsGenerating(false);
      setGenerationProgress(100);
      toast({
        title: 'Preview Generated!',
        description: `Created ${data.files.length} files with ${data.technologies.join(', ')}`,
      });
    },
    onError: (error: any) => {
      setIsGenerating(false);
      setGenerationProgress(0);
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate code preview',
        variant: 'destructive',
      });
    }
  });

  // Apply to project mutation
  const applyToProject = useMutation({
    mutationFn: (previewId: string) => 
      apiRequest('POST', `/api/ai/apply-preview/${previewId}`, {
        projectId
      }),
    onSuccess: () => {
      toast({
        title: 'Code Applied!',
        description: 'The generated code has been added to your project',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Apply Failed',
        description: error.message || 'Failed to apply code to project',
        variant: 'destructive',
      });
    }
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please describe what you want to generate',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setPreview(null);

    // Simulate progress
    let progress = 0;
    progressInterval.current = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      setGenerationProgress(progress);
    }, 500);

    generatePreview.mutate({
      prompt,
      language: selectedLanguage,
      projectId
    });
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const copyToClipboard = async (content: string, fileId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileId);
      setTimeout(() => setCopiedFile(null), 2000);
      toast({
        title: 'Copied!',
        description: 'Code copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const downloadFile = (file: GeneratedCode) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wand2 className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">One-Click Code Generation</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Describe what you want to build and get instant code preview with live demonstration
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Describe Your Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Prompts */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Ideas</label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((item, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickPrompt(item.prompt)}
                  className="h-auto p-2 text-left"
                >
                  <div>
                    <div className="font-medium text-xs">{item.title}</div>
                    <div className="flex gap-1 mt-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Main Input */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="text-sm font-medium mb-2 block">What do you want to build?</label>
              <Textarea
                placeholder="Describe your idea in detail... e.g., 'Create a modern dashboard with charts, user management, and dark mode toggle'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Language/Framework</label>
              <div className="space-y-2">
                {LANGUAGES.map((lang) => (
                  <Button
                    key={lang.value}
                    variant={selectedLanguage === lang.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLanguage(lang.value)}
                    className="w-full justify-start"
                  >
                    <span className="mr-2">{lang.icon}</span>
                    {lang.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              size="lg"
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Preview
                </>
              )}
            </Button>
          </div>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={generationProgress} className="w-full" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="animate-pulse flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  AI is analyzing your request and generating code...
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Results */}
      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Generated Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {preview.estimatedTime}min
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {preview.complexity}
                </Badge>
              </div>
            </div>
            <p className="text-muted-foreground">{preview.description}</p>
            
            {/* Technologies & Features */}
            <div className="flex flex-wrap gap-2 pt-2">
              {preview.technologies.map((tech) => (
                <Badge key={tech} variant="secondary">{tech}</Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Files ({preview.files.length})
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="features" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Features
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="mt-4">
                <div className="space-y-4">
                  {preview.files.map((file) => (
                    <Card key={file.id} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Code2 className="h-4 w-4" />
                            <span className="font-mono text-sm">{file.fileName}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.language}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(file.content, file.id)}
                            >
                              {copiedFile === file.id ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{file.description}</p>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px] w-full">
                          <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto">
                            <code>{file.content}</code>
                          </pre>
                        </ScrollArea>
                        {file.dependencies && file.dependencies.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-muted-foreground mb-2">Dependencies:</div>
                            <div className="flex flex-wrap gap-1">
                              {file.dependencies.map((dep) => (
                                <Badge key={dep} variant="outline" className="text-xs">
                                  {dep}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-4 bg-white min-h-[400px]">
                      <div dangerouslySetInnerHTML={{ __html: preview.preview }} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Features Included</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {preview.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Technologies Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {preview.technologies.map((tech) => (
                          <div key={tech} className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                            <span className="text-sm">{tech}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button variant="outline" onClick={() => setPreview(null)}>
                Generate New
              </Button>
              <div className="flex items-center gap-2">
                {projectId && (
                  <Button
                    onClick={() => applyToProject.mutate(preview.id)}
                    disabled={applyToProject.isPending}
                  >
                    {applyToProject.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Apply to Project
                      </>
                    )}
                  </Button>
                )}
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {!preview && !isGenerating && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            <strong>Pro tip:</strong> Be specific in your description. Include details about styling, functionality, 
            and any specific libraries you'd like to use for better results.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}