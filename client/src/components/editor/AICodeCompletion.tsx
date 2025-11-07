import { useEffect, useRef, useState, useCallback } from 'react';
import * as Monaco from 'monaco-editor';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useDebouncedCallback } from 'use-debounce';

interface AICodeCompletionProps {
  editor: Monaco.editor.IStandaloneCodeEditor | null;
  enabled: boolean;
  model?: string;
  autoTrigger?: boolean;
  confidenceThreshold?: number;
  onStatusChange?: (status: 'idle' | 'loading' | 'error') => void;
}

interface AICompletionItem extends Monaco.languages.CompletionItem {
  isAIGenerated?: boolean;
  confidence?: number;
  explanation?: string;
}

export function AICodeCompletion({
  editor,
  enabled,
  model = 'Claude 3.5 Sonnet',
  autoTrigger = true,
  confidenceThreshold = 0.7,
  onStatusChange,
}: AICodeCompletionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const providerRef = useRef<Monaco.IDisposable | null>(null);
  const completionRequestRef = useRef<AbortController | null>(null);

  // Debounced function to fetch AI completions
  const fetchAICompletions = useDebouncedCallback(
    async (
      model: Monaco.editor.ITextModel,
      position: Monaco.Position,
      context: Monaco.languages.CompletionContext,
      token: Monaco.CancellationToken
    ): Promise<Monaco.languages.CompletionList> => {
      // Cancel any pending request
      if (completionRequestRef.current) {
        completionRequestRef.current.abort();
      }

      // Create new abort controller
      completionRequestRef.current = new AbortController();
      
      try {
        setIsLoading(true);
        onStatusChange?.('loading');

        // Get code context
        const currentLine = model.getLineContent(position.lineNumber);
        const offset = model.getOffsetAt(position);
        const textBeforeCursor = model.getValue().substring(0, offset);
        const textAfterCursor = model.getValue().substring(offset);
        
        // Limit context size
        const maxContextLength = 5000; // chars before and after cursor
        const precedingCode = textBeforeCursor.slice(-maxContextLength);
        const followingCode = textAfterCursor.slice(0, maxContextLength / 2);
        
        // Get visible range for better context
        const visibleRanges = editor?.getVisibleRanges();
        const visibleRange = visibleRanges?.[0];

        // Prepare request data
        const requestData = {
          context: {
            currentFile: model.getValue(),
            fileName: model.uri.path,
            language: model.getLanguageId(),
            cursorPosition: {
              line: position.lineNumber,
              column: position.column,
            },
            currentLine,
            precedingCode,
            followingCode,
            visibleRange: visibleRange ? {
              startLine: visibleRange.startLineNumber,
              endLine: visibleRange.endLineNumber,
            } : undefined,
          },
          model,
          triggerKind: context.triggerKind === Monaco.languages.CompletionTriggerKind.TriggerCharacter 
            ? 'automatic' 
            : 'manual',
          maxSuggestions: 5,
          temperature: 0.2,
        };

        // Fetch AI suggestions
        const response = await apiRequest('POST', '/api/ai/code-completion', requestData, {
          signal: completionRequestRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch AI completions');
        }

        const suggestions = await response.json();

        // Filter by confidence threshold
        const filteredSuggestions = suggestions.filter(
          (s: any) => !s.confidence || s.confidence >= confidenceThreshold
        );

        // Convert to Monaco completion items
        const items: AICompletionItem[] = filteredSuggestions.map((suggestion: any, index: number) => ({
          label: {
            label: suggestion.label || suggestion.text,
            description: 'AI Generated',
            detail: suggestion.confidence ? ` (${Math.round(suggestion.confidence * 100)}%)` : '',
          },
          kind: getCompletionItemKind(suggestion.kind),
          insertText: suggestion.insertText,
          detail: suggestion.detail,
          documentation: {
            value: `${suggestion.documentation || ''}${
              suggestion.explanation ? `\n\n**Why this suggestion:**\n${suggestion.explanation}` : ''
            }`,
            supportHtml: true,
          },
          sortText: `0${index}`, // Ensure AI suggestions appear first
          filterText: suggestion.text,
          preselect: index === 0, // Preselect first suggestion
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          isAIGenerated: true,
          confidence: suggestion.confidence,
          explanation: suggestion.explanation,
          // Add custom rendering
          insertTextRules: Monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          additionalTextEdits: [],
          tags: [],
        }));

        return {
          suggestions: items,
          incomplete: false,
        };

      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('AI completion error:', error);
          onStatusChange?.('error');
          
          // Only show toast for non-abort errors
          if (!context.triggerKind || context.triggerKind === Monaco.languages.CompletionTriggerKind.Invoke) {
            toast({
              title: 'AI Completion Error',
              description: 'Failed to fetch AI suggestions. Please try again.',
              variant: 'destructive',
            });
          }
        }
        
        return {
          suggestions: [],
          incomplete: false,
        };
      } finally {
        setIsLoading(false);
        onStatusChange?.('idle');
      }
    },
    300, // 300ms debounce
    { leading: false, trailing: true }
  );

  // Helper function to get Monaco completion kind
  const getCompletionItemKind = (kind: string): Monaco.languages.CompletionItemKind => {
    const kindMap: Record<string, Monaco.languages.CompletionItemKind> = {
      snippet: Monaco.languages.CompletionItemKind.Snippet,
      function: Monaco.languages.CompletionItemKind.Function,
      variable: Monaco.languages.CompletionItemKind.Variable,
      class: Monaco.languages.CompletionItemKind.Class,
      keyword: Monaco.languages.CompletionItemKind.Keyword,
      text: Monaco.languages.CompletionItemKind.Text,
    };
    
    return kindMap[kind] || Monaco.languages.CompletionItemKind.Text;
  };

  // Register the completion provider
  useEffect(() => {
    if (!editor || !enabled) {
      // Clean up if disabled
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
      return;
    }

    // Register AI completion provider for all languages
    providerRef.current = Monaco.languages.registerCompletionItemProvider('*', {
      triggerCharacters: autoTrigger ? ['.', '(', '[', '{', ' ', '\n'] : [],
      
      async provideCompletionItems(model, position, context, token) {
        // Only provide AI completions when manually invoked or auto-triggered
        if (
          context.triggerKind === Monaco.languages.CompletionTriggerKind.Invoke ||
          (autoTrigger && context.triggerKind === Monaco.languages.CompletionTriggerKind.TriggerCharacter)
        ) {
          return fetchAICompletions(model, position, context, token);
        }
        
        return { suggestions: [] };
      },

      async resolveCompletionItem(item: AICompletionItem, token) {
        // Add AI badge and styling to the item when resolved
        if (item.isAIGenerated) {
          // Add AI indicator to documentation
          if (typeof item.documentation === 'object' && item.documentation.value) {
            item.documentation.value = `<div style="color: #F26207;">🤖 AI Generated</div>\n${item.documentation.value}`;
          }
        }
        return item;
      },
    });

    // Register keyboard shortcut for manual AI completion (Ctrl+Alt+Space)
    const aiCompletionAction = editor.addAction({
      id: 'ai-code-completion',
      label: 'Trigger AI Code Completion',
      keybindings: [
        Monaco.KeyMod.CtrlCmd | Monaco.KeyMod.Alt | Monaco.KeyCode.Space,
      ],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: async (ed) => {
        // Trigger completion manually
        ed.trigger('ai-completion', 'editor.action.triggerSuggest', {});
        
        // Show a toast to indicate AI completion is triggered
        toast({
          title: 'AI Completion',
          description: 'Fetching AI suggestions...',
          duration: 2000,
        });
      },
    });

    // Cleanup function
    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
        providerRef.current = null;
      }
      aiCompletionAction.dispose();
      
      // Cancel any pending requests
      if (completionRequestRef.current) {
        completionRequestRef.current.abort();
      }
    };
  }, [editor, enabled, autoTrigger, model, confidenceThreshold]);

  // Custom CSS for AI suggestions
  useEffect(() => {
    if (!enabled) return;

    const styleId = 'ai-completion-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      /* AI Completion Styles */
      .monaco-list-row:has(.codicon-ai) {
        background: linear-gradient(90deg, rgba(242, 98, 7, 0.05) 0%, transparent 100%);
        border-left: 2px solid #F26207;
      }
      
      .monaco-list-row:has(.codicon-ai):hover {
        background: linear-gradient(90deg, rgba(242, 98, 7, 0.1) 0%, transparent 100%);
      }
      
      /* AI Badge in suggestion widget */
      .suggest-widget .monaco-list-row .codicon-ai::before {
        content: "🤖";
        font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      }
      
      /* Fade-in animation for AI suggestions */
      .monaco-list-row:has(.codicon-ai) {
        animation: ai-suggestion-fade-in 0.3s ease-in-out;
      }
      
      @keyframes ai-suggestion-fade-in {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      /* Loading indicator */
      .ai-completion-loading {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        background: rgba(242, 98, 7, 0.1);
        border: 1px solid #F26207;
        border-radius: 4px;
        font-size: 12px;
        color: #F26207;
        z-index: 1000;
        animation: pulse 1.5s infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }
    `;

    return () => {
      // Don't remove styles on cleanup as other instances might be using them
    };
  }, [enabled]);

  // Render loading indicator
  if (isLoading && editor) {
    return (
      <div 
        className="ai-completion-loading"
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
        }}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>AI Processing...</span>
      </div>
    );
  }

  return null;
}

// Export a hook for managing AI completion state
export function useAICompletion(editor: Monaco.editor.IStandaloneCodeEditor | null) {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [model, setModel] = useState('Claude 3.5 Sonnet');
  const [autoTrigger, setAutoTrigger] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);

  return {
    enabled,
    setEnabled,
    status,
    model,
    setModel,
    autoTrigger,
    setAutoTrigger,
    confidenceThreshold,
    setConfidenceThreshold,
    Component: () => (
      <AICodeCompletion
        editor={editor}
        enabled={enabled}
        model={model}
        autoTrigger={autoTrigger}
        confidenceThreshold={confidenceThreshold}
        onStatusChange={setStatus}
      />
    ),
  };
}