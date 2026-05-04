import { CM6Editor } from '@/components/editor/CM6Editor';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getCSRFToken,withBootstrapHeaders } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2,Code2,Copy,Download,Loader2,Sparkles,XCircle } from 'lucide-react';
import { useEffect,useRef,useState } from 'react';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  costPer1kTokens?: number;
}

interface Language {
  id: string;
  name: string;
  extension: string;
}

interface StreamEvent {
  type: 'chunk' | 'complete' | 'error' | 'retry' | 'truncated';
  content?: string;
  totalLength?: number;
  chunkNumber?: number;
  totalChunks?: number;
  message?: string;
  truncated?: boolean;
  attempt?: number;
  delayMs?: number;
  code?: string;
  reason?: string;
  provider?: string;
  filePaths?: string[];
}

export interface CodeGenerationPanelProps {
  /** When set, the prompt textarea is seeded with this value (e.g. when the
   *  user clicks an example card). Updates trigger a re-seed on change. */
  seedPrompt?: string;
}

export function CodeGenerationPanel({ seedPrompt }: CodeGenerationPanelProps = {}) {
  // State
  const [prompt, setPrompt] = useState(seedPrompt ?? '');
  const [language, setLanguage] = useState('typescript');
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-7');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ chunks: 0, length: 0 });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [truncated, setTruncated] = useState<{ reason?: string; provider?: string } | null>(null);
  const [retryStatus, setRetryStatus] = useState<{ attempt: number; delayMs: number; code?: string } | null>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Fetch available models
  const { data: modelsData } = useQuery<{ models: AIModel[]; defaultModel: string }>({
    queryKey: ['/api/code-generation/models'],
  });
  
  // Fetch supported languages
  const { data: languagesData } = useQuery<{ languages: Language[] }>({
    queryKey: ['/api/code-generation/languages'],
  });
  
  // Set default model when data loads
  useEffect(() => {
    if (modelsData?.defaultModel && !selectedModel) {
      setSelectedModel(modelsData.defaultModel);
    }
  }, [modelsData, selectedModel]);

  // Re-seed the prompt when an example is selected from the parent.
  useEffect(() => {
    if (seedPrompt && seedPrompt !== prompt) {
      setPrompt(seedPrompt);
    }
  }, [seedPrompt, prompt]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // Handle code generation
  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please describe the code you want to generate.',
        variant: 'destructive',
      });
      return;
    }
    
    // Close existing EventSource if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsGenerating(true);
    setError(null);
    setGeneratedCode('');
    setProgress({ chunks: 0, length: 0 });
    setTruncated(null);
    setRetryStatus(null);
    setFilePaths([]);
    
    // Build SSE URL with query params (EventSource only supports GET)
    const _params = new URLSearchParams({
      prompt,
      language,
      modelId: selectedModel,
    });
    
    // For EventSource, we need to use a different endpoint or convert POST to GET
    // Since EventSource only supports GET, we'll use fetch with proper SSE buffering
    const abortController = new AbortController();
    
    getCSRFToken().then((csrfToken) => fetch('/api/code-generation/generate', {
      method: 'POST',
      headers: withBootstrapHeaders('/api/code-generation/generate', {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      }),
      credentials: 'include',
      body: JSON.stringify({
        prompt,
        language,
        modelId: selectedModel,
      }),
      signal: abortController.signal,
    }))
      .then(async (response) => {
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorText = await response.text();
            if (errorText.startsWith('{')) {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.message || errorJson.error || errorMessage;
            } else if (errorText.trim().length > 0) {
              errorMessage = errorText;
            }
          } catch {
          }
          throw new Error(errorMessage);
        }
        
        if (!response.body) {
          throw new Error('Response body is null');
        }
        
        // Read SSE stream with proper buffering for multi-frame JSON events
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          // Append to buffer
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete SSE messages (delimited by double newline)
          const messages = buffer.split('\n\n');
          
          // Keep last incomplete message in buffer
          buffer = messages.pop() || '';
          
          for (const message of messages) {
            if (!message.trim()) continue;
            
            // Extract data from SSE format
            const lines = message.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data.trim()) {
                  try {
                    const event: StreamEvent = JSON.parse(data);
                    
                    if (event.type === 'chunk') {
                      setGeneratedCode((prev) => prev + (event.content || ''));
                      setProgress({
                        chunks: event.chunkNumber || 0,
                        length: event.totalLength || 0,
                      });
                    } else if (event.type === 'retry') {
                      setRetryStatus({
                        attempt: event.attempt ?? 0,
                        delayMs: event.delayMs ?? 0,
                        code: event.code,
                      });
                    } else if (event.type === 'truncated') {
                      setTruncated({ reason: event.reason, provider: event.provider });
                    } else if (event.type === 'complete') {
                      setIsGenerating(false);
                      setRetryStatus(null);
                      if (event.filePaths) setFilePaths(event.filePaths);
                      const wasTruncated = event.truncated === true;
                      if (wasTruncated) {
                        toast({
                          title: 'Generated (truncated)',
                          description: `Provider stopped at the max output budget. ${event.totalLength} chars across ${event.filePaths?.length ?? 0} files. The last file may be incomplete.`,
                          variant: 'destructive',
                        });
                      } else {
                        toast({
                          title: 'Code Generated',
                          description: `${event.totalLength} chars across ${event.filePaths?.length ?? 0} files in ${event.totalChunks} chunks.`,
                        });
                      }
                    } else if (event.type === 'error') {
                      setError(event.message || 'Code generation failed');
                      setIsGenerating(false);
                      setRetryStatus(null);
                    }
                  } catch {
                    // Ignore SSE parse errors
                  }
                }
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          return;
        }
        
        setError(err.message || 'Failed to generate code');
        setIsGenerating(false);
        toast({
          title: 'Generation Failed',
          description: err.message || 'An error occurred during code generation.',
          variant: 'destructive',
        });
      });
    
    // Store abort controller for cleanup
    (eventSourceRef as any).current = { close: () => abortController.abort() };
  };
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast({
      title: 'Copied',
      description: 'Code copied to clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Handle download
  const handleDownload = () => {
    const selectedLang = languagesData?.languages.find((l) => l.id === language);
    const extension = selectedLang?.extension || '.txt';
    const filename = `generated-code${extension}`;
    
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded',
      description: `Saved as ${filename}`,
    });
  };
  
  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Code Generation
          </CardTitle>
          <CardDescription>
            Generate production-ready code using AI. Describe what you need and let AI write it for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">What code do you want to generate?</Label>
            <Textarea
              id="prompt"
              data-testid="textarea-code-prompt"
              placeholder="Describe the code you want to generate... (e.g., 'Create a React component that displays a list of todos with add/delete functionality')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] resize-y"
              disabled={isGenerating}
            />
          </div>
          
          {/* Language & Model Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage} disabled={isGenerating}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languagesData?.languages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                <SelectTrigger id="model" data-testid="select-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(modelsData?.models || [])
                    .filter((model: AIModel, i: number, arr: AIModel[]) => arr.findIndex((m: AIModel) => m.id === model.id) === i)
                    .map((model: AIModel) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
            data-testid="button-generate-code"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating... ({progress.chunks} chunks, {progress.length} chars)
              </>
            ) : (
              <>
                <Code2 className="mr-2 h-4 w-4" />
                Generate Code
              </>
            )}
          </Button>
          
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md" role="alert">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-[13px]">{error}</p>
            </div>
          )}

          {/* Retry Status */}
          {retryStatus && isGenerating && (
            <div
              className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md border border-amber-500/20"
              role="status"
              data-testid="retry-banner"
            >
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
              <p className="text-[13px]">
                Provider {retryStatus.code ? <span className="font-mono">[{retryStatus.code}]</span> : null} hiccupped — retrying (attempt {retryStatus.attempt}, backoff {Math.round(retryStatus.delayMs / 100) / 10}s)…
              </p>
            </div>
          )}

          {/* Truncation Warning */}
          {truncated && (
            <div
              className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md border border-amber-500/20"
              role="status"
              data-testid="truncated-banner"
            >
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-[13px]">
                {truncated.provider ? `${truncated.provider} ` : ''}stopped at the max output budget ({truncated.reason ?? 'max_tokens'}). The last file may be incomplete — narrow the scope or split the request.
              </p>
            </div>
          )}

          {/* File index */}
          {filePaths.length > 0 && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3" data-testid="file-index">
              <p className="text-xs font-medium mb-1.5 text-muted-foreground">Generated files ({filePaths.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {filePaths.map((p) => (
                  <span key={p} className="text-[11px] font-mono bg-background border border-border/60 rounded px-1.5 py-0.5">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Code Preview */}
      {(generatedCode || isGenerating) && (
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Generated Code
              </CardTitle>
              <div className="flex items-center gap-2">
                {generatedCode && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      data-testid="button-copy-code"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1 h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      data-testid="button-download-code"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <div className="h-full border-t">
              <CM6Editor
                height="100%"
                language={language}
                value={generatedCode}
                theme="dark"
                readOnly={true}
                lineWrapping={true}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
