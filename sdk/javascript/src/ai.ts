import { ECodeClient } from './client';
import { AIMessage, AICompletionOptions } from './types';

export class AIAssistant {
    constructor(private client: ECodeClient) {}

    /**
     * Chat with AI assistant
     */
    async chat(messages: AIMessage[], projectId?: string) {
        const endpoint = projectId 
            ? `/projects/${projectId}/ai/chat`
            : '/ai/chat';
            
        return this.client.post(endpoint, { messages });
    }

    /**
     * Get code completion
     */
    async complete(options: AICompletionOptions) {
        return this.client.post('/ai/completion', options);
    }

    /**
     * Explain code
     */
    async explain(code: string, language: string) {
        return this.client.post('/ai/explanation', { code, language });
    }

    /**
     * Generate tests for code
     */
    async generateTests(code: string, language: string, framework?: string) {
        return this.client.post('/ai/tests', { 
            code, 
            language, 
            framework: framework || 'jest' 
        });
    }

    /**
     * Generate documentation
     */
    async generateDocs(code: string, language: string, style?: string) {
        return this.client.post('/ai/document', { 
            code, 
            language, 
            style: style || 'jsdoc' 
        });
    }

    /**
     * Fix code problems
     */
    async fix(code: string, problems: string[], language: string) {
        return this.client.post('/ai/fix', { code, problems, language });
    }

    /**
     * Convert code to another language
     */
    async convert(code: string, fromLanguage: string, toLanguage: string) {
        return this.client.post('/ai/convert', {
            code,
            from: fromLanguage,
            to: toLanguage
        });
    }

    /**
     * Detect bugs in code
     */
    async detectBugs(code: string, language: string) {
        return this.client.post(`/ai/detect-bugs`, { code, language });
    }

    /**
     * Suggest refactoring
     */
    async refactor(code: string, language: string) {
        return this.client.post(`/ai/refactor`, { code, language });
    }

    /**
     * Review code
     */
    async review(code: string, language: string) {
        return this.client.post(`/ai/review`, { code, language });
    }
}