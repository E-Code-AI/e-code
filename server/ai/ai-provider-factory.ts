// @ts-nocheck
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIProvider {
  generateCode(prompt: string, context?: any): Promise<string>;
  analyzeCode(code: string): Promise<any>;
  generateTests(code: string): Promise<string>;
  explainCode(code: string): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateCode(prompt: string, context?: any): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert software developer. Generate clean, production-ready code based on the requirements.'
        },
        {
          role: 'user',
          content: context ? `Context: ${JSON.stringify(context)}\n\nRequirement: ${prompt}` : prompt
        }
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || '';
  }

  async analyzeCode(code: string): Promise<any> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a code analysis expert. Analyze the provided code for quality, security, and performance issues.'
        },
        {
          role: 'user',
          content: code
        }
      ],
      temperature: 0.1,
    });

    return {
      analysis: response.choices[0]?.message?.content || '',
      timestamp: new Date().toISOString(),
    };
  }

  async generateTests(code: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Generate comprehensive unit tests for the provided code. Use appropriate testing frameworks.'
        },
        {
          role: 'user',
          content: code
        }
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || '';
  }

  async explainCode(code: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Explain the provided code in clear, technical terms. Include what it does, how it works, and any notable patterns.'
        },
        {
          role: 'user',
          content: code
        }
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || '';
  }
}

class GoogleAIProvider implements AIProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateCode(prompt: string, context?: any): Promise<string> {
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const fullPrompt = context 
      ? `Context: ${JSON.stringify(context)}\n\nRequirement: ${prompt}` 
      : prompt;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  }

  async analyzeCode(code: string): Promise<any> {
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Analyze this code for quality, security, and performance issues:\n\n${code}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      analysis: response.text(),
      timestamp: new Date().toISOString(),
    };
  }

  async generateTests(code: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Generate comprehensive unit tests for this code:\n\n${code}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  async explainCode(code: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Explain this code in clear, technical terms:\n\n${code}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
}

export class AIProviderFactory {
  static createProvider(providerType: string, apiKey: string): AIProvider {
    switch (providerType.toLowerCase()) {
      case 'openai':
        return new OpenAIProvider(apiKey);
      case 'google':
      case 'gemini':
        return new GoogleAIProvider(apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${providerType}`);
    }
  }

  static async getDefaultProvider(): Promise<AIProvider> {
    // Try to get API keys from environment variables
    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;

    if (openaiKey) {
      return this.createProvider('openai', openaiKey);
    } else if (googleKey) {
      return this.createProvider('google', googleKey);
    } else {
      throw new Error('No AI provider API keys found in environment variables');
    }
  }
}

export { OpenAIProvider, GoogleAIProvider };