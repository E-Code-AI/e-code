import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Copy, Download, CheckCircle2, XCircle, Code2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

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
  type: 'chunk' | 'complete' | 'error';
  content?: string;
  totalLength?: number;
  chunkNumber?: number;
  totalChunks?: number;
  message?: string;
}

export function CodeGenerationPanel() {
  // State
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [selectedModel, setSelectedModel] = useState('gpt-5-mini');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ chunks: 0, length: 0 });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  
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
    
    // Build SSE URL with query params (EventSource only supports GET)
    const params = new URLSearchParams({
      prompt,
      language,
      modelId: selectedModel,
    });
    
    // For EventSource, we need to use a different endpoint or convert POST to GET
    // Since EventSource only supports GET, we'll use fetch with proper SSE buffering
    const abortController = new AbortController();
    
    fetch('/api/code-generation/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        language,
        modelId: selectedModel,
      }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
                    console.log('[CodeGen] SSE Event:', event.type, event);
                    
                    if (event.type === 'chunk') {
                      console.log('[CodeGen] Chunk received:', event.chunkNumber, 'content length:', event.content?.length);
                      setGeneratedCode((prev) => prev + (event.content || ''));
                      setProgress({
                        chunks: event.chunkNumber || 0,
                        length: event.totalLength || 0,
                      });
                    } else if (event.type === 'complete') {
                      console.log('[CodeGen] Stream complete:', event.totalChunks, 'chunks,', event.totalLength, 'chars');
                      setIsGenerating(false);
                      toast({
                        title: 'Code Generated',
                        description: `Generated ${event.totalLength} characters in ${event.totalChunks} chunks.`,
                      });
                    } else if (event.type === 'error') {
                      console.error('[CodeGen] Error event:', event.message);
                      setError(event.message || 'Code generation failed');
                      setIsGenerating(false);
                    }
                  } catch (e) {
                    console.error('Failed to parse SSE event:', e, 'Data:', data);
                  }
                }
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          console.log('Code generation aborted');
          return;
        }
        
        console.error('Code generation error:', err);
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
  
  // Monaco editor mount handler
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
  };
  
  // ✅ CRITICAL FIX: Manually update Monaco editor when generatedCode changes
  // Monaco Editor's value prop doesn't always trigger re-renders during SSE streaming
  useEffect(() => {
    console.log('[CodeGen] useEffect triggered, editorRef.current:', !!editorRef.current, 'code length:', generatedCode?.length);
    
    if (editorRef.current) {
      const editor = editorRef.current;
      
      try {
        const currentValue = editor.getValue();
        
        // Only update if value actually changed to avoid cursor jumps
        if (currentValue !== generatedCode) {
          console.log('[CodeGen] Updating Monaco editor, old:', currentValue.length, 'new:', generatedCode.length);
          editor.setValue(generatedCode);
          console.log('[CodeGen] Monaco updated successfully');
        }
      } catch (e) {
        console.error('[CodeGen] Failed to update Monaco:', e);
      }
    } else {
      console.warn('[CodeGen] Monaco editor not mounted yet, code will update on mount');
    }
  }, [generatedCode]);
  
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
                  {modelsData?.models.map((model) => (
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
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
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
              <Editor
                height="100%"
                language={language}
                value={generatedCode}
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
