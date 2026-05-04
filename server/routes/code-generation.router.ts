import { Router } from 'express';
import { z } from 'zod';
import { aiProviderManager } from '../ai/ai-provider-manager';
import { createLogger } from '../utils/logger';
import { tierRateLimiters } from '../middleware/tier-rate-limiter';
import { validateAndSetSSEHeaders } from '../utils/sse-headers';
import { DESIGN_SYSTEM_PROMPT } from '../ai/prompts/design-system';
import { MODERN_DESIGN_SYSTEM_PROMPT } from '../ai/prompts/modern-design-system';
import { classifyGenerationError, redactErrorForLog } from './code-generation-errors';
import { OutputGuard } from './code-generation-output-guards';
import { streamWithRetry } from './code-generation-retry';

const logger = createLogger('code-generation-router');
const router = Router();

// Validation schema
const codeGenerationSchema = z.object({
  prompt: z.string().min(10).max(5000),
  language: z.string().optional().default('typescript'),
  modelId: z.string().optional(),
  context: z.string().optional(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string()
  })).optional()
});

/**
 * POST /api/code-generation/generate
 * Generate code using AI with Server-Sent Events streaming
 */
router.post('/generate', tierRateLimiters.api, async (req, res) => {
  try {
    const validated = codeGenerationSchema.parse(req.body);
    const { prompt, language, modelId, context, files } = validated;
    
    logger.info('[Code Generation] Request received', {
      promptLength: prompt.length,
      language,
      modelId,
      hasContext: !!context,
      fileCount: files?.length || 0
    });
    
    // Set SSE headers with CORS security - reject invalid origins with 403
    if (!validateAndSetSSEHeaders(res, req)) {
      return;
    }
    
    // Build system prompt
    const systemPrompt = `You are an expert ${language || 'code'} developer. Generate complete, production-ready application code based on the user's requirements.

${DESIGN_SYSTEM_PROMPT}

${MODERN_DESIGN_SYSTEM_PROMPT}

${context ? `Context: ${context}` : ''}

${files && files.length > 0 ? `Referenced Files:\n${files.map(f => `\n--- ${f.path} ---\n${f.content}`).join('\n')}` : ''}

Hard requirements:
1. Output a multi-file project. Each file MUST be a fenced code block whose path
   appears on a line by itself in the EXACT format: --- path ---
   Example:
   --- src/App.tsx ---
   \`\`\`tsx
   // code here
   \`\`\`
   --- tailwind.config.ts ---
   \`\`\`ts
   // code here
   \`\`\`
   No prose between the path heading and the opening fence.
2. React/TS UI MUST follow this exact contract:
   - shadcn/ui component imports use the alias path: from "@/components/ui/<name>".
   - Re-usable helpers live at "@/lib/utils" and the cn() helper is imported from there.
   - HSL design tokens are declared as CSS variables ("--background: 220 20% 97%;")
     and consumed in tailwind.config via "hsl(var(--background))".
   - Dark mode is a REAL toggle, not a static class. Use ONE of:
       (a) next-themes ThemeProvider + useTheme(), or
       (b) document.documentElement.classList.toggle("dark") wired to a button.
   - Framer Motion is imported AND used as motion.<tag> with at least one
     AnimatePresence + layout/exit animation.
   - Ship a components.json shadcn config file at the project root.
3. Every emitted file is COMPLETE — no "..." placeholders, no truncated functions,
   no half-finished JSX. If you are running short on space, drop optional UI
   polish before dropping correctness.
4. Include robust loading, empty, and error states.
5. Include proper typing and production-safe error handling.
6. Avoid placeholder "Welcome" starter copy. Use the product intent from the prompt.
7. Output must be formattable by prettier and typecheckable in isolatedModules.

Generate the project now.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: prompt }
    ];
    
    // Get model or use default
    const model = modelId || 'claude-opus-4-7';
    logger.info('[Code Generation] Using model:', model);
    
    const usesMaxCompletionTokens = /^o[1-9]/.test(model) || /^gpt-4.1/.test(model);

    const streamOptions: any = {};

    // Multi-file project generation needs significantly more headroom than a
    // single-snippet response. 16k completion tokens is comfortable for the
    // largest target models (Claude 4.x, GPT-4.1) and avoids truncation of
    // the final file in a multi-file emission.
    const COMPLETION_BUDGET = 16000;
    if (usesMaxCompletionTokens) {
      streamOptions.max_completion_tokens = COMPLETION_BUDGET;
    } else {
      streamOptions.max_tokens = COMPLETION_BUDGET;
    }

    // The default streamLimiter timeout is 60s total — fine for short snippets
    // but far too aggressive for a 16k-token multi-file emission, which routinely
    // takes 90-300s on Claude 4.x. Allow up to 5 minutes for the full stream to
    // complete; the per-chunk size limit still protects against runaway output.
    streamOptions.timeoutMs = 300_000;
    
    // Only add temperature for models that support it (GPT-4, Claude, Gemini, etc.)
    // GPT-4.1 family and o-series models don't support custom temperature
    if (!usesMaxCompletionTokens) {
      streamOptions.temperature = 0.3; // Lower temperature for more consistent code
    }
    
    // Wrap the provider call in retry-with-backoff. Retries only fire on
    // PROVIDER_RATE_LIMIT / PROVIDER_TIMEOUT / PROVIDER_UNAVAILABLE *before*
    // the first chunk has been forwarded; once we've sent any content the
    // wrapper switches to pass-through.
    const stream = streamWithRetry(
      () => aiProviderManager.streamChat(model, messages, streamOptions),
      { classify: classifyGenerationError },
      undefined,
      (event) => {
        logger.warn('[Code Generation] Retrying provider call', { ...event, model });
        // Surface the retry to the client so the UI can show a "retrying..."
        // state instead of going silent during the backoff window.
        res.write(`data: ${JSON.stringify({
          type: 'retry',
          attempt: event.attempt,
          delayMs: event.delayMs,
          code: event.code,
        })}\n\n`);
      },
    );

    let generatedCode = '';
    let chunkCount = 0;
    const guard = new OutputGuard();

    for await (const content of stream) {
      const verdict = guard.feed(content);
      if (!verdict.ok) {
        logger.warn('[Code Generation] Output guard rejected stream', {
          code: verdict.code,
          detail: verdict.detail,
          bytesSoFar: guard.bytesSeen(),
          chunksSoFar: chunkCount,
          model,
        });
        res.write(`data: ${JSON.stringify({
          type: 'error',
          code: verdict.code,
          message: verdict.userMessage,
          retryable: false,
        })}\n\n`);
        res.end();
        return;
      }

      generatedCode += content;
      chunkCount++;

      // Send SSE event
      res.write(`data: ${JSON.stringify({
        type: 'chunk',
        content,
        totalLength: generatedCode.length,
        chunkNumber: chunkCount
      })}\n\n`);
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      totalLength: generatedCode.length,
      totalChunks: chunkCount,
      filePaths: guard.paths(),
    })}\n\n`);

    logger.info('[Code Generation] Stream completed', {
      totalLength: generatedCode.length,
      totalChunks: chunkCount,
      fileCount: guard.paths().length,
      model
    });

    res.end();
  } catch (error: unknown) {
    const classified = classifyGenerationError(error);
    logger.error('[Code Generation] Error', {
      ...redactErrorForLog(error),
      code: classified.code,
    });

    // If we never committed SSE headers (e.g. zod validation threw before
    // validateAndSetSSEHeaders ran), respond with a structured JSON error.
    if (!res.headersSent) {
      res.status(classified.status).json({
        error: classified.code,
        message: classified.userMessage,
        retryable: classified.retryable,
      });
      return;
    }

    res.write(`data: ${JSON.stringify({
      type: 'error',
      code: classified.code,
      message: classified.userMessage,
      retryable: classified.retryable,
    })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/code-generation/models
 * Get available AI models for code generation
 */
router.get('/models', tierRateLimiters.api, async (req, res) => {
  try {
    const models = aiProviderManager.getAvailableModels();
    
    // Filter to only models suitable for code generation (all support streaming)
    const codeGenModels = models
      .filter(m => m.supportsStreaming)
      .map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        description: m.description,
        maxTokens: m.maxTokens,
        costPer1kTokens: m.costPer1kTokens
      }));
    
    res.json({
      models: codeGenModels,
      defaultModel: 'claude-opus-4-7'
    });
  } catch (error: unknown) {
    logger.error('[Code Generation] Error getting models', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get available models' });
  }
});

/**
 * GET /api/code-generation/languages
 * Get supported programming languages
 */
router.get('/languages', tierRateLimiters.api, async (req, res) => {
  const languages = [
    { id: 'typescript', name: 'TypeScript', extension: '.ts' },
    { id: 'javascript', name: 'JavaScript', extension: '.js' },
    { id: 'python', name: 'Python', extension: '.py' },
    { id: 'java', name: 'Java', extension: '.java' },
    { id: 'csharp', name: 'C#', extension: '.cs' },
    { id: 'go', name: 'Go', extension: '.go' },
    { id: 'rust', name: 'Rust', extension: '.rs' },
    { id: 'cpp', name: 'C++', extension: '.cpp' },
    { id: 'ruby', name: 'Ruby', extension: '.rb' },
    { id: 'php', name: 'PHP', extension: '.php' },
    { id: 'swift', name: 'Swift', extension: '.swift' },
    { id: 'kotlin', name: 'Kotlin', extension: '.kt' },
    { id: 'sql', name: 'SQL', extension: '.sql' },
    { id: 'html', name: 'HTML', extension: '.html' },
    { id: 'css', name: 'CSS', extension: '.css' }
  ];
  
  res.json({ languages });
});

export default router;
