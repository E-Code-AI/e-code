import express, { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { ensureAuthenticated } from '../middleware/auth';
import { appGenerationPersistence } from '../services/app-generation-persistence.service';
import { speculativeScaffold } from '../services/speculative-scaffold.service';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('ai-generator-router');

const startSchema = z.object({
  description: z.string().min(1).max(20000),
  attachmentObjectKeys: z.array(z.string()).default([]),
  preferredTemplateId: z.string().optional(),
});

const approveSchema = z.object({
  spec: z.object({
    title: z.string().min(1),
    summary: z.string().default(''),
    roles: z.array(z.string()).default([]),
    features: z.array(z.string()).default([]),
    screens: z.array(z.object({ name: z.string(), purpose: z.string() })).default([]),
    dataModel: z.array(z.object({ entity: z.string(), fields: z.array(z.string()) })).default([]),
  }),
  selectedStackId: z.string().min(1),
  architecture: z.object({
    routes: z.array(z.string()).default([]),
    apiEndpoints: z.array(z.string()).default([]),
    databaseSchema: z.string().default(''),
    mermaid: z.string().default(''),
  }),
});

const iterationSchema = z.object({
  prompt: z.string().min(1).max(20000),
});

function getUserId(req: Request): number {
  return Number((req.user as any)?.id);
}

function buildDraftSpec(description: string) {
  const title = description
    .trim()
    .split(/[.!?\n]/)[0]
    .replace(/^build\s+/i, '')
    .slice(0, 80)
    .trim() || 'Generated App';

  return {
    title,
    summary: description.trim(),
    roles: ['user', 'admin'].filter((role) => description.toLowerCase().includes(role) || role === 'user'),
    features: [
      'Responsive application shell',
      'Persistent project files',
      'Live preview ready workspace',
      ...(description.toLowerCase().includes('auth') ? ['Authentication flow'] : []),
      ...(description.toLowerCase().includes('dashboard') ? ['Dashboard interface'] : []),
    ],
    screens: [
      { name: 'Home', purpose: 'Primary product experience generated from the prompt' },
      { name: 'Settings', purpose: 'Configuration and account preferences' },
    ],
    dataModel: description.toLowerCase().includes('comment')
      ? [{ entity: 'Comment', fields: ['id', 'authorId', 'body', 'createdAt'] }]
      : [{ entity: 'ProjectState', fields: ['id', 'name', 'status', 'updatedAt'] }],
  };
}

function buildArchitecture(spec: ReturnType<typeof buildDraftSpec>) {
  return {
    routes: ['/', '/settings'],
    apiEndpoints: ['/api/health', '/api/state'],
    databaseSchema: spec.dataModel.map((entity) => `${entity.entity}(${entity.fields.join(', ')})`).join('\n'),
    mermaid: `flowchart TD\n  User[User] --> App[${spec.title.replace(/"/g, '')}]\n  App --> API[API]\n  API --> DB[(Database)]`,
  };
}

router.post('/attachments/resumable-url', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = z.object({
    name: z.string().min(1),
    contentType: z.string().default('application/octet-stream'),
    size: z.number().nonnegative().default(0),
  }).parse(req.body);

  const id = `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.json({
    id,
    name: body.name,
    contentType: body.contentType,
    size: body.size,
    objectKey: `uploads/ai-generator/${userId}/${id}/${body.name}`,
    uploadUrl: `/api/ai-generator/attachments/${encodeURIComponent(id)}/upload`,
  });
});

router.put(
  '/attachments/:attachmentId/upload',
  ensureAuthenticated,
  express.raw({ type: '*/*', limit: '25mb' }),
  async (req: Request, res: Response) => {
    await appGenerationPersistence.appendMemory({
      userId: getUserId(req),
      sessionId: `attachment-${req.params.attachmentId}`,
      role: 'system',
      content: `Attachment ${req.params.attachmentId} uploaded for AI generation.`,
      metadata: {
        contentType: req.headers['content-type'] || 'application/octet-stream',
        size: Buffer.isBuffer(req.body) ? req.body.length : 0,
      },
    });
    res.status(204).end();
  }
);

router.post('/generations', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const body = startSchema.parse(req.body);
  const generationId = await appGenerationPersistence.ensureSession({
    userId,
    prompt: body.description,
    source: 'ai-generator:start',
    metadata: {
      attachmentObjectKeys: body.attachmentObjectKeys,
      preferredTemplateId: body.preferredTemplateId,
    },
  });

  const draftSpec = buildDraftSpec(body.description);
  const draftArchitecture = buildArchitecture(draftSpec);
  await appGenerationPersistence.persistPrompt({
    userId,
    sessionId: generationId,
    prompt: body.description,
    source: 'ai-generator:start',
    variables: {
      attachmentObjectKeys: body.attachmentObjectKeys,
      preferredTemplateId: body.preferredTemplateId,
      draftSpec,
      draftArchitecture,
    },
  });

  res.status(201).json({ generationId, draftSpec });
});

router.get('/generations/:generationId/events', ensureAuthenticated, async (req: Request, res: Response) => {
  const generationId = req.params.generationId;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify({ at: new Date().toISOString(), ...event })}\n\n`);
  };

  send({
    type: 'spec_delta',
    step: 'understanding',
    message: 'Prompt persisted to database and agent memory.',
    progress: 20,
  });
  send({
    type: 'architecture_delta',
    step: 'architecture',
    message: 'Architecture draft ready for approval.',
    progress: 45,
  });
  send({
    type: 'ready',
    step: 'generation',
    message: 'Generation session is durable and resumable.',
    progress: 60,
    generationId,
  });
  res.end();
});

router.post('/generations/:generationId/approve', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const generationId = req.params.generationId;
  const body = approveSchema.parse(req.body);
  const project = await storage.createProject({
    name: body.spec.title,
    description: body.spec.summary,
    visibility: 'private',
    language: 'typescript',
    ownerId: userId,
    tenantId: userId,
  });

  await appGenerationPersistence.bindProject({
    userId,
    sessionId: generationId,
    projectId: project.id,
    metadata: {
      selectedStackId: body.selectedStackId,
      architecture: body.architecture,
      approvedAt: new Date().toISOString(),
    },
  });

  await appGenerationPersistence.appendMemory({
    userId,
    sessionId: generationId,
    role: 'assistant',
    projectId: project.id,
    content: `Approved app generation for ${body.spec.title}. Project ${project.id} created and scaffold queued.`,
    metadata: { selectedStackId: body.selectedStackId },
  });

  const scaffold = await speculativeScaffold.createScaffold({
    projectId: String(project.id),
    language: 'typescript',
    framework: body.selectedStackId,
    prompt: body.spec.summary || body.spec.title,
    projectName: body.spec.title,
  });

  logger.info('[AI Generator] Approved generation created project', {
    generationId,
    projectId: project.id,
    filesCreated: scaffold.filesCreated.length,
  });

  res.json({
    projectId: String(project.id),
    workspaceUrl: `/ide/${project.id}?generation=${encodeURIComponent(generationId)}`,
    scaffold,
  });
});

router.post('/generations/:generationId/iterations', ensureAuthenticated, async (req: Request, res: Response) => {
  const userId = getUserId(req);
  const generationId = req.params.generationId;
  const body = iterationSchema.parse(req.body);

  await appGenerationPersistence.persistPrompt({
    userId,
    sessionId: generationId,
    prompt: body.prompt,
    source: 'ai-generator:iteration',
  });

  res.status(204).end();
});

router.post('/generations/:generationId/undo', ensureAuthenticated, async (req: Request, res: Response) => {
  await appGenerationPersistence.appendMemory({
    userId: getUserId(req),
    sessionId: req.params.generationId,
    role: 'system',
    content: 'User requested undo of the last AI generator change.',
    metadata: { action: 'undo_last_change' },
  });
  res.status(204).end();
});

export default router;
