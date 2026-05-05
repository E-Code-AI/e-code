/**
 * Inline AI edit endpoint — Cmd+K in the editor.
 * POST /api/ai/inline-edit
 * Body: { selection: string, prompt: string, language?: string, fileName?: string }
 *
 * Streams the replacement text as plain Server-Sent Events. The client
 * accumulates the body and replaces the editor selection on completion.
 *
 * Kept deliberately minimal: it reuses ai-provider-manager so model routing,
 * fallback chain, and usage accounting all behave like the rest of the AI
 * surface. We don't return a diff because CodeMirror's transaction API
 * already gives us a precise selection range.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { aiProviderManager } from '../ai/ai-provider-manager';
import { createLogger } from '../utils/logger';
import { validateAndSetSSEHeaders } from '../utils/sse-headers';

const logger = createLogger('ai-inline-edit');
const router = Router();

const InlineEditSchema = z.object({
  selection: z.string().max(50_000),
  prompt: z.string().min(1).max(2_000),
  language: z.string().optional(),
  fileName: z.string().optional(),
});

router.post('/inline-edit', ensureAuthenticated, async (req: Request, res: Response) => {
  const parsed = InlineEditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid request body', errors: parsed.error.errors });
  }
  const { selection, prompt, language, fileName } = parsed.data;
  const userId = (req.user as { id: number }).id;

  const systemPrompt = [
    'You are an inline code-editing assistant inside an IDE.',
    'You receive a code selection and a user instruction.',
    'Reply with the REPLACEMENT code only — no markdown fences, no commentary.',
    'Preserve the surrounding indentation style and trailing newline of the original selection.',
    language ? `Language: ${language}.` : '',
    fileName ? `File: ${fileName}.` : '',
  ].filter(Boolean).join('\n');

  const userPrompt = [
    `Instruction: ${prompt}`,
    '',
    'Selection:',
    '```',
    selection,
    '```',
    '',
    'Return only the replacement code.',
  ].join('\n');

  if (!validateAndSetSSEHeaders(res, req)) return;

  try {
    const provider = aiProviderManager.getDefaultProvider();
    if (!provider) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'No AI provider configured' })}\n\n`);
      return res.end();
    }
    const completion = await provider.generateCompletion(userPrompt, systemPrompt, 4096, 0.2, userId);
    // Strip code fences in case the model ignored the system prompt.
    const cleaned = completion
      .replace(/^```[\w-]*\n?/m, '')
      .replace(/```\s*$/m, '')
      .replace(/^\n+/, '');
    res.write(`event: replacement\ndata: ${JSON.stringify({ text: cleaned })}\n\n`);
    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (err: any) {
    logger.error('inline-edit failed', { error: err?.message || String(err), userId });
    res.write(`event: error\ndata: ${JSON.stringify({ message: err?.message || 'AI request failed' })}\n\n`);
    res.end();
  }
});

export default router;
