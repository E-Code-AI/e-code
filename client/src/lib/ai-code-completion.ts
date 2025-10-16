// @ts-nocheck
/**
 * AI-powered inline code completion for Monaco Editor
 * Provides real-time suggestions as users type
 */

import * as monaco from 'monaco-editor';
import { apiRequest } from '@/lib/queryClient';

interface AICompletionResponse {
  completions: Array<{
    text: string;
    confidence: number;
    range?: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  }>;
}

export class AICodeCompletionProvider implements monaco.languages.InlineCompletionsProvider {
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastRequest: string = '';
  private isEnabled: boolean = true;
  
  constructor(private projectContext?: string) {}

  async provideInlineCompletions(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.InlineCompletionContext,
    token: monaco.CancellationToken
  ): Promise<monaco.languages.InlineCompletions> {
    if (!this.isEnabled) {
      return { items: [] };
    }

    // Don't provide completions if we're in the middle of a word
    const lineContent = model.getLineContent(position.lineNumber);
    const charBefore = lineContent[position.column - 2];
    const charAfter = lineContent[position.column - 1];
    
    if (charAfter && /\w/.test(charAfter)) {
      return { items: [] };
    }

    // Get code context
    const code = model.getValue();
    const fileName = model.uri.path.split('/').pop() || 'untitled';
    const language = model.getLanguageId();
    
    // Create request key to prevent duplicate requests
    const requestKey = `${position.lineNumber}:${position.column}:${lineContent}`;
    if (requestKey === this.lastRequest) {
      return { items: [] };
    }
    this.lastRequest = requestKey;

    try {
      // Debounce requests to avoid overwhelming the API
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      return new Promise((resolve) => {
        this.debounceTimer = setTimeout(async () => {
          if (token.isCancellationRequested) {
            resolve({ items: [] });
            return;
          }

          try {
            const response = await apiRequest('/api/ai/code-completion', {
              method: 'POST',
              body: JSON.stringify({
                code,
                position: {
                  line: position.lineNumber,
                  column: position.column
                },
                language,
                fileName,
                projectContext: this.projectContext
              })
            }) as AICompletionResponse;

            if (!response || !response.completions || token.isCancellationRequested) {
              resolve({ items: [] });
              return;
            }

            // Convert to Monaco inline completion items
            const items: monaco.languages.InlineCompletion[] = response.completions
              .filter((c: any) => c.confidence > 0.5) // Only show high-confidence completions
              .map((completion: any) => ({
                insertText: completion.text,
                range: new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column
                ),
                command: {
                  id: 'aiCompletion.accept',
                  title: 'Accept AI Completion',
                  arguments: [completion.text]
                }
              }));

            resolve({ items });
          } catch (error) {
            console.error('Error getting AI completions:', error);
            resolve({ items: [] });
          }
        }, 300); // 300ms debounce
      });
    } catch (error) {
      console.error('Error in AI completion provider:', error);
      return { items: [] };
    }
  }

  freeInlineCompletions(): void {
    // Clean up any resources
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  handleItemDidShow?(
    completions: monaco.languages.InlineCompletions,
    item: monaco.languages.InlineCompletion
  ): void {
    // Track when completions are shown (for analytics)
    console.log('AI completion shown:', item.insertText);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  updateProjectContext(context: string): void {
    this.projectContext = context;
  }
}

// Register AI completion provider for supported languages
export function registerAICodeCompletion(
  editor: monaco.editor.IStandaloneCodeEditor,
  projectContext?: string
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];
  const provider = new AICodeCompletionProvider(projectContext);
  
  // Register for multiple languages
  const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 'go', 'rust', 'php', 'ruby'];
  
  languages.forEach(language => {
    const disposable = monaco.languages.registerInlineCompletionsProvider(
      language,
      provider
    );
    disposables.push(disposable);
  });

  // Add command to accept completion and send feedback
  disposables.push(
    monaco.editor.addCommand({
      id: 'aiCompletion.accept',
      run: async (accessor, completionText: string) => {
        // Send feedback that completion was accepted
        try {
          await apiRequest('/api/ai/code-completion/feedback', {
            method: 'POST',
            body: JSON.stringify({
              completion: completionText,
              accepted: true,
              context: {
                language: editor.getModel()?.getLanguageId(),
                fileName: editor.getModel()?.uri.path.split('/').pop()
              }
            })
          });
        } catch (error) {
          console.error('Error sending completion feedback:', error);
        }
      }
    })
  );

  // Add settings to toggle AI completions
  disposables.push(
    monaco.editor.addCommand({
      id: 'aiCompletion.toggle',
      run: () => {
        const currentState = provider['isEnabled'];
        provider.setEnabled(!currentState);
        console.log(`AI completions ${!currentState ? 'enabled' : 'disabled'}`);
      }
    })
  );

  return disposables;
}

// Helper to check if AI completions are available
export async function checkAICompletionAvailability(): Promise<boolean> {
  try {
    // Quick check to see if the API endpoint is available
    const response = await fetch('/api/ai/code-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '// test',
        position: { line: 1, column: 7 },
        language: 'javascript',
        fileName: 'test.js'
      })
    });
    
    return response.ok;
  } catch {
    return false;
  }
}