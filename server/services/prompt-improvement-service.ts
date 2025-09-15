import { AIService } from '../ai/ai-service';

interface PromptImprovementResult {
  improvedPrompt: string;
  improvements: string[];
  reasoning: string;
}

export class PromptImprovementService {
  private aiService: AIService;
  
  constructor() {
    this.aiService = new AIService();
  }
  
  async improvePrompt(originalPrompt: string): Promise<PromptImprovementResult> {
    const improvementSystemPrompt = `You are an expert prompt engineer. Your job is to improve user prompts to make them more effective, clear, and likely to produce high-quality results from AI systems.

Guidelines for improvement:
1. Add specific context and constraints
2. Include examples if helpful
3. Specify desired format and structure
4. Add role-playing elements if appropriate
5. Include quality criteria
6. Make the prompt more actionable
7. Ensure clarity and remove ambiguity

Return your response as JSON with this exact structure:
{
  "improvedPrompt": "The improved version of the prompt",
  "improvements": ["list", "of", "specific", "improvements", "made"],
  "reasoning": "Brief explanation of why these improvements were made"
}`;

    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: improvementSystemPrompt },
        { 
          role: 'user', 
          content: `Please improve this prompt:\n\n"${originalPrompt}"\n\nProvide the improved version along with the list of improvements made.` 
        }
      ], {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500,
        tools: false
      });
      
      // Parse the JSON response
      let result: PromptImprovementResult;
      try {
        result = JSON.parse(response.content);
      } catch (parseError) {
        // Fallback if AI doesn't return valid JSON
        result = {
          improvedPrompt: response.content,
          improvements: ['General refinement and clarity improvements'],
          reasoning: 'The prompt has been refined for better clarity and effectiveness.'
        };
      }
      
      // Validate the result
      if (!result.improvedPrompt || result.improvedPrompt.trim() === '') {
        throw new Error('No improvement generated');
      }
      
      return result;
    } catch (error) {
      console.error('Error improving prompt:', error);
      throw new Error('Failed to improve prompt');
    }
  }
  
  async batchImprovePrompts(prompts: string[]): Promise<PromptImprovementResult[]> {
    const results = await Promise.allSettled(
      prompts.map(prompt => this.improvePrompt(prompt))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to improve prompt ${index}:`, result.reason);
        return {
          improvedPrompt: prompts[index],
          improvements: [],
          reasoning: 'Failed to improve this prompt'
        };
      }
    });
  }
  
  // Validate if a prompt is well-structured
  async validatePrompt(prompt: string): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    const validationSystemPrompt = `You are a prompt quality validator. Analyze the given prompt and rate it on a scale of 1-10 for clarity, specificity, and effectiveness.

Return your response as JSON with this structure:
{
  "score": 7,
  "issues": ["list", "of", "identified", "issues"],
  "suggestions": ["list", "of", "improvement", "suggestions"]
}`;

    try {
      const response = await this.aiService.generateResponse([
        { role: 'system', content: validationSystemPrompt },
        { role: 'user', content: `Please analyze this prompt for quality:\n\n"${prompt}"` }
      ], {
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        maxTokens: 800,
        tools: false
      });
      
      const result = JSON.parse(response.content);
      return {
        score: Math.max(1, Math.min(10, result.score || 5)),
        issues: result.issues || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('Error validating prompt:', error);
      return {
        score: 5,
        issues: ['Unable to analyze prompt'],
        suggestions: ['Consider making the prompt more specific and clear']
      };
    }
  }
}