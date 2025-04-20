import React, { useState } from 'react';
import { File } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Sparkles, RefreshCw, CopyIcon, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface AIAssistantProps {
  activeFile: File | undefined;
  onApplyCompletion: (content: string) => void;
}

export function AIAssistant({ activeFile, onApplyCompletion }: AIAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [completionResult, setCompletionResult] = useState('');
  const [explanationResult, setExplanationResult] = useState('');
  const [testResult, setTestResult] = useState('');
  const [documentationResult, setDocumentationResult] = useState('');
  const { toast } = useToast();

  // Get language from file extension
  const getLanguage = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'c': 'c',
      'cpp': 'c++',
      'cs': 'csharp',
      'go': 'go',
      'php': 'php',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'html': 'html',
      'css': 'css',
    };
    return langMap[extension || ''] || 'plaintext';
  };

  // Generate code completion
  const generateCompletion = async () => {
    if (!activeFile) return;
    
    setIsLoading(true);
    setCompletionResult('');
    
    try {
      const language = getLanguage(activeFile.name);
      const response = await apiRequest('POST', '/api/ai/completion', {
        code: activeFile.content,
        language,
      });
      
      const data = await response.json();
      setCompletionResult(data.completion);
    } catch (error: any) {
      toast({
        title: 'Error generating completion',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate code explanation
  const generateExplanation = async () => {
    if (!activeFile) return;
    
    setIsLoading(true);
    setExplanationResult('');
    
    try {
      const language = getLanguage(activeFile.name);
      const response = await apiRequest('POST', '/api/ai/explanation', {
        code: activeFile.content,
        language,
      });
      
      const data = await response.json();
      setExplanationResult(data.explanation);
    } catch (error: any) {
      toast({
        title: 'Error generating explanation',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate tests
  const generateTests = async () => {
    if (!activeFile) return;
    
    setIsLoading(true);
    setTestResult('');
    
    try {
      const language = getLanguage(activeFile.name);
      const response = await apiRequest('POST', '/api/ai/tests', {
        code: activeFile.content,
        language,
        framework: getTestFramework(language),
      });
      
      const data = await response.json();
      setTestResult(data.testCode);
    } catch (error: any) {
      toast({
        title: 'Error generating tests',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate documentation
  const generateDocumentation = async () => {
    if (!activeFile) return;
    
    setIsLoading(true);
    setDocumentationResult('');
    
    try {
      const language = getLanguage(activeFile.name);
      const response = await apiRequest('POST', '/api/ai/document', {
        code: activeFile.content,
        language,
        style: getDocStyle(language),
      });
      
      const data = await response.json();
      setDocumentationResult(data.documentedCode);
    } catch (error: any) {
      toast({
        title: 'Error generating documentation',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get default test framework based on language
  const getTestFramework = (language: string) => {
    const frameworkMap: Record<string, string> = {
      'javascript': 'jest',
      'typescript': 'jest',
      'python': 'pytest',
      'ruby': 'rspec',
      'java': 'junit',
      'csharp': 'nunit',
      'go': 'go test',
      'php': 'phpunit',
      'rust': 'cargo test',
    };
    return frameworkMap[language] || '';
  };

  // Get default documentation style based on language
  const getDocStyle = (language: string) => {
    const styleMap: Record<string, string> = {
      'javascript': 'jsdoc',
      'typescript': 'jsdoc',
      'python': 'numpy',
      'java': 'javadoc',
      'csharp': 'xml',
      'go': 'godoc',
      'php': 'phpdoc',
      'rust': 'rustdoc',
    };
    return styleMap[language] || 'standard';
  };

  // Apply completion to the editor
  const applyCompletion = () => {
    if (completionResult) {
      onApplyCompletion(completionResult);
      toast({
        title: 'Completion Applied',
        description: 'The AI suggestion has been applied to your code',
      });
    }
  };

  // Apply documentation to the editor
  const applyDocumentation = () => {
    if (documentationResult) {
      onApplyCompletion(documentationResult);
      toast({
        title: 'Documentation Applied',
        description: 'The documented code has been applied',
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: 'Content has been copied to your clipboard',
    });
  };

  return (
    <div className="h-full flex flex-col p-4 bg-background border-l border-border">
      <div className="flex items-center mb-4">
        <Sparkles className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">AI Assistant</h2>
      </div>

      <Tabs defaultValue="completion" className="flex-1 flex flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="completion">Completion</TabsTrigger>
          <TabsTrigger value="explanation">Explain</TabsTrigger>
          <TabsTrigger value="documentation">Document</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
        </TabsList>

        <TabsContent value="completion" className="flex-1 flex flex-col">
          <div className="mb-4">
            <Button 
              onClick={generateCompletion} 
              disabled={!activeFile || isLoading} 
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Code Completion
            </Button>
          </div>

          {completionResult && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Suggestion</h3>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => copyToClipboard(completionResult)} 
                    title="Copy to clipboard"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={applyCompletion} 
                    title="Apply suggestion"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="flex-1 p-3 bg-muted rounded-md text-sm overflow-auto font-mono">
                {completionResult}
              </pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="explanation" className="flex-1 flex flex-col">
          <div className="mb-4">
            <Button 
              onClick={generateExplanation} 
              disabled={!activeFile || isLoading} 
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Explain This Code
            </Button>
          </div>

          {explanationResult && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Explanation</h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => copyToClipboard(explanationResult)} 
                  title="Copy to clipboard"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                {explanationResult}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentation" className="flex-1 flex flex-col">
          <div className="mb-4">
            <Button 
              onClick={generateDocumentation} 
              disabled={!activeFile || isLoading} 
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Documentation
            </Button>
          </div>

          {documentationResult && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Documented Code</h3>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => copyToClipboard(documentationResult)} 
                    title="Copy to clipboard"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={applyDocumentation} 
                    title="Apply documentation"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <pre className="flex-1 p-3 bg-muted rounded-md text-sm overflow-auto font-mono">
                {documentationResult}
              </pre>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tests" className="flex-1 flex flex-col">
          <div className="mb-4">
            <Button 
              onClick={generateTests} 
              disabled={!activeFile || isLoading} 
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Tests
            </Button>
          </div>

          {testResult && (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Test Code</h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => copyToClipboard(testResult)} 
                  title="Copy to clipboard"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
              <pre className="flex-1 p-3 bg-muted rounded-md text-sm overflow-auto font-mono">
                {testResult}
              </pre>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}