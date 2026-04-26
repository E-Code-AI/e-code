import { Router } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { agentOrchestrationRunner } from '../services/agent-orchestration-runner.service';

const runSchema = z.object({
  projectId: z.union([z.string(), z.number()]).transform(String),
  prompt: z.string().min(1),
  permissionMode: z.enum(['auto', 'approve', 'deny']).optional(),
});

const forkSchema = z.object({
  prompt: z.string().min(1).optional(),
});

const router = Router();

router.post('/orchestrate/run', ensureAuthenticated, async (req, res) => {
  try {
    const payload = runSchema.parse(req.body);
    const state = await agentOrchestrationRunner.run({
      ...payload,
      userId: (req.user as any)?.id,
    });
    res.json({ success: true, session: state });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Agent orchestration failed' });
  }
});

router.get('/orchestrate/:sessionId', ensureAuthenticated, async (req, res) => {
  const state = agentOrchestrationRunner.get(req.params.sessionId) || await agentOrchestrationRunner.resume(req.params.sessionId);
  if (!state) {
    res.status(404).json({ success: false, error: 'Agent session not found' });
    return;
  }
  res.json({ success: true, session: state });
});

router.post('/orchestrate/:sessionId/pause', ensureAuthenticated, async (req, res) => {
  const state = await agentOrchestrationRunner.pause(req.params.sessionId);
  res.status(state ? 200 : 404).json(state ? { success: true, session: state } : { success: false, error: 'Agent session not found' });
});

router.post('/orchestrate/:sessionId/resume', ensureAuthenticated, async (req, res) => {
  const state = await agentOrchestrationRunner.resume(req.params.sessionId);
  res.status(state ? 200 : 404).json(state ? { success: true, session: state } : { success: false, error: 'Agent session not found' });
});

router.post('/orchestrate/:sessionId/stop', ensureAuthenticated, async (req, res) => {
  const state = await agentOrchestrationRunner.stop(req.params.sessionId);
  res.status(state ? 200 : 404).json(state ? { success: true, session: state } : { success: false, error: 'Agent session not found' });
});

router.post('/orchestrate/:sessionId/fork', ensureAuthenticated, async (req, res) => {
  const payload = forkSchema.parse(req.body || {});
  const state = await agentOrchestrationRunner.fork(req.params.sessionId, payload.prompt);
  res.status(state ? 200 : 404).json(state ? { success: true, session: state } : { success: false, error: 'Agent session not found' });
});

router.get('/orchestrate/:sessionId/stream', ensureAuthenticated, async (req, res) => {
  const state = agentOrchestrationRunner.get(req.params.sessionId) || await agentOrchestrationRunner.resume(req.params.sessionId);
  if (!state) {
    res.status(404).json({ success: false, error: 'Agent session not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: state\n`);
  res.write(`data: ${JSON.stringify(state)}\n\n`);

  const listener = (nextState: any) => {
    res.write(`event: state\n`);
    res.write(`data: ${JSON.stringify(nextState)}\n\n`);
    if (['completed', 'failed', 'stopped'].includes(nextState.status)) {
      res.end();
    }
  };

  agentOrchestrationRunner.on(req.params.sessionId, listener);
  req.on('close', () => {
    agentOrchestrationRunner.off(req.params.sessionId, listener);
  });
});

export default router;
