/**
 * Shared Agent API Types & Zod Schemas
 * Single source of truth for request/response contracts across:
 * - Web IDE (client/src/components/ai/)
 * - Mobile IDE (client/src/components/mobile/)
 * - VS Code extension (vscode-extension/src/)
 * - Backend routes (server/routes/agent*.ts)
 *
 * Import from here in both client and server so payload mismatches
 * become compile errors before they become runtime 500s.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export const ProjectIdSchema = z.union([z.string(), z.number()]).transform(String);

export const AgentModeSchema = z.enum(['build', 'edit', 'chat', 'debug', 'review']);
export type AgentMode = z.infer<typeof AgentModeSchema>;

export const PermissionModeSchema = z.enum(['auto', 'approve', 'deny']);
export type PermissionMode = z.infer<typeof PermissionModeSchema>;

export const RiskThresholdSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskThreshold = z.infer<typeof RiskThresholdSchema>;

// ---------------------------------------------------------------------------
// Agent preferences
// ---------------------------------------------------------------------------

export const AgentPreferencesSchema = z.object({
  extendedThinking: z.boolean().optional(),
  highPowerMode: z.boolean().optional(),
  autoWebSearch: z.boolean().optional(),
  preferredModel: z.string().optional(),
  customInstructions: z.string().nullable().optional(),
  improvePromptEnabled: z.boolean().optional(),
  progressTabEnabled: z.boolean().optional(),
  pauseResumeEnabled: z.boolean().optional(),
  autoCheckpoints: z.boolean().optional(),
  appTesting: z.boolean().optional(),
  maxAutonomy: z.boolean().optional(),
});
export type AgentPreferences = z.infer<typeof AgentPreferencesSchema>;

export const UpdatePreferencesRequestSchema = AgentPreferencesSchema;
export type UpdatePreferencesRequest = z.infer<typeof UpdatePreferencesRequestSchema>;

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(100_000),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  projectId: ProjectIdSchema.optional(),
  message: z.string().min(1).max(50_000),
  conversationId: z.union([z.string(), z.number()]).optional(),
  provider: z.string().max(80).optional(),
  modelId: z.string().max(120).optional(),
  fastMode: z.boolean().optional(),
  conversationHistory: z.array(ChatMessageSchema).max(100).optional(),
  // context accepts any object array — callers send code-context objects ({type,content,file})
  // as well as chat-history objects ({role,content}); kept loose to avoid breaking existing clients.
  context: z.array(z.record(z.unknown())).max(100).optional(),
  systemPrompt: z.string().max(10_000).optional(),
  maxTokens: z.number().int().min(1).max(32_768).optional(),
  temperature: z.number().min(0).max(2).optional(),
  webSearch: z.boolean().optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['text', 'image', 'binary']),
    mimeType: z.string(),
    size: z.number(),
    content: z.string().optional(),
    base64: z.string().optional(),
  })).max(20).optional(),
  images: z.array(z.object({
    type: z.literal('image'),
    mimeType: z.string(),
    base64: z.string(),
    name: z.string().optional(),
  })).max(10).optional(),
  capabilities: z.object({
    extendedThinking: z.boolean().optional(),
    webSearch: z.boolean().optional(),
    highPower: z.boolean().optional(),
    appTesting: z.boolean().optional(),
    maxAutonomy: z.boolean().optional(),
  }).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  response: z.string(),
  metadata: z.record(z.unknown()).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  totalTokens: z.number().optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// SSE event types streamed by /api/agent/chat/stream and orchestration stream
export const SSEEventTypeSchema = z.enum([
  'content',
  'thinking',
  'tool_start',
  'tool_complete',
  'web_search',
  'image_generated',
  'checkpoint_created',
  'error',
  'done',
  'heartbeat',
  'metadata',
]);
export type SSEEventType = z.infer<typeof SSEEventTypeSchema>;

// ---------------------------------------------------------------------------
// Orchestration (orchestrate/run, orchestrate/:id/stream)
// ---------------------------------------------------------------------------

export const OrchestrateRunRequestSchema = z.object({
  projectId: ProjectIdSchema,
  prompt: z.string().min(1).max(50_000),
  permissionMode: PermissionModeSchema.optional(),
  sessionId: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});
export type OrchestrateRunRequest = z.infer<typeof OrchestrateRunRequestSchema>;

export const AgentSessionStatusSchema = z.enum([
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'stopped',
]);
export type AgentSessionStatus = z.infer<typeof AgentSessionStatusSchema>;

export const OrchestrateSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  userId: z.number(),
  status: AgentSessionStatusSchema,
  prompt: z.string(),
  permissionMode: PermissionModeSchema,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().nullable().optional(),
  tokensUsed: z.number().optional(),
  steps: z.array(z.unknown()).optional(),
});
export type OrchestrateSession = z.infer<typeof OrchestrateSessionSchema>;

export const OrchestrateRunResponseSchema = z.object({
  success: z.boolean(),
  session: OrchestrateSessionSchema,
});
export type OrchestrateRunResponse = z.infer<typeof OrchestrateRunResponseSchema>;

// ---------------------------------------------------------------------------
// Checkpoints
// ---------------------------------------------------------------------------

export const CheckpointTypeSchema = z.enum(['auto', 'manual', 'milestone']);
export type CheckpointType = z.infer<typeof CheckpointTypeSchema>;

export const CheckpointStatusSchema = z.enum(['pending', 'creating', 'complete', 'failed']);
export type CheckpointStatus = z.infer<typeof CheckpointStatusSchema>;

export const CheckpointSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  type: CheckpointTypeSchema,
  status: CheckpointStatusSchema,
  aiSummary: z.string().nullable().optional(),
  filesSnapshot: z.record(z.string()).nullable().optional(),
  includesDatabase: z.boolean().optional(),
  createdAt: z.string().or(z.date()),
});
export type Checkpoint = z.infer<typeof CheckpointSchema>;

export const CheckpointListResponseSchema = z.object({
  success: z.boolean(),
  checkpoints: z.array(CheckpointSchema),
  count: z.number(),
});
export type CheckpointListResponse = z.infer<typeof CheckpointListResponseSchema>;

export const RestoreCheckpointRequestSchema = z.object({
  createBackup: z.boolean().optional().default(true),
  idempotencyKey: z.string().uuid().optional(),
});
export type RestoreCheckpointRequest = z.infer<typeof RestoreCheckpointRequestSchema>;

export const RestoreCheckpointResponseSchema = z.object({
  success: z.boolean(),
  backupCheckpointId: z.number().optional(),
  restoredFiles: z.number().optional(),
  message: z.string().optional(),
});
export type RestoreCheckpointResponse = z.infer<typeof RestoreCheckpointResponseSchema>;

// ---------------------------------------------------------------------------
// Message queue
// ---------------------------------------------------------------------------

export const QueuedMessageStatusSchema = z.enum(['pending', 'processing', 'completed', 'cancelled']);
export type QueuedMessageStatus = z.infer<typeof QueuedMessageStatusSchema>;

export const QueuedMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  priority: z.number().int(),
  status: QueuedMessageStatusSchema,
  createdAt: z.string(),
});
export type QueuedMessage = z.infer<typeof QueuedMessageSchema>;

export const EnqueueMessageRequestSchema = z.object({
  content: z.string().min(1).max(50_000),
  priority: z.number().int().min(0).max(100).optional().default(50),
  idempotencyKey: z.string().uuid().optional(),
});
export type EnqueueMessageRequest = z.infer<typeof EnqueueMessageRequestSchema>;

export const UpdateMessagePriorityRequestSchema = z.object({
  priority: z.number().int().min(0).max(100),
});
export type UpdateMessagePriorityRequest = z.infer<typeof UpdateMessagePriorityRequestSchema>;

// ---------------------------------------------------------------------------
// Web search
// ---------------------------------------------------------------------------

export const WebSearchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  projectId: ProjectIdSchema.optional(),
  conversationId: z.number().int().optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
});
export type WebSearchRequest = z.infer<typeof WebSearchRequestSchema>;

export const WebSearchResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  source: z.string().optional(),
  publishedDate: z.string().optional(),
});
export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;

export const WebSearchResponseSchema = z.object({
  success: z.boolean(),
  query: z.string(),
  results: z.array(WebSearchResultSchema),
  totalResults: z.number(),
  searchTime: z.number(),
  cached: z.boolean().optional(),
});
export type WebSearchResponse = z.infer<typeof WebSearchResponseSchema>;

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export const ImageGenerationRequestSchema = z.object({
  prompt: z.string().min(1).max(4_000),
  projectId: ProjectIdSchema.optional(),
  conversationId: z.number().int().optional(),
  width: z.number().int().min(256).max(2048).optional(),
  height: z.number().int().min(256).max(2048).optional(),
  style: z.enum(['natural', 'vivid']).optional(),
});
export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequestSchema>;

export const ImageGenerationResponseSchema = z.object({
  success: z.boolean(),
  imageUrl: z.string().url().optional(),
  base64: z.string().optional(),
  revisedPrompt: z.string().optional(),
  provider: z.string().optional(),
});
export type ImageGenerationResponse = z.infer<typeof ImageGenerationResponseSchema>;

// ---------------------------------------------------------------------------
// App testing / video replays
// ---------------------------------------------------------------------------

export const TestSessionStatusSchema = z.enum(['pending', 'running', 'passed', 'failed', 'cancelled']);
export type TestSessionStatus = z.infer<typeof TestSessionStatusSchema>;

export const VideoReplayStatusSchema = z.enum(['recording', 'processing', 'ready', 'failed']);
export type VideoReplayStatus = z.infer<typeof VideoReplayStatusSchema>;

export const VideoReplaySchema = z.object({
  id: z.string(),
  testSessionId: z.string(),
  projectId: z.number(),
  filename: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  duration: z.number(),
  status: VideoReplayStatusSchema,
  createdAt: z.string(),
});
export type VideoReplay = z.infer<typeof VideoReplaySchema>;

export const VideoReplayListResponseSchema = z.object({
  replays: z.array(VideoReplaySchema),
  count: z.number(),
});
export type VideoReplayListResponse = z.infer<typeof VideoReplayListResponseSchema>;

// ---------------------------------------------------------------------------
// Autonomous / max-autonomy sessions
// ---------------------------------------------------------------------------

export const MaxAutonomySessionStatusSchema = z.enum([
  'pending', 'running', 'paused', 'completed', 'failed', 'stopped',
]);
export type MaxAutonomySessionStatus = z.infer<typeof MaxAutonomySessionStatusSchema>;

export const StartAutonomySessionRequestSchema = z.object({
  projectId: ProjectIdSchema,
  prompt: z.string().min(1).max(50_000),
  riskThreshold: RiskThresholdSchema.optional().default('medium'),
  maxDurationMinutes: z.number().int().min(1).max(200).optional().default(200),
  idempotencyKey: z.string().uuid().optional(),
});
export type StartAutonomySessionRequest = z.infer<typeof StartAutonomySessionRequestSchema>;

// ---------------------------------------------------------------------------
// Plan generation
// ---------------------------------------------------------------------------

export const PlanGenerationRequestSchema = z.object({
  projectId: ProjectIdSchema,
  goal: z.string().min(1).max(10_000),
  context: z.object({
    projectType: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    existingFiles: z.array(z.string()).optional(),
  }).optional(),
  idempotencyKey: z.string().uuid().optional(),
});
export type PlanGenerationRequest = z.infer<typeof PlanGenerationRequestSchema>;

export const PlanTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  estimatedMinutes: z.number().optional(),
  dependencies: z.array(z.string()).optional(),
  risk: z.enum(['low', 'medium', 'high']).optional(),
});
export type PlanTask = z.infer<typeof PlanTaskSchema>;

export const PlanSchema = z.object({
  id: z.string(),
  goal: z.string(),
  summary: z.string(),
  totalTasks: z.number(),
  estimatedTime: z.string(),
  technologies: z.array(z.string()),
  tasks: z.array(PlanTaskSchema),
  riskAssessment: z.object({
    level: z.enum(['low', 'medium', 'high']),
    factors: z.array(z.string()),
  }),
  createdAt: z.coerce.date(),
});
export type Plan = z.infer<typeof PlanSchema>;

// ---------------------------------------------------------------------------
// Replit.md
// ---------------------------------------------------------------------------

export const UpdateReplitMdRequestSchema = z.object({
  projectId: ProjectIdSchema,
  content: z.string().max(100_000),
  reason: z.string().max(500).optional(),
});
export type UpdateReplitMdRequest = z.infer<typeof UpdateReplitMdRequestSchema>;

// ---------------------------------------------------------------------------
// Structured error envelope (all agent routes return this on error)
// ---------------------------------------------------------------------------

export const AgentErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});
export type AgentErrorResponse = z.infer<typeof AgentErrorResponseSchema>;

// ---------------------------------------------------------------------------
// Cross-surface session state (visible across Web / Mobile / VS Code)
// ---------------------------------------------------------------------------

export const CrossSurfaceSessionSchema = z.object({
  sessionId: z.string(),
  projectId: z.string(),
  conversationId: z.number().nullable(),
  status: AgentSessionStatusSchema,
  agentMode: AgentModeSchema,
  lastActiveAt: z.string().datetime(),
  checkpointIds: z.array(z.number()).optional(),
  queuedMessageCount: z.number().optional(),
});
export type CrossSurfaceSession = z.infer<typeof CrossSurfaceSessionSchema>;
