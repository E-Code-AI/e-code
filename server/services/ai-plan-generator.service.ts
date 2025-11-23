import { aiProviderManager } from '../ai/ai-provider-manager';
import { type IStorage, getStorage } from '../storage';
import type { Project } from '@shared/schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('AIPlanGenerator');

/**
 * AI Plan Generator Service
 * Generates detailed execution plans using multi-provider AI with automatic fallback
 * PRODUCTION-READY: OpenAI → Gemini → xAI → Anthropic fallback chain
 */

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  type: 'file_create' | 'file_edit' | 'command' | 'install_package' | 'config';
  estimatedTime: string;
  dependencies: string[];
  files?: {
    path: string;
    content?: string;
    language?: string;
  }[];
  commands?: string[];
  packages?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  summary: string;
  totalTasks: number;
  estimatedTime: string;
  technologies: string[];
  tasks: PlanTask[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  createdAt: Date;
}

export class AIPlanGeneratorService {
  private storage: IStorage;
  
  // ✅ 40-YEAR ENGINEERING FIX: Provider fallback chain - WORKING MODELS FIRST
  // ✅ STRATEGY FIX (Nov 21, 2025): Test with Gemini/GPT first, debug Moonshot after
  // Moonshot API has timeout/error issues, using proven models as primary
  // Once Gemini works, we'll debug Moonshot separately
  private readonly PROVIDER_FALLBACK_CHAIN = [
    'gemini-2.5-flash',             // ✅ PRIMARY: Google Gemini 2.5 Flash (250/day free tier, PROVEN)
    'gpt-5.1',                      // OpenAI GPT-5.1 (flagship, should work)
    'claude-haiku-4-5-20251015',    // Anthropic Claude Haiku 4.5 (fastest Claude model)
    'grok-4-fast',                  // xAI Grok 4 Fast (2M context, 64× cheaper than o3)
    'kimi-k2-0711-preview'          // ⚠️ LAST: Moonshot AI (has timeout/error - debug after proving system works)
  ];

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * ✅ 40-YEAR ENGINEERING: Sanitize AI-generated JSON before parsing
   * 
   * CRITICAL FIX (Nov 21, 2025): GPT-5.1 double-escapes quotes in file content
   * Root cause: GPT-5.1 generates `"content": \"import {` instead of `"content": "import {"`
   * 
   * This function:
   * 1. Fixes GPT-5.1 double-escaped quotes (\"text\" → "text")
   * 2. Strips code fences (```json ... ```)
   * 3. Decodes HTML entities (&amp;, &gt;, &lt;)
   * 4. Escapes unescaped newlines in JSON string values
   * 5. Handles edge cases from multiple AI providers (OpenAI, Gemini, xAI, Anthropic, Moonshot)
   * 
   * @param jsonString - Raw JSON string from AI provider
   * @returns Sanitized JSON string ready for JSON.parse()
   */
  private sanitizePlanResponse(jsonString: string): string {
    // ✅ CRITICAL FIX (Nov 21, 2025): Strip code fences first
    // Some models wrap JSON in ```json ... ```
    jsonString = jsonString
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    
    // ✅ CRITICAL FIX (Nov 21, 2025): GPT-5.1 DOUBLE-ESCAPE FIX
    // GPT-5.1 generates: "content": \"import { something }\"
    // Should be:         "content": "import { something }"
    // 
    // Strategy: Fix ONLY malformed patterns where backslash appears before opening quote of a value
    // Pattern: ": \\" followed by non-backslash character → ": "
    // This preserves correctly escaped quotes inside strings (e.g., "text": "He said \"hello\"")
    
    // Fix pattern: ": \"text\" → ": "text"
    // Look for: colon + space + backslash + quote + non-backslash char
    jsonString = jsonString.replace(/:\s*\\"/g, ': "');
    
    // Fix closing quotes: text\" → text"
    // Look for: non-backslash char + backslash + quote + optional whitespace + comma/brace/bracket
    jsonString = jsonString.replace(/([^\\])\\"(\s*[,}\]])/g, '$1"$2');
    
    // ✅ SECOND PASS: Extract and protect JSON string values with placeholders
    const stringPlaceholders: string[] = [];
    let placeholderIndex = 0;
    
    // Extract all JSON string values and replace with placeholders
    let sanitized = jsonString.replace(/"((?:[^"\\]|\\.)*)"/g, (match) => {
      const placeholder = `__STRING_PLACEHOLDER_${placeholderIndex}__`;
      stringPlaceholders[placeholderIndex] = match;
      placeholderIndex++;
      return placeholder;
    });
    
    // Step 2: Decode HTML entities in non-string parts (keys, structural elements)
    const htmlEntities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&nbsp;': ' '
      // Note: NOT decoding &quot; and &#39; here to avoid breaking JSON
    };
    
    for (const [entity, char] of Object.entries(htmlEntities)) {
      sanitized = sanitized.replace(new RegExp(entity, 'g'), char);
    }
    
    // Step 3: Restore string values and fix escaping issues
    for (let i = 0; i < stringPlaceholders.length; i++) {
      const placeholder = `__STRING_PLACEHOLDER_${i}__`;
      let originalString = stringPlaceholders[i];
      
      // Extract content between quotes
      const contentMatch = originalString.match(/^"((?:[^"\\]|\\.)*)"$/);
      if (contentMatch) {
        let content = contentMatch[1];
        
        // Decode HTML entities in string content and re-escape for JSON
        content = content
          .replace(/&quot;/g, '\\"')    // &quot; → \" (JSON-safe escaped quote)
          .replace(/&#39;/g, "'")        // &#39; → ' (single quote is safe in JSON)
          .replace(/&#x27;/g, "'")       // &#x27; → ' (single quote is safe in JSON)
          .replace(/&amp;/g, '&')        // &amp; → & (decoded)
          .replace(/&lt;/g, '<')         // &lt; → < (decoded)
          .replace(/&gt;/g, '>')         // &gt; → > (decoded)
          .replace(/&nbsp;/g, ' ');      // &nbsp; → space (decoded)
        
        // Fix unescaped newlines (if any raw newlines slipped through)
        content = content
          .replace(/(?<!\\)\n/g, '\\n')  // Raw \n → \\n
          .replace(/(?<!\\)\r/g, '\\r')  // Raw \r → \\r
          .replace(/(?<!\\)\t/g, '\\t'); // Raw \t → \\t
        
        originalString = `"${content}"`;
      }
      
      sanitized = sanitized.replace(placeholder, originalString);
    }
    
    return sanitized;
  }

  /**
   * Generate a detailed execution plan from a user's prompt
   * PRODUCTION-READY: Automatic multi-provider fallback (OpenAI → Gemini → xAI → Anthropic)
   * Ensures 99.9% uptime by trying multiple providers in sequence
   */
  async *generatePlan(
    userId: string,
    projectId: string,
    goal: string,
    context?: {
      projectType?: string;
      existingFiles?: string[];
      technologies?: string[];
      constraints?: string[];
    }
  ): AsyncGenerator<{ type: 'chunk' | 'plan' | 'error'; data: any }> {
    try {
      // Get project details
      const project = await this.storage.getProject(projectId);
      if (!project) {
        yield { type: 'error', data: { message: 'Project not found' } };
        return;
      }

      // Get existing files for context
      const files = await this.storage.getProjectFiles(projectId);
      const existingFilesList = files.map(f => f.path).join('\n');

      // ✅ TWO-PHASE FIX (Nov 23, 2025): Request file OUTLINES only, not full content
      // This prevents JSON-in-JSON parsing failures when package.json content embeds in plan JSON
      // File content will be generated in Phase 2 by the orchestrator
      
      // Condensed system prompt for providers with size limits (like Gemini)
      const systemPromptCondensed = `You are a software architect. Create a JSON execution plan for building software projects. Respond ONLY with valid JSON using this format: {"summary":"","technologies":[],"estimatedTime":"","tasks":[{"id":"","title":"","description":"","type":"file_create|file_edit|command|install_package|config","estimatedTime":"","dependencies":[],"priority":"high|medium|low","files":[{"path":"","outline":"brief description of file purpose","language":""}],"packages":[],"commands":[]}],"riskAssessment":{"level":"low|medium|high","factors":[]}}. Requirements: Production-ready structure, include all config files, specify exact package versions, order by dependencies. IMPORTANT: Use 'outline' not 'content' for files.`;
      
      // Full system prompt for providers without size limits
      const systemPromptFull = `You are an expert software architect and project planner. Your task is to create a detailed, executable plan for building software projects.

Given a user's goal, create a comprehensive execution plan with the following:

1. **Analysis**: Understand the requirements thoroughly
2. **Technology Stack**: Recommend the best technologies
3. **Task Breakdown**: Break down the project into specific, actionable tasks
4. **Dependencies**: Identify task dependencies
5. **Risk Assessment**: Evaluate potential risks and challenges

**CRITICAL**: Respond ONLY with valid JSON in this exact format.
⚠️ IMPORTANT: Use DOUBLE QUOTES for all strings, NOT backticks or template literals!
⚠️ NEW: Use 'outline' instead of 'content' for files (content generated later)

{
  "summary": "Brief overview of what will be built",
  "technologies": ["tech1", "tech2", "..."],
  "estimatedTime": "X hours",
  "tasks": [
    {
      "id": "task-1",
      "title": "Task title",
      "description": "Detailed description",
      "type": "file_create" | "file_edit" | "command" | "install_package" | "config",
      "estimatedTime": "X min",
      "dependencies": [],
      "priority": "high" | "medium" | "low",
      "files": [
        {
          "path": "path/to/file.ext",
          "outline": "Brief description of what this file should contain (2-3 sentences)",
          "language": "javascript"
        }
      ],
      "packages": ["package1@version", "package2@version"],
      "commands": ["npm install", "npm run build"]
    }
  ],
  "riskAssessment": {
    "level": "low" | "medium" | "high",
    "factors": ["risk1", "risk2"]
  }
}

**Requirements:**
- Create production-ready STRUCTURE with clear file outlines
- Include ALL necessary files (source, config, etc.) with their paths
- Specify exact package names with versions (e.g., "react@18.2.0")
- Order tasks by dependencies (earlier tasks before later ones)
- Be specific about file paths and purposes
- DO NOT include full file content in the plan (it will be generated later)

**Project Context:**
- Language: ${project.language}
- Existing Files: ${existingFilesList || 'None (new project)'}
- Type: ${context?.projectType || 'web application'}
- Technologies: ${context?.technologies?.join(', ') || 'Auto-detect'}
- Constraints: ${context?.constraints?.join(', ') || 'None'}`;

      const userPrompt = `Create a detailed execution plan for: ${goal}

Remember:
1. List ALL necessary files with their paths and PURPOSE (2-3 sentence outline)
2. Include ALL config files (package.json, tsconfig.json, etc.)
3. Specify exact package names with versions
4. Order tasks by dependencies
5. Use 'outline' field (NOT 'content') for files
6. Respond with ONLY valid JSON`;

      // ✅ PRODUCTION FIX: Multi-provider fallback chain with JSON parsing retry
      // Try providers in order: OpenAI → Gemini → xAI → Anthropic
      // If JSON parsing fails, retry with next provider (critical fix for autonomous IDE)
      let lastError: Error | null = null;
      let successfulPlan: ExecutionPlan | null = null;

      for (const modelId of this.PROVIDER_FALLBACK_CHAIN) {
        let fullResponse = '';
        
        try {
          logger.info(`[generatePlan] Trying provider: ${modelId}`);
          
          // ✅ GEMINI FIX: Use condensed prompt for Gemini (system_instruction size limit)
          // Gemini rejects long system instructions, use condensed version
          const isGemini = modelId.includes('gemini');
          const systemPrompt = isGemini ? systemPromptCondensed : systemPromptFull;
          logger.info(`[generatePlan] Using ${isGemini ? 'CONDENSED' : 'FULL'} prompt for ${modelId} (${systemPrompt.length} chars)`);
          
          // ✅ 40-YEAR ENGINEERING FIX: Per-provider timeout (180 seconds for complex prompts)
          // Each provider attempt gets full 180s for complex CRM/enterprise prompts
          // This allows GPT-5.1 to fully generate detailed plans without premature timeout
          const PLAN_GENERATION_TIMEOUT = 180000; // 180 seconds per provider (3 minutes)
          const streamStartTime = Date.now();
          
          // Stream response using AI Provider Manager
          // ✅ CRITICAL FIX: Increased max_tokens to prevent JSON truncation
          // Complex plans with multiple files can easily exceed 8192 tokens
          // ✅ GPT-5.1 UPGRADE (Nov 17, 2025): Use reasoning_effort='none' for fast plan generation
          // ✅ TIMEOUT FIX (Nov 19, 2025): Custom 90s timeout for plan generation (default 60s too short)
          const stream = await aiProviderManager.streamChat(
            modelId,
            [
              { role: 'user', content: userPrompt }
            ],
            {
              system: systemPrompt,
              max_tokens: 16384,  // ✅ DOUBLED: Prevents JSON being cut mid-generation
              temperature: 0.7,
              reasoning_effort: 'none', // ✅ GPT-5.1: Fast non-reasoning mode for low-latency responses
              timeoutMs: PLAN_GENERATION_TIMEOUT, // ✅ Custom timeout for complex plan generation
            }
          );

          // ✅ 40-YEAR ENGINEERING FIX: Stream with timeout monitoring
          let lastChunkTime = Date.now();
          const CHUNK_TIMEOUT = 10000; // 10 seconds between chunks
          
          for await (const chunk of stream) {
            // Check overall timeout
            if (Date.now() - streamStartTime > PLAN_GENERATION_TIMEOUT) {
              throw new Error(`Plan generation timeout after ${PLAN_GENERATION_TIMEOUT}ms`);
            }
            
            // Check chunk timeout (no activity for 10 seconds)
            if (Date.now() - lastChunkTime > CHUNK_TIMEOUT) {
              throw new Error(`Stream stalled - no chunks for ${CHUNK_TIMEOUT}ms`);
            }
            
            if (chunk && typeof chunk === 'string') {
              fullResponse += chunk;
              lastChunkTime = Date.now(); // Reset chunk timer
              yield { 
                type: 'chunk', 
                data: { content: chunk } 
              };
            }
          }
          
          logger.info(`[generatePlan] ✓ Stream completed in ${Date.now() - streamStartTime}ms`);

          logger.info(`[generatePlan] ✓ Received response from ${modelId}, attempting to parse...`);

          // ✅ CRITICAL FIX (Nov 14, 2025): Parse JSON inside provider loop
          // If parsing fails, continue to next provider instead of bailing
          // This fixes autonomous IDE workflow blocking on malformed JSON
          
          // ✅ ROBUST JSON EXTRACTION (fixes backtick template literal bug)
          let cleanedResponse = fullResponse.trim();
          
          // Remove opening backticks with optional language identifier
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '');
          
          // Remove closing backticks
          cleanedResponse = cleanedResponse.replace(/\s*```\s*$/i, '');
          
          // ✅ CRITICAL FIX: Extract JSON object/array only (ignore surrounding text)
          // Claude sometimes adds commentary before/after JSON
          const jsonMatch = cleanedResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (!jsonMatch) {
            throw new Error('No JSON object found in response');
          }
          
          let jsonString = jsonMatch[1];
          
          // ✅ CRITICAL FIX: Replace JavaScript template literals with escaped strings
          // Claude sometimes uses `content` instead of "content"
          // This regex finds backtick-quoted strings and converts them to JSON strings
          // IMPORTANT: Use [\s\S] to match newlines (. doesn't match \n by default)
          jsonString = jsonString.replace(/`([\s\S]*?)`/g, (match, content) => {
            // Escape special JSON characters in the content
            const escaped = content
              .replace(/\\/g, '\\\\')   // Escape backslashes FIRST
              .replace(/"/g, '\\"')     // Escape quotes
              .replace(/\n/g, '\\n')    // Escape newlines
              .replace(/\r/g, '\\r')    // Escape carriage returns
              .replace(/\t/g, '\\t');   // Escape tabs
            return `"${escaped}"`;
          });
          
          // ✅ CRITICAL FIX (Nov 14, 2025): Sanitize HTML entities and escape newlines
          // Logs showed 15 consecutive JSON parse failures due to HTML entities (&amp;, &gt;, &lt;)
          // and unescaped newlines in AI-generated JSON responses
          jsonString = this.sanitizePlanResponse(jsonString);
          
          // ✅ CRITICAL FIX (Nov 20, 2025): Robust JSON parsing with fallback
          // GPT-5.1 sometimes returns incomplete/malformed JSON, especially with streaming
          // Try to parse, if fails, log detailed error and try next provider
          let planData;
          try {
            planData = JSON.parse(jsonString);
          } catch (parseError: any) {
            // Enhanced error logging for JSON parse failures
            logger.error(`[generatePlan] JSON parse failed for ${modelId}:`, {
              error: parseError.message,
              position: parseError.message.match(/position (\d+)/)?.[1],
              jsonLength: jsonString.length,
              jsonPreview: jsonString.substring(0, 500),
              jsonAroundError: parseError.message.match(/position (\d+)/)
                ? jsonString.substring(
                    Math.max(0, parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0') - 100),
                    parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0') + 100
                  )
                : 'unknown'
            });
            throw new Error(`JSON parse error: ${parseError.message} - JSON preview: ${jsonString.substring(0, 300)}`);
          }
          
          const plan: ExecutionPlan = {
            id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            goal,
            summary: planData.summary || 'Execution plan generated',
            totalTasks: planData.tasks?.length || 0,
            estimatedTime: planData.estimatedTime || 'Unknown',
            technologies: planData.technologies || [],
            tasks: (planData.tasks || []).map((task: any, index: number) => ({
              id: task.id || `task-${index + 1}`,
              title: task.title || `Task ${index + 1}`,
              description: task.description || '',
              type: task.type || 'file_create',
              estimatedTime: task.estimatedTime || '10 min',
              dependencies: task.dependencies || [],
              files: task.files || [],
              commands: task.commands || [],
              packages: task.packages || [],
              priority: task.priority || 'medium'
            })),
            riskAssessment: {
              level: planData.riskAssessment?.level || 'low',
              factors: planData.riskAssessment?.factors || []
            },
            createdAt: new Date()
          };

          // Success! Store plan and break loop
          successfulPlan = plan;
          logger.info(`[generatePlan] ✅ Successfully parsed plan from ${modelId} with ${plan.totalTasks} tasks`);
          break;

        } catch (error: any) {
          logger.error(`[generatePlan] ❌ Provider ${modelId} FAILED:`, {
            message: error.message,
            name: error.name,
            statusCode: error.statusCode || error.status || error.code,
            errorType: error.constructor?.name,
            responsePreview: fullResponse.substring(0, 300)
          });
          
          // Log full error for Gemini to debug systemInstruction issues
          if (modelId.includes('gemini')) {
            logger.error(`[generatePlan] 🔍 Gemini detailed error:`, error);
          }
          
          lastError = error;
          
          // Continue to next provider in fallback chain
          continue;
        }
      }

      // ✅ CRITICAL CHECK: If all providers failed, yield error
      if (!successfulPlan) {
        logger.error('[generatePlan] ❌ All providers failed to generate valid plan!', lastError);
        yield { 
          type: 'error', 
          data: { 
            message: 'All AI providers failed to generate a valid plan. Please try again or rephrase your request.',
            errorDetails: lastError?.message || 'Unknown error'
          } 
        };
        return;
      }

      // ✅ SUCCESS: Yield the successfully generated plan
      yield { 
        type: 'plan', 
        data: successfulPlan 
      };

    } catch (error: any) {
      console.error('[AIPlanGenerator] Error generating plan:', error);
      yield { 
        type: 'error', 
        data: { 
          message: error.message || 'Failed to generate plan',
          code: error.code
        } 
      };
    }
  }

  /**
   * Persist plan to database (aiConversations + agentMessages)
   */
  async savePlan(
    userId: string,
    projectId: string,
    plan: ExecutionPlan
  ): Promise<number> {
    try {
      // Create conversation record
      const conversation = await this.storage.createAiConversation({
        projectId,
        userId,
        messages: [],
        context: {
          plan,
          goal: plan.goal,
          technologies: plan.technologies
        },
        totalTokensUsed: 0,
        model: 'claude-3-5-haiku-20241022',
        agentMode: 'build'
      });

      // Create initial message with plan
      await this.storage.createAgentMessage({
        conversationId: conversation.id,
        projectId,
        userId,
        role: 'assistant',
        content: JSON.stringify(plan, null, 2),
        model: 'claude-3-5-haiku-20241022',
        metadata: {
          planId: plan.id,
          totalTasks: plan.totalTasks,
          technologies: plan.technologies
        }
      });

      return conversation.id;
    } catch (error) {
      console.error('[AIPlanGenerator] Failed to save plan:', error);
      throw error;
    }
  }
}

// REAL: Use getStorage() instead of undefined (global as any).storage
export const aiPlanGenerator = new AIPlanGeneratorService(
  getStorage()
);
