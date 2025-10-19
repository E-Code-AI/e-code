import { createLogger } from '../utils/logger';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const logger = createLogger('ai-service');

// Use GPT-5 - the latest OpenAI model (requires max_completion_tokens instead of max_tokens)
const OPENAI_MODEL = 'gpt-5';
// Use Claude 3.5 Sonnet - the latest Anthropic model for code generation
const ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';

class RealAIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private preferredProvider: 'openai' | 'anthropic' = 'openai';

  constructor() {
    logger.info('Initializing AI Service...', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
    });

    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        this.openai = new OpenAI({ 
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 60000, // 60 second timeout for API calls
          maxRetries: 2 // Retry up to 2 times on failure
        });
        logger.info(`OpenAI provider initialized successfully with ${OPENAI_MODEL} model (60s timeout)`);
      } catch (error) {
        logger.error('Failed to initialize OpenAI:', error);
      }
    } else {
      logger.warn('OPENAI_API_KEY not found in environment variables');
    }

    // Initialize Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        logger.info(`Anthropic provider initialized successfully with ${ANTHROPIC_MODEL} model`);
      } catch (error) {
        logger.error('Failed to initialize Anthropic:', error);
      }
    } else {
      logger.warn('ANTHROPIC_API_KEY not found in environment variables');
    }

    // Set preferred provider based on availability
    if (this.anthropic && !this.openai) {
      this.preferredProvider = 'anthropic';
      logger.info('Setting preferred provider to Anthropic');
    } else if (this.openai) {
      logger.info('Setting preferred provider to OpenAI');
    } else {
      logger.error('No AI providers available - both API keys are missing or initialization failed');
    }
  }

  async generateCode(prompt: string, language?: string): Promise<{ code: string; explanation: string }> {
    logger.info('AI code generation requested', { 
      prompt: prompt?.substring(0, 100), 
      language, 
      preferredProvider: this.preferredProvider,
      hasOpenAI: !!this.openai,
      hasAnthropic: !!this.anthropic,
      availableProviders: this.getAvailableProviders()
    });
    
    const systemPrompt = `You are an expert code generator. Generate clean, well-commented, production-ready code.
${language ? `The code should be in ${language}.` : ''}
Return your response in JSON format with two fields:
- "code": The generated code as a string
- "explanation": A brief explanation of what the code does and how to use it`;

    const userPrompt = `Generate code for the following request: ${prompt}`;

    // Try primary provider first
    if (this.preferredProvider === 'openai' && this.openai) {
      try {
        logger.info('Attempting code generation with OpenAI...');
        const result = await this.generateWithOpenAI(systemPrompt, userPrompt);
        logger.info('OpenAI generation successful');
        return result;
      } catch (error) {
        logger.error('OpenAI failed, attempting fallback to Claude:', {
          error: error.message,
          type: error.type || error.name,
          status: error.status
        });
        
        // Fallback to Claude if available
        if (this.anthropic) {
          try {
            logger.info('Falling back to Anthropic (Claude) due to OpenAI failure...');
            const result = await this.generateWithAnthropic(systemPrompt, userPrompt);
            logger.info('Anthropic fallback successful');
            return result;
          } catch (fallbackError) {
            logger.error('Both OpenAI and Anthropic failed:', {
              openaiError: error.message,
              anthropicError: fallbackError.message
            });
            // Return mock if both fail
            return this.mockGenerate(prompt, language);
          }
        } else {
          logger.warn('No fallback provider available after OpenAI failure');
          return this.mockGenerate(prompt, language);
        }
      }
    } 
    // Try Anthropic as primary if OpenAI not available or not preferred
    else if (this.anthropic) {
      try {
        logger.info('Attempting code generation with Anthropic...');
        const result = await this.generateWithAnthropic(systemPrompt, userPrompt);
        logger.info('Anthropic generation successful');
        return result;
      } catch (error) {
        logger.error('Anthropic failed:', {
          error: error.message,
          type: error.error?.type || error.name,
          status: error.status
        });
        
        // Try OpenAI as fallback if available
        if (this.openai && this.preferredProvider !== 'openai') {
          try {
            logger.info('Falling back to OpenAI due to Anthropic failure...');
            const result = await this.generateWithOpenAI(systemPrompt, userPrompt);
            logger.info('OpenAI fallback successful');
            return result;
          } catch (fallbackError) {
            logger.error('Both Anthropic and OpenAI failed:', {
              anthropicError: error.message,
              openaiError: fallbackError.message
            });
            return this.mockGenerate(prompt, language);
          }
        } else {
          logger.warn('No fallback provider available after Anthropic failure');
          return this.mockGenerate(prompt, language);
        }
      }
    } 
    // No providers available
    else {
      logger.warn('No AI provider available, falling back to mock generation');
      logger.warn('Available providers:', this.getAvailableProviders());
      logger.warn('Environment check:', {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
      });
      return this.mockGenerate(prompt, language);
    }
  }

  private async generateWithOpenAI(systemPrompt: string, userPrompt: string): Promise<{ code: string; explanation: string }> {
    if (!this.openai) {
      logger.error('OpenAI client is null, cannot generate code');
      throw new Error('OpenAI not initialized');
    }

    logger.info('Calling OpenAI API with model:', OPENAI_MODEL);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 2048
      });

      logger.info('OpenAI API responded successfully');
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        logger.error('OpenAI response has no content');
        throw new Error('No response from OpenAI');
      }

      logger.info('OpenAI response content received, length:', content.length);

      try {
        const result = JSON.parse(content);
        logger.info('Successfully parsed OpenAI JSON response');
        return {
          code: result.code || '// No code generated',
          explanation: result.explanation || 'Code generated successfully'
        };
      } catch (parseError) {
        logger.warn('Failed to parse OpenAI response as JSON, returning raw content', parseError);
        return {
          code: content,
          explanation: 'Code generated successfully (non-JSON response)'
        };
      }
    } catch (apiError) {
      // Detect if it's a timeout error
      const isTimeout = apiError.message?.toLowerCase().includes('timeout') || 
                       apiError.code === 'ETIMEDOUT' ||
                       apiError.code === 'ECONNABORTED';
      
      logger.error('OpenAI API call failed:', {
        error: apiError.message,
        status: apiError.status,
        type: apiError.type,
        isTimeout,
        code: apiError.code
      });
      
      // Add context to timeout errors
      if (isTimeout) {
        apiError.message = `OpenAI request timed out after 60 seconds. The model may be overloaded. Falling back to Claude...`;
      }
      
      throw apiError;
    }
  }

  private async generateWithAnthropic(systemPrompt: string, userPrompt: string): Promise<{ code: string; explanation: string }> {
    if (!this.anthropic) {
      logger.error('Anthropic client is null, cannot generate code');
      throw new Error('Anthropic not initialized');
    }

    logger.info('Calling Anthropic API with model:', ANTHROPIC_MODEL);
    
    try {
      const response = await this.anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        system: systemPrompt,
        max_tokens: 2048,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });

      logger.info('Anthropic API responded successfully');

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        logger.error('Anthropic response has no text content');
        throw new Error('No response from Anthropic');
      }

      logger.info('Anthropic response content received, length:', content.text.length);

      try {
        const result = JSON.parse(content.text);
        logger.info('Successfully parsed Anthropic JSON response');
        return {
          code: result.code || '// No code generated',
          explanation: result.explanation || 'Code generated successfully'
        };
      } catch (parseError) {
        logger.warn('Failed to parse Anthropic response as JSON, returning raw content', parseError);
        return {
          code: content.text,
          explanation: 'Code generated successfully (non-JSON response)'
        };
      }
    } catch (apiError) {
      logger.error('Anthropic API call failed:', {
        error: apiError.message,
        status: apiError.status,
        type: apiError.error?.type
      });
      throw apiError;
    }
  }

  private mockGenerate(prompt: string, language?: string): { code: string; explanation: string } {
    const lang = language || 'javascript';
    return {
      code: `// Generated ${lang} code for: ${prompt}\nconsole.log('Hello from AI-generated code');`,
      explanation: `This is a placeholder for AI-generated ${lang} code. Connect an AI provider to enable real code generation.`
    };
  }

  async explainCode(code: string): Promise<{ explanation: string }> {
    logger.info('Code explanation requested');

    const systemPrompt = `You are an expert code analyst. Explain the following code clearly and concisely.
Focus on what the code does, how it works, and any important details.
Return your response in JSON format with one field:
- "explanation": A clear explanation of the code`;

    const userPrompt = `Explain this code:\n\n${code}`;

    try {
      if (this.preferredProvider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 1024
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        try {
          const result = JSON.parse(content);
          return { explanation: result.explanation || 'Code analysis complete' };
        } catch {
          return { explanation: content };
        }
      } else if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          system: systemPrompt,
          max_tokens: 1024,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });

        const content = response.content[0];
        if (!content || content.type !== 'text') throw new Error('No response from Anthropic');

        try {
          const result = JSON.parse(content.text);
          return { explanation: result.explanation || 'Code analysis complete' };
        } catch {
          return { explanation: content.text };
        }
      } else {
        return { explanation: 'Code explanation service not available. Please configure an AI provider.' };
      }
    } catch (error) {
      logger.error('Code explanation failed', error);
      return { explanation: 'Failed to explain code. Please try again.' };
    }
  }

  async fixCode(code: string, error: string): Promise<{ code: string; fix: string }> {
    logger.info('Code fix requested');

    const systemPrompt = `You are an expert debugger. Fix the following code based on the error message.
Return your response in JSON format with two fields:
- "code": The fixed code
- "fix": A brief explanation of what was fixed and why`;

    const userPrompt = `Fix this code:\n\n${code}\n\nError: ${error}`;

    try {
      if (this.preferredProvider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 2048
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        try {
          const result = JSON.parse(content);
          return {
            code: result.code || code,
            fix: result.fix || 'Code has been fixed'
          };
        } catch {
          return { code, fix: 'Unable to parse fix response' };
        }
      } else if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          system: systemPrompt,
          max_tokens: 2048,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });

        const content = response.content[0];
        if (!content || content.type !== 'text') throw new Error('No response from Anthropic');

        try {
          const result = JSON.parse(content.text);
          return {
            code: result.code || code,
            fix: result.fix || 'Code has been fixed'
          };
        } catch {
          return { code, fix: 'Unable to parse fix response' };
        }
      } else {
        return { code, fix: 'Code fix service not available. Please configure an AI provider.' };
      }
    } catch (error) {
      logger.error('Code fix failed', error);
      return { code, fix: 'Failed to fix code. Please try again.' };
    }
  }

  async suggestImprovements(code: string): Promise<{ suggestions: string[] }> {
    logger.info('Code improvement suggestions requested');

    const systemPrompt = `You are an expert code reviewer. Analyze the following code and suggest improvements.
Focus on performance, readability, best practices, and potential bugs.
Return your response in JSON format with one field:
- "suggestions": An array of specific improvement suggestions`;

    const userPrompt = `Suggest improvements for this code:\n\n${code}`;

    try {
      if (this.preferredProvider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 1024
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        try {
          const result = JSON.parse(content);
          return { suggestions: result.suggestions || [] };
        } catch {
          return { suggestions: ['Unable to parse suggestions'] };
        }
      } else if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          system: systemPrompt,
          max_tokens: 1024,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });

        const content = response.content[0];
        if (!content || content.type !== 'text') throw new Error('No response from Anthropic');

        try {
          const result = JSON.parse(content.text);
          return { suggestions: result.suggestions || [] };
        } catch {
          return { suggestions: ['Unable to parse suggestions'] };
        }
      } else {
        return { suggestions: ['Code improvement service not available. Please configure an AI provider.'] };
      }
    } catch (error) {
      logger.error('Code improvement suggestions failed', error);
      return { suggestions: ['Failed to generate suggestions. Please try again.'] };
    }
  }

  async generateTests(code: string, framework?: string): Promise<{ tests: string; explanation: string }> {
    logger.info('Test generation requested', { framework });

    const testFramework = framework || 'jest';
    const systemPrompt = `You are an expert test engineer. Generate comprehensive unit tests for the following code.
Use ${testFramework} as the testing framework.
Return your response in JSON format with two fields:
- "tests": The generated test code
- "explanation": A brief explanation of what is being tested and the coverage`;

    const userPrompt = `Generate ${testFramework} tests for this code:\n\n${code}`;

    try {
      if (this.preferredProvider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 2048
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from OpenAI');

        try {
          const result = JSON.parse(content);
          return {
            tests: result.tests || '// No tests generated',
            explanation: result.explanation || 'Tests generated successfully'
          };
        } catch {
          return {
            tests: content,
            explanation: 'Tests generated successfully'
          };
        }
      } else if (this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          system: systemPrompt,
          max_tokens: 2048,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });

        const content = response.content[0];
        if (!content || content.type !== 'text') throw new Error('No response from Anthropic');

        try {
          const result = JSON.parse(content.text);
          return {
            tests: result.tests || '// No tests generated',
            explanation: result.explanation || 'Tests generated successfully'
          };
        } catch {
          return {
            tests: content.text,
            explanation: 'Tests generated successfully'
          };
        }
      } else {
        return {
          tests: `// ${testFramework} test generation not available`,
          explanation: 'Test generation service not available. Please configure an AI provider.'
        };
      }
    } catch (error) {
      logger.error('Test generation failed', error);
      return {
        tests: '// Test generation failed',
        explanation: 'Failed to generate tests. Please try again.'
      };
    }
  }

  // Get available providers
  getAvailableProviders(): string[] {
    const providers = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    return providers;
  }

  // Switch preferred provider
  setPreferredProvider(provider: 'openai' | 'anthropic'): boolean {
    if (provider === 'openai' && this.openai) {
      this.preferredProvider = 'openai';
      logger.info('Switched to OpenAI provider');
      return true;
    } else if (provider === 'anthropic' && this.anthropic) {
      this.preferredProvider = 'anthropic';
      logger.info('Switched to Anthropic provider');
      return true;
    }
    logger.warn(`Provider ${provider} not available`);
    return false;
  }
}

// Export singleton instance  
export const aiService = new RealAIService();