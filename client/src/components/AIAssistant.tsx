import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  Sparkles, 
  Terminal,
  Code, 
  FileText, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  CheckSquare, 
  HelpCircle, 
  MessageSquare, 
  Lightbulb, 
  X,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { File } from "@shared/schema";

interface AIAssistantProps {
  activeFile: File | undefined;
  onApplyCompletion: (content: string) => void;
}

enum AIMode {
  Complete = "complete",
  Explain = "explain",
  Transform = "transform",
  Document = "document",
  Test = "test",
  Chat = "chat",
}

interface AIRequest {
  code: string;
  language: string;
  options?: Record<string, any>;
}

interface AIResponse {
  content: string;
  reasoning?: string;
}

export function AIAssistant({ activeFile, onApplyCompletion }: AIAssistantProps) {
  const [mode, setMode] = useState<AIMode>(AIMode.Complete);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("javascript");
  const [showExplanation, setShowExplanation] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const { toast } = useToast();
  
  const getLanguageFromFilename = (filename: string | undefined): string => {
    if (!filename) return "text";
    
    const extension = filename.split('.').pop()?.toLowerCase() || "";
    const extensionMap: Record<string, string> = {
      js: "javascript",
      ts: "typescript",
      jsx: "jsx",
      tsx: "tsx",
      py: "python",
      rb: "ruby",
      java: "java",
      php: "php",
      html: "html",
      css: "css",
      json: "json",
      md: "markdown",
      go: "go",
      rs: "rust",
      c: "c",
      cpp: "cpp",
      cs: "csharp",
    };
    
    return extensionMap[extension] || "text";
  };
  
  const getFileContent = (): string => {
    return activeFile?.content || "";
  };
  
  const processRequest = async () => {
    if (!activeFile) {
      toast({
        title: "No file selected",
        description: "Please select a file first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    const fileContent = getFileContent();
    const language = getLanguageFromFilename(activeFile.name);
    
    try {
      const requestBody: AIRequest = {
        code: fileContent,
        language,
        options: {},
      };
      
      if (mode === AIMode.Transform) {
        requestBody.options!.targetLanguage = targetLanguage;
      }
      
      if (mode === AIMode.Chat) {
        requestBody.options!.prompt = prompt;
        requestBody.options!.history = chatHistory;
      }
      
      let endpoint;
      switch (mode) {
        case AIMode.Complete:
          endpoint = "/api/ai/completion";
          break;
        case AIMode.Explain:
          endpoint = "/api/ai/explanation";
          break;
        case AIMode.Transform:
          endpoint = "/api/ai/convert";
          break;
        case AIMode.Document:
          endpoint = "/api/ai/document";
          break;
        case AIMode.Test:
          endpoint = "/api/ai/tests";
          break;
        case AIMode.Chat:
          endpoint = "/api/ai/chat";
          break;
      }
      
      const response = await apiRequest("POST", endpoint, requestBody);
      const data = await response.json();
      
      setResult(data);
      
      if (mode === AIMode.Chat && prompt.trim()) {
        setChatHistory([
          ...chatHistory, 
          { role: 'user', content: prompt },
          { role: 'assistant', content: data.content }
        ]);
        setPrompt("");
      }
    } catch (err: any) {
      console.error("AI processing error:", err);
      setError(err.message || "An error occurred while processing your request.");
      toast({
        title: "AI request failed",
        description: err.message || "Could not process the AI request.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApply = () => {
    if (result?.content) {
      onApplyCompletion(result.content);
      toast({
        title: "Changes applied",
        description: "The AI-generated code has been applied to the file.",
      });
    }
  };
  
  const handleFeedback = (positive: boolean) => {
    toast({
      title: positive ? "Positive feedback sent" : "Negative feedback sent",
      description: "Thank you for your feedback on the AI response.",
    });
  };
  
  return (
    <Card className="w-full h-full flex flex-col border-t-0 rounded-t-none shadow-none">
      <CardHeader className="p-3 pb-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI Assistant</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="explanation-mode"
                checked={showExplanation}
                onCheckedChange={setShowExplanation}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="explanation-mode" className="text-xs">Show explanations</Label>
            </div>
            <Button variant="ghost" size="icon" title="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as AIMode)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-6 w-full h-8 mt-2">
            <TabsTrigger value={AIMode.Complete} className="text-xs" title="AI code completion">
              <Code className="h-3.5 w-3.5 mr-2" />
              <span className="hidden sm:inline">Complete</span>
            </TabsTrigger>
            <TabsTrigger value={AIMode.Explain} className="text-xs" title="Explain code">
              <HelpCircle className="h-3.5 w-3.5 mr-2" />
              <span className="hidden sm:inline">Explain</span>
            </TabsTrigger>
            <TabsTrigger value={AIMode.Transform} className="text-xs" title="Convert code to another language">
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              <span className="hidden sm:inline">Transform</span>
            </TabsTrigger>
            <TabsTrigger value={AIMode.Document} className="text-xs" title="Generate documentation">
              <FileText className="h-3.5 w-3.5 mr-2" />
              <span className="hidden sm:inline">Document</span>
            </TabsTrigger>
            <TabsTrigger value={AIMode.Test} className="text-xs" title="Generate tests">
              <CheckSquare className="h-3.5 w-3.5 mr-2" />
              <span className="hidden sm:inline">Test</span>
            </TabsTrigger>
            <TabsTrigger value={AIMode.Chat} className="text-xs" title="Chat with the AI">
              <MessageSquare className="h-3.5 w-3.5 mr-2" />
              <span className="hidden sm:inline">Chat</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent className="p-3 flex-grow overflow-hidden flex flex-col">
        <TabsContent value={AIMode.Complete} className="h-full flex flex-col mt-0">
          <p className="text-xs text-muted-foreground mb-2">
            Generate code based on the current file content.
          </p>
          {!result && !isLoading && (
            <div className="flex-grow flex items-center justify-center border rounded-md border-dashed">
              <div className="text-center p-4">
                <Lightbulb className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Generate" to create code based on your current file.
                </p>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm">Generating code...</p>
              </div>
            </div>
          )}
          
          {result && !isLoading && (
            <div className="flex-grow flex flex-col">
              <ScrollArea className="flex-grow">
                <div className="space-y-3">
                  {showExplanation && result.reasoning && (
                    <div className="bg-muted/50 p-3 rounded-md mb-2">
                      <p className="text-xs font-medium mb-1">Reasoning:</p>
                      <p className="text-xs whitespace-pre-wrap">{result.reasoning}</p>
                    </div>
                  )}
                  
                  <div className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre overflow-x-auto">
                    {result.content}
                  </div>
                </div>
              </ScrollArea>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFeedback(true)}
                    className="h-7"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                    Good
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFeedback(false)}
                    className="h-7"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                    Bad
                  </Button>
                </div>
                <Button size="sm" onClick={handleApply} className="h-7">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-2 p-3 border border-destructive/50 bg-destructive/10 rounded-md">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value={AIMode.Explain} className="h-full flex flex-col mt-0">
          <p className="text-xs text-muted-foreground mb-2">
            Get an explanation of what your code does and how it works.
          </p>
          
          {isLoading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm">Analyzing code...</p>
              </div>
            </div>
          ) : result ? (
            <ScrollArea className="flex-grow border rounded-md p-3">
              <div className="whitespace-pre-wrap text-sm">
                {result.content}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-grow flex items-center justify-center border rounded-md border-dashed">
              <div className="text-center p-4">
                <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Generate" to explain the code in your current file.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value={AIMode.Transform} className="h-full flex flex-col mt-0">
          <div className="flex items-end gap-2 mb-2">
            <div className="flex-grow">
              <Label htmlFor="target-language" className="text-xs mb-1">Target Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger id="target-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="csharp">C#</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="php">PHP</SelectItem>
                  <SelectItem value="ruby">Ruby</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm">Converting code...</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex-grow flex flex-col">
              <ScrollArea className="flex-grow">
                <div className="space-y-3">
                  {showExplanation && result.reasoning && (
                    <div className="bg-muted/50 p-3 rounded-md mb-2">
                      <p className="text-xs font-medium mb-1">Transformation Notes:</p>
                      <p className="text-xs whitespace-pre-wrap">{result.reasoning}</p>
                    </div>
                  )}
                  
                  <div className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre overflow-x-auto">
                    {result.content}
                  </div>
                </div>
              </ScrollArea>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFeedback(true)}
                    className="h-7"
                  >
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                    Good
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleFeedback(false)}
                    className="h-7"
                  >
                    <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                    Bad
                  </Button>
                </div>
                <Button size="sm" onClick={handleApply} className="h-7">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center border rounded-md border-dashed">
              <div className="text-center p-4">
                <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Generate" to convert your code to {targetLanguage}.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value={AIMode.Document} className="h-full flex flex-col mt-0">
          <p className="text-xs text-muted-foreground mb-2">
            Generate documentation for your code (comments, JSDoc, etc.).
          </p>
          
          {isLoading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm">Generating documentation...</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex-grow flex flex-col">
              <ScrollArea className="flex-grow">
                <div className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre overflow-x-auto">
                  {result.content}
                </div>
              </ScrollArea>
              
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={handleApply} className="h-7">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center border rounded-md border-dashed">
              <div className="text-center p-4">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Generate" to create documentation for your code.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value={AIMode.Test} className="h-full flex flex-col mt-0">
          <p className="text-xs text-muted-foreground mb-2">
            Generate test cases for your code.
          </p>
          
          {isLoading ? (
            <div className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-sm">Generating tests...</p>
              </div>
            </div>
          ) : result ? (
            <div className="flex-grow flex flex-col">
              <ScrollArea className="flex-grow">
                <div className="bg-muted p-3 rounded-md font-mono text-xs whitespace-pre overflow-x-auto">
                  {result.content}
                </div>
              </ScrollArea>
              
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={handleApply} className="h-7">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Apply
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center border rounded-md border-dashed">
              <div className="text-center p-4">
                <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click "Generate" to create tests for your code.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value={AIMode.Chat} className="h-full flex flex-col mt-0">
          <ScrollArea className="flex-grow mb-2">
            {chatHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-4">
                <div>
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Ask a question about your code or get help with a programming task.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-1">
                {chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "max-w-[80%] rounded-lg p-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))}
                {isLoading && (
                  <div className="bg-muted max-w-[80%] rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
                      <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse delay-300"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex items-center gap-2">
            <Textarea
              placeholder="Ask about your code or get programming help..."
              className="resize-none min-h-[40px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  processRequest();
                }
              }}
            />
            <Button
              variant="default"
              size="icon"
              onClick={processRequest}
              disabled={isLoading || !prompt.trim()}
            >
              <Terminal className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </CardContent>
      
      {mode !== AIMode.Chat && (
        <CardFooter className="p-3 pt-0">
          <Button
            onClick={processRequest}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}