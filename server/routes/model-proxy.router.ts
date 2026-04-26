import { Router } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { unifiedModelProxy } from '../ai/unified-model-proxy';

const contentPartSchema = z.object({
  type: z.enum(['text', 'image_url']),
  text: z.string().optional(),
  image_url: z.object({ url: z.string().url() }).optional(),
});

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.array(contentPartSchema)]),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
});

const toolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parameters: z.record(z.any()),
});

const modelRequestSchema = z.object({
  model: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'moonshot']).optional(),
  messages: z.array(messageSchema).min(1),
  tools: z.array(toolSchema).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(200000).optional(),
  providerApiKeys: z.record(z.string()).optional(),
  fallbackModels: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const router = Router();

router.get('/models', ensureAuthenticated, (_req, res) => {
  res.json({
    success: true,
    models: unifiedModelProxy.getModels(),
  });
});

router.post('/chat', ensureAuthenticated, async (req, res) => {
  try {
    const payload = modelRequestSchema.parse(req.body);
    const response = await unifiedModelProxy.complete({
      ...payload,
      userId: (req.user as any)?.id,
    });
    res.json({ success: true, response });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Model proxy request failed',
    });
  }
});

router.post('/chat/stream', ensureAuthenticated, async (req, res) => {
  try {
    const payload = modelRequestSchema.parse(req.body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for await (const chunk of unifiedModelProxy.stream({
      ...payload,
      userId: (req.user as any)?.id,
    })) {
      res.write(`event: ${chunk.type}\n`);
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    res.end();
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(400).json({ success: false, error: error.message || 'Model proxy stream failed' });
      return;
    }
    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

export default router;
