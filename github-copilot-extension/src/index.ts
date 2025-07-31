import { CopilotProvider, CompletionRequest, CompletionResponse, ChatRequest, ChatResponse } from '@github/copilot-sdk';
import axios from 'axios';

export class ECodeCopilotProvider implements CopilotProvider {
    private apiClient = axios.create({
        baseURL: 'https://e-code.app/api',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    constructor(private apiToken: string) {
        this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${apiToken}`;
    }

    async getCompletions(request: CompletionRequest): Promise<CompletionResponse> {
        try {
            const response = await this.apiClient.post('/ai/completion', {
                code: request.prefix,
                language: request.language,
                suffix: request.suffix,
                maxTokens: request.maxTokens || 150
            });

            return {
                completions: response.data.completions.map((c: any) => ({
                    text: c.text,
                    score: c.confidence,
                    range: request.position
                }))
            };
        } catch (error) {
            console.error('E-Code completion error:', error);
            return { completions: [] };
        }
    }

    async chat(request: ChatRequest): Promise<ChatResponse> {
        try {
            const response = await this.apiClient.post('/ai/chat', {
                messages: request.messages,
                context: {
                    file: request.file,
                    language: request.language,
                    selection: request.selection
                }
            });

            return {
                message: response.data.content,
                suggestions: response.data.suggestions || []
            };
        } catch (error) {
            console.error('E-Code chat error:', error);
            return { message: 'Failed to get response from E-Code AI' };
        }
    }

    async explainCode(request: { code: string; language: string }): Promise<string> {
        try {
            const response = await this.apiClient.post('/ai/explanation', {
                code: request.code,
                language: request.language
            });

            return response.data.explanation;
        } catch (error) {
            console.error('E-Code explain error:', error);
            return 'Failed to explain code';
        }
    }

    async fixProblems(request: { code: string; problems: string[]; language: string }): Promise<string> {
        try {
            const response = await this.apiClient.post('/ai/fix', {
                code: request.code,
                problems: request.problems,
                language: request.language
            });

            return response.data.fixedCode;
        } catch (error) {
            console.error('E-Code fix error:', error);
            return request.code; // Return original code if fix fails
        }
    }

    async generateTests(request: { code: string; language: string; framework?: string }): Promise<string> {
        try {
            const response = await this.apiClient.post('/ai/tests', {
                code: request.code,
                language: request.language,
                framework: request.framework || 'jest'
            });

            return response.data.tests;
        } catch (error) {
            console.error('E-Code test generation error:', error);
            return '// Failed to generate tests';
        }
    }

    async generateDocs(request: { code: string; language: string; style?: string }): Promise<string> {
        try {
            const response = await this.apiClient.post('/ai/document', {
                code: request.code,
                language: request.language,
                style: request.style || 'jsdoc'
            });

            return response.data.documentation;
        } catch (error) {
            console.error('E-Code doc generation error:', error);
            return '// Failed to generate documentation';
        }
    }
}

// Export the provider factory
export function createProvider(config: { apiToken: string }): ECodeCopilotProvider {
    return new ECodeCopilotProvider(config.apiToken);
}