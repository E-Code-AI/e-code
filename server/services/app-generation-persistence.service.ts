import { and, eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db';
import {
  agentSessions,
  conversationMemory,
  promptUsageHistory,
} from '@shared/schema';
import { createLogger } from '../utils/logger';

const logger = createLogger('app-generation-persistence');

type PromptSource =
  | 'ai-generator:start'
  | 'ai-generator:iteration'
  | 'ai-generator:approve'
  | 'project:create'
  | 'project:from-template';

interface PersistPromptInput {
  userId: number;
  prompt: string;
  source: PromptSource;
  projectId?: number | null;
  sessionId?: string;
  model?: string;
  variables?: Record<string, unknown>;
  response?: string;
}

interface EnsureSessionInput {
  userId: number;
  sessionId?: string;
  projectId?: number | null;
  prompt?: string;
  source: PromptSource;
  model?: string;
  metadata?: Record<string, unknown>;
}

class AppGenerationPersistenceService {
  async ensureSession(input: EnsureSessionInput): Promise<string> {
    const sessionId = input.sessionId || `appgen-${crypto.randomUUID()}`;
    const metadata = {
      source: input.source,
      initialPrompt: input.prompt,
      ...(input.metadata || {}),
      updatedAt: new Date().toISOString(),
    };

    try {
      const existing = await db
        .select({ id: agentSessions.id })
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId))
        .limit(1);

      if (existing[0]) {
        await db
          .update(agentSessions)
          .set({
            projectId: input.projectId ?? undefined,
            metadata: sql`COALESCE(${agentSessions.metadata}, '{}')::jsonb || ${JSON.stringify(metadata)}::jsonb`,
          })
          .where(eq(agentSessions.id, sessionId));
        return sessionId;
      }

      await db.insert(agentSessions).values({
        id: sessionId,
        userId: input.userId,
        projectId: input.projectId ?? null,
        sessionToken: sessionId,
        model: input.model || 'app-generator',
        context: {
          files: [],
          workingDirectory: input.projectId ? `/workspace/projects/${input.projectId}` : '/workspace/pending',
          environment: {},
          capabilities: ['app_generation', 'prompt_persistence', 'agent_memory', 'resume'],
          projectId: input.projectId ?? undefined,
        },
        autonomousMode: true,
        workflowStatus: 'planning',
        metadata,
      });
    } catch (error) {
      logger.warn('[AppGenerationPersistence] Failed to persist agent session', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return sessionId;
  }

  async persistPrompt(input: PersistPromptInput): Promise<void> {
    const prompt = input.prompt?.trim();
    if (!prompt) return;

    const sessionId = await this.ensureSession({
      userId: input.userId,
      sessionId: input.sessionId,
      projectId: input.projectId,
      prompt,
      source: input.source,
      model: input.model,
      metadata: input.variables,
    });

    await Promise.allSettled([
      db.insert(promptUsageHistory).values({
        userId: input.userId,
        projectId: input.projectId ?? null,
        prompt,
        variables: {
          source: input.source,
          sessionId,
          ...(input.variables || {}),
        },
        response: input.response,
        model: input.model || 'app-generator',
      }),
      db.insert(conversationMemory).values({
        id: crypto.randomUUID(),
        userId: String(input.userId),
        sessionId,
        role: 'user',
        content: prompt,
        metadata: {
          source: input.source,
          projectId: input.projectId ?? null,
          ...(input.variables || {}),
        },
      }),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          logger.warn('[AppGenerationPersistence] Failed to persist prompt memory', {
            sessionId,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
        }
      }
    });
  }

  async appendMemory(input: {
    userId: number;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    projectId?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (!input.content.trim()) return;

    try {
      await db.insert(conversationMemory).values({
        id: crypto.randomUUID(),
        userId: String(input.userId),
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        metadata: {
          projectId: input.projectId ?? null,
          ...(input.metadata || {}),
        },
      });
    } catch (error) {
      logger.warn('[AppGenerationPersistence] Failed to append memory', {
        sessionId: input.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async bindProject(input: {
    userId: number;
    sessionId: string;
    projectId: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await db
        .update(agentSessions)
        .set({
          projectId: input.projectId,
          context: sql`COALESCE(${agentSessions.context}, '{}')::jsonb || ${JSON.stringify({
            projectId: input.projectId,
            workingDirectory: `/workspace/projects/${input.projectId}`,
          })}::jsonb`,
          metadata: sql`COALESCE(${agentSessions.metadata}, '{}')::jsonb || ${JSON.stringify({
            ...(input.metadata || {}),
            projectId: input.projectId,
            updatedAt: new Date().toISOString(),
          })}::jsonb`,
        })
        .where(and(eq(agentSessions.id, input.sessionId), eq(agentSessions.userId, input.userId)));
    } catch (error) {
      logger.warn('[AppGenerationPersistence] Failed to bind project to session', {
        sessionId: input.sessionId,
        projectId: input.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const appGenerationPersistence = new AppGenerationPersistenceService();
