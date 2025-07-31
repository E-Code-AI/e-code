import * as vscode from 'vscode';
import { ECodeAIService } from './aiService';
import { CodeAnalyzer } from './codeAnalyzer';

export class SuggestionProvider implements vscode.InlineCompletionItemProvider {
    private readonly debounceTime = 1000; // 1 second
    private debounceTimer: NodeJS.Timeout | undefined;
    private lastRequest: string = '';

    constructor(
        private aiService: ECodeAIService,
        private codeAnalyzer: CodeAnalyzer
    ) {}

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        // Check if auto-suggest is enabled
        const config = vscode.workspace.getConfiguration('ecodeCopilot');
        if (!config.get('autoSuggest', true)) {
            return null;
        }

        // Get current line and check if we should provide suggestions
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);
        
        // Don't suggest if cursor is in a string or comment
        if (this.isInStringOrComment(textBeforeCursor, document.languageId)) {
            return null;
        }

        // Check if we should trigger a suggestion
        if (!this.shouldTriggerSuggestion(textBeforeCursor, context)) {
            return null;
        }

        try {
            // Debounce requests to avoid too many API calls
            const currentRequest = `${document.fileName}:${position.line}:${position.character}:${textBeforeCursor}`;
            if (currentRequest === this.lastRequest) {
                return null;
            }
            this.lastRequest = currentRequest;

            // Clear existing timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            // Return a promise that resolves after debounce period
            return new Promise((resolve) => {
                this.debounceTimer = setTimeout(async () => {
                    try {
                        const suggestions = await this.generateSuggestions(document, position, textBeforeCursor);
                        resolve(suggestions);
                    } catch (error) {
                        console.error('Error generating suggestions:', error);
                        resolve(null);
                    }
                }, config.get('suggestionDelay', this.debounceTime));
            });

        } catch (error) {
            console.error('Error in provideInlineCompletionItems:', error);
            return null;
        }
    }

    private async generateSuggestions(
        document: vscode.TextDocument,
        position: vscode.Position,
        textBeforeCursor: string
    ): Promise<vscode.InlineCompletionItem[] | null> {
        const config = vscode.workspace.getConfiguration('ecodeCopilot');
        const maxSuggestions = config.get('maxSuggestions', 3);

        // Get context around the cursor
        const contextRange = this.getContextRange(document, position);
        const contextCode = document.getText(contextRange);
        const surroundingCode = this.getSurroundingCode(document, position);

        try {
            const suggestions = await this.aiService.generateCodeSuggestion({
                code: textBeforeCursor,
                language: document.languageId,
                cursorPosition: position.character,
                fileName: document.fileName,
                surroundingCode: surroundingCode
            });

            if (!suggestions || suggestions.length === 0) {
                return null;
            }

            // Convert suggestions to inline completion items
            const items: vscode.InlineCompletionItem[] = [];
            
            for (let i = 0; i < Math.min(suggestions.length, maxSuggestions); i++) {
                const suggestion = suggestions[i];
                if (suggestion && suggestion.trim()) {
                    const completionText = this.formatSuggestion(suggestion, textBeforeCursor);
                    if (completionText) {
                        items.push(new vscode.InlineCompletionItem(
                            completionText,
                            new vscode.Range(position, position)
                        ));
                    }
                }
            }

            return items.length > 0 ? items : null;

        } catch (error) {
            console.error('Error generating AI suggestions:', error);
            return this.getFallbackSuggestions(document, position, textBeforeCursor);
        }
    }

    private shouldTriggerSuggestion(textBeforeCursor: string, context: vscode.InlineCompletionContext): boolean {
        // Don't trigger if the line is empty or just whitespace
        if (!textBeforeCursor.trim()) {
            return false;
        }

        // Don't trigger immediately after certain characters
        const lastChar = textBeforeCursor.slice(-1);
        if ([';', '{', '}', ')', ']'].includes(lastChar)) {
            return false;
        }

        // Trigger after certain patterns
        const triggerPatterns = [
            /\w+\s*=\s*$/, // Variable assignment
            /function\s+\w+\s*\([^)]*\)\s*{\s*$/, // Function start
            /if\s*\([^)]*\)\s*{\s*$/, // If statement
            /for\s*\([^)]*\)\s*{\s*$/, // For loop
            /while\s*\([^)]*\)\s*{\s*$/, // While loop
            /\.$/,  // After dot (method/property access)
            /\w+\s*\(\s*$/, // Function call
            /import\s+$/, // Import statement
            /from\s+['"][^'"]*$/, // Import from
        ];

        return triggerPatterns.some(pattern => pattern.test(textBeforeCursor));
    }

    private isInStringOrComment(text: string, languageId: string): boolean {
        // Simple check for strings and comments
        const inString = /['"`].*['"`]/.test(text) && !/['"`].*['"`].*['"`]/.test(text);
        const inComment = text.includes('//') || text.includes('/*') || text.includes('#');
        return inString || inComment;
    }

    private getContextRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
        // Get 10 lines before and after current position for context
        const startLine = Math.max(0, position.line - 10);
        const endLine = Math.min(document.lineCount - 1, position.line + 10);
        
        return new vscode.Range(
            new vscode.Position(startLine, 0),
            new vscode.Position(endLine, document.lineAt(endLine).text.length)
        );
    }

    private getSurroundingCode(document: vscode.TextDocument, position: vscode.Position): string {
        const startLine = Math.max(0, position.line - 5);
        const endLine = Math.min(document.lineCount - 1, position.line + 5);
        
        let code = '';
        for (let i = startLine; i <= endLine; i++) {
            code += document.lineAt(i).text + '\n';
        }
        
        return code;
    }

    private formatSuggestion(suggestion: string, textBeforeCursor: string): string {
        // Clean up the suggestion
        let formatted = suggestion.trim();
        
        // Remove any leading text that might duplicate what's already there
        const words = textBeforeCursor.trim().split(' ');
        const lastWord = words[words.length - 1];
        
        if (lastWord && formatted.startsWith(lastWord)) {
            formatted = formatted.substring(lastWord.length);
        }

        // Ensure proper spacing
        if (formatted && !formatted.startsWith(' ') && textBeforeCursor && !textBeforeCursor.endsWith(' ')) {
            formatted = ' ' + formatted;
        }

        return formatted;
    }

    private getFallbackSuggestions(
        document: vscode.TextDocument,
        position: vscode.Position,
        textBeforeCursor: string
    ): vscode.InlineCompletionItem[] {
        const suggestions: string[] = [];
        const language = document.languageId;

        // Language-specific fallback suggestions
        if (textBeforeCursor.endsWith('console.')) {
            suggestions.push('log()');
        } else if (textBeforeCursor.endsWith('document.')) {
            suggestions.push('getElementById()', 'querySelector()', 'createElement()');
        } else if (textBeforeCursor.includes('function') && textBeforeCursor.endsWith('{')) {
            suggestions.push('\n\t\n}');
        } else if (language === 'python' && textBeforeCursor.endsWith('print(')) {
            suggestions.push('""');
        }

        return suggestions.map(suggestion => 
            new vscode.InlineCompletionItem(
                suggestion,
                new vscode.Range(position, position)
            )
        );
    }
}