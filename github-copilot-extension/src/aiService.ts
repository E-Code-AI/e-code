import * as vscode from 'vscode';
import axios from 'axios';

export class ECodeAIService {
    private apiEndpoint: string;
    private apiKey?: string;

    constructor(private context: vscode.ExtensionContext) {
        this.apiEndpoint = this.getConfiguration().get('apiEndpoint', 'https://e-code.dev/api');
        this.loadApiKey();
    }

    private loadApiKey(): void {
        // Try to get API key from VS Code secrets first
        this.context.secrets.get('ecodeCopilot.apiKey').then(key => {
            if (key) {
                this.apiKey = key;
            }
        });
    }

    private getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('ecodeCopilot');
    }

    async generateResponse(prompt: string): Promise<string> {
        if (!this.apiKey) {
            // Prompt user for API key
            const key = await vscode.window.showInputBox({
                prompt: 'Enter your E-Code API key',
                password: true,
                ignoreFocusOut: true
            });

            if (!key) {
                throw new Error('API key required for E-Code AI features');
            }

            this.apiKey = key;
            await this.context.secrets.store('ecodeCopilot.apiKey', key);
        }

        try {
            const response = await axios.post(`${this.apiEndpoint}/ai/chat`, {
                message: prompt,
                mode: 'assistant',
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data.response) {
                return response.data.response;
            } else if (response.data.message) {
                return response.data.message;
            } else {
                throw new Error('Unexpected response format from AI service');
            }

        } catch (error: any) {
            if (error.response?.status === 401) {
                // Invalid API key, clear it and prompt again
                await this.context.secrets.delete('ecodeCopilot.apiKey');
                this.apiKey = undefined;
                throw new Error('Invalid API key. Please check your E-Code API key.');
            } else if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                throw new Error('Unable to connect to E-Code AI service. Please check your internet connection.');
            } else {
                throw new Error(`AI service error: ${error.message}`);
            }
        }
    }

    async generateCodeSuggestion(context: {
        code: string;
        language: string;
        cursorPosition: number;
        fileName: string;
        surroundingCode?: string;
    }): Promise<string[]> {
        const prompt = `
Generate code completion suggestions for this ${context.language} code:

File: ${context.fileName}
Current code:
\`\`\`${context.language}
${context.code}
\`\`\`

Cursor position: ${context.cursorPosition}
${context.surroundingCode ? `\nSurrounding context:\n${context.surroundingCode}` : ''}

Provide 1-3 relevant code completion suggestions that:
1. Are syntactically correct
2. Follow best practices
3. Are contextually appropriate
4. Complete the current line or add meaningful next lines

Return as JSON array of strings: ["suggestion1", "suggestion2", "suggestion3"]
        `;

        try {
            const response = await this.generateResponse(prompt);
            return JSON.parse(response);
        } catch (error) {
            // Fallback to simple suggestions
            return this.getFallbackSuggestions(context);
        }
    }

    private getFallbackSuggestions(context: { code: string; language: string }): string[] {
        const suggestions: Record<string, string[]> = {
            'javascript': [
                'console.log();',
                'function () {\n\t\n}',
                'const = ;'
            ],
            'typescript': [
                'console.log();',
                'function (): void {\n\t\n}',
                'const : = ;'
            ],
            'python': [
                'print()',
                'def ():\n\tpass',
                'if __name__ == "__main__":\n\t'
            ],
            'java': [
                'System.out.println();',
                'public void () {\n\t\n}',
                'private final = ;'
            ]
        };

        return suggestions[context.language] || ['// Add your code here'];
    }

    async isServiceAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.apiEndpoint}/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async getServiceStatus(): Promise<{
        available: boolean;
        latency?: number;
        version?: string;
    }> {
        const startTime = Date.now();
        
        try {
            const response = await axios.get(`${this.apiEndpoint}/health`, {
                timeout: 5000
            });
            
            return {
                available: true,
                latency: Date.now() - startTime,
                version: response.data.version
            };
        } catch {
            return {
                available: false,
                latency: Date.now() - startTime
            };
        }
    }

    async clearApiKey(): Promise<void> {
        await this.context.secrets.delete('ecodeCopilot.apiKey');
        this.apiKey = undefined;
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await this.generateResponse('Test connection - respond with "OK" if working');
            return response.toLowerCase().includes('ok');
        } catch {
            return false;
        }
    }
}