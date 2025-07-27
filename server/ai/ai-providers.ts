import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from "@google/genai";

export interface AIProvider {
  name: string;
  generateChat(messages: any[], options?: any): Promise<string>;
  generateCodeWithUnderstanding(messages: any[], codeAnalysis: any, options?: any): Promise<string>;
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private client: OpenAI;
  
  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }
  
  async generateChat(messages: any[], options?: any): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'gpt-4o',
      messages,
      ...options
    });
    
    return response.choices[0].message.content || '';
  }
  
  async generateCodeWithUnderstanding(messages: any[], codeAnalysis: any, options?: any): Promise<string> {
    const enhancedMessages = [...messages];
    if (codeAnalysis) {
      enhancedMessages.push({
        role: 'system',
        content: `Code Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`
      });
    }
    
    return this.generateChat(enhancedMessages, options);
  }
}

export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async generateChat(messages: any[], options?: any): Promise<string> {
    // Convert OpenAI format to Anthropic format
    const anthropicMessages = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));
    
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    
    const response = await this.client.messages.create({
      // Use latest Claude model as per blueprint instructions
      model: options?.model || 'claude-sonnet-4-20250514',
      messages: anthropicMessages,
      system: systemMessage,
      max_tokens: options?.max_tokens || 1024,
      ...options
    });
    
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
  
  async generateCodeWithUnderstanding(messages: any[], codeAnalysis: any, options?: any): Promise<string> {
    const enhancedMessages = [...messages];
    if (codeAnalysis) {
      const systemMsg = messages.find(m => m.role === 'system');
      if (systemMsg) {
        systemMsg.content += `\n\nCode Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`;
      } else {
        messages.unshift({
          role: 'system',
          content: `Code Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`
        });
      }
    }
    
    return this.generateChat(messages, options);
  }
}

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private client: GoogleGenAI;
  
  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }
  
  async generateChat(messages: any[], options?: any): Promise<string> {
    // Convert to Gemini format
    const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
    
    const response = await this.client.models.generateContent({
      model: options?.model || 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || '';
  }
  
  async generateCodeWithUnderstanding(messages: any[], codeAnalysis: any, options?: any): Promise<string> {
    const enhancedMessages = [...messages];
    if (codeAnalysis) {
      enhancedMessages.push({
        role: 'system',
        content: `Code Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`
      });
    }
    
    return this.generateChat(enhancedMessages, options);
  }
}

export class XAIProvider implements AIProvider {
  name = 'xai';
  private client: OpenAI;
  
  constructor(apiKey: string) {
    // xAI uses OpenAI SDK with different base URL
    this.client = new OpenAI({ 
      baseURL: "https://api.x.ai/v1", 
      apiKey 
    });
  }
  
  async generateChat(messages: any[], options?: any): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || 'grok-2-1212',
      messages,
      ...options
    });
    
    return response.choices[0].message.content || '';
  }
  
  async generateCodeWithUnderstanding(messages: any[], codeAnalysis: any, options?: any): Promise<string> {
    const enhancedMessages = [...messages];
    if (codeAnalysis) {
      enhancedMessages.push({
        role: 'system',
        content: `Code Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`
      });
    }
    
    return this.generateChat(enhancedMessages, options);
  }
}

export class PerplexityProvider implements AIProvider {
  name = 'perplexity';
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateChat(messages: any[], options?: any): Promise<string> {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options?.model || 'llama-3.1-sonar-small-128k-online',
        messages,
        max_tokens: options?.max_tokens,
        temperature: options?.temperature || 0.2,
        stream: false
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content || '';
  }
  
  async generateCodeWithUnderstanding(messages: any[], codeAnalysis: any, options?: any): Promise<string> {
    const enhancedMessages = [...messages];
    if (codeAnalysis) {
      enhancedMessages.push({
        role: 'system',
        content: `Code Analysis: ${JSON.stringify(codeAnalysis, null, 2)}`
      });
    }
    
    return this.generateChat(enhancedMessages, options);
  }
}

export class AIProviderFactory {
  static create(provider: string, apiKey: string): AIProvider {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'anthropic':
        return new AnthropicProvider(apiKey);
      case 'gemini':
        return new GeminiProvider(apiKey);
      case 'xai':
        return new XAIProvider(apiKey);
      case 'perplexity':
        return new PerplexityProvider(apiKey);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
  
  static getAvailableProviders(): string[] {
    return ['openai', 'anthropic', 'gemini', 'xai', 'perplexity'];
  }
}