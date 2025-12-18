import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import { aiUsageTracker } from '../middleware/ai-usage-tracker';
import { normalizeModelName } from '../utils/model-normalizer';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import winston from 'winston';
import { allTools, toOpenAITools, toAnthropicTools } from '../agent/tool-definitions';
import { ToolExecutor } from '../agent/tool-executor';
import { ProjectContextProvider } from '../agent/project-context';
import { truncateContext } from '../agent/context-manager';
import { memoryMCP } from '../mcp/servers/memory-mcp';
import { memoryBankService } from '../services/memory-bank.service';
import { workspaceSnapshotService } from '../services/workspace-snapshot.service';
import { db } from '../db';
import { agentSessions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import * as path from 'path';

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * OpenAI Model Capabilities Map
 * Centralized configuration for model-specific parameter requirements
 * - requiresMaxCompletionTokens: Use max_completion_tokens instead of max_tokens
 * - supportsTemperature: Whether the model supports the temperature parameter
 */
interface OpenAIModelCapabilities {
  requiresMaxCompletionTokens: boolean;
  supportsTemperature: boolean;
}

const OPENAI_MODEL_CAPABILITIES: Record<string, OpenAIModelCapabilities> = {
  // GPT-5.x family - requires max_completion_tokens, no temperature
  'gpt-5.1': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'gpt-5.1-thinking': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'gpt-5': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'gpt-5-mini': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'gpt-5-nano': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  // O-series - requires max_completion_tokens, no temperature
  'o1': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'o1-mini': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'o1-preview': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'o3': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'o3-mini': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  'o4-mini': { requiresMaxCompletionTokens: true, supportsTemperature: false },
  // GPT-4o family - legacy parameters supported
  'gpt-4o': { requiresMaxCompletionTokens: false, supportsTemperature: true },
  'gpt-4o-mini': { requiresMaxCompletionTokens: false, supportsTemperature: true },
  'gpt-4-turbo': { requiresMaxCompletionTokens: false, supportsTemperature: true },
  'gpt-4': { requiresMaxCompletionTokens: false, supportsTemperature: true },
  // GPT-3.5 family - legacy parameters supported
  'gpt-3.5-turbo': { requiresMaxCompletionTokens: false, supportsTemperature: true },
};

/**
 * Get model capabilities with fallback to safe defaults
 * Unknown models default to legacy parameter support for backwards compatibility
 */
function getOpenAIModelCapabilities(model: string): OpenAIModelCapabilities {
  // Check exact match first
  if (OPENAI_MODEL_CAPABILITIES[model]) {
    return OPENAI_MODEL_CAPABILITIES[model];
  }
  
  // Check family patterns for unknown variants
  if (model.startsWith('gpt-5')) {
    return { requiresMaxCompletionTokens: true, supportsTemperature: false };
  }
  if (/^o[1-9]/.test(model)) {
    return { requiresMaxCompletionTokens: true, supportsTemperature: false };
  }
  if (model.startsWith('gpt-4')) {
    return { requiresMaxCompletionTokens: false, supportsTemperature: true };
  }
  
  // Default: legacy parameters (safe fallback for older models)
  return { requiresMaxCompletionTokens: false, supportsTemperature: true };
}

const router = Router();

// AI Usage Tracking (Pay-As-You-Go) - Track ALL streaming endpoints for billing
// No blocking - users pay for what they use via Stripe metered billing
// CRITICAL: Streaming is high-cost and MUST be accurately tracked
router.use(aiUsageTracker);

// Helper to set SSE headers
const setupSSE = (res: any) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Send initial connection event
  res.write('event: connected\n');
  res.write('data: {"status": "connected"}\n\n');
};

// Helper to send SSE message
const sendSSE = (res: any, event: string, data: any) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Main streaming chat endpoint for AI Agent panel
 * Supports OpenAI, Anthropic, Google AI, and more
 */
router.post('/api/agent/chat/stream', ensureAuthenticated, async (req, res) => {
  setupSSE(res);
  
  const { 
    message: rawMessage, 
    messages: rawMessages,  // Support both message (string) and messages (array)
    projectId, 
    conversationId,
    provider = 'openai',
    model: rawModel,
    modelId, // Frontend sends modelId, map to model
    context = [],
    temperature = 0.7,
    maxTokens = 4096,
    tools = [],
    systemPrompt,
    capabilities = {}
  } = req.body;
  
  // Handle both message (string) and messages (array) input formats
  // If messages array is provided, extract the last user message
  let message: string | undefined = rawMessage;
  if (!message && Array.isArray(rawMessages) && rawMessages.length > 0) {
    const lastUserMsg = rawMessages.find((m: any) => m.role === 'user' && m.content);
    message = lastUserMsg?.content || '';
  }
  
  // Ensure message is a string (fallback to empty string if still undefined)
  if (!message || typeof message !== 'string') {
    message = '';
  }
  
  // Map modelId (from frontend) to model, with provider-specific defaults
  // These MUST match the defaults in each stream function for consistency
  // ✅ ALIGNED Dec 5, 2025: Defaults MUST match AI_MODELS catalog IDs
  const getDefaultModel = (prov: string): string => {
    switch (prov) {
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-sonnet-4-5-20250929';
      case 'gemini': return 'gemini-2.0-flash';
      case 'xai': return 'grok-4-fast';  // ✅ FIXED: Use catalog ID (was grok-3-fast-latest)
      case 'moonshot': return 'moonshot-v1-32k';
      default: return 'gpt-4o-mini';
    }
  };
  
  const model = rawModel || modelId || getDefaultModel(provider);
  
  const userId = (req as any).user?.id;
  const requestStartTime = Date.now();
  let tokensInput = 0;
  let tokensOutput = 0;
  let agentMode: 'plan' | 'build' | 'edit' = 'build';
  
  // Entry logging for debugging
  logger.info(`[AI Stream] Starting chat stream - provider: ${provider}, model: ${model}, projectId: ${projectId}, userId: ${userId}`);
  
  try {
    // PLAN MODE ENFORCEMENT: Check agent mode from database
    let enforcedTools: any[] | undefined = undefined; // undefined = use defaults, [] = explicitly none
    let modeSystemPrompt = '';
    
    if (conversationId) {
      try {
        // Query conversation to get agent_mode
        const { db } = await import('../db');
        const { aiConversations } = await import('../../shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const [conversation] = await db
          .select({ agentMode: aiConversations.agentMode })
          .from(aiConversations)
          .where(eq(aiConversations.id, conversationId))
          .limit(1);
        
        if (conversation?.agentMode) {
          agentMode = conversation.agentMode;
          
          // PLAN MODE: Explicitly disable all tool execution
          if (agentMode === 'plan') {
            enforcedTools = []; // Explicitly empty = no tools allowed
            modeSystemPrompt = `
IMPORTANT: You are in PLAN MODE. Do NOT execute any code changes or file modifications.
Your role is to:
- Brainstorm ideas and explore approaches
- Break down complex projects into task lists
- Provide architectural guidance and planning
- Discuss pros/cons of different solutions
- Answer questions and provide strategic advice

When the user is ready to implement, they will switch to BUILD MODE.
Focus on planning, design, and collaboration - not implementation.`;
          } else {
            // BUILD MODE: Use client-provided tools or leave undefined for defaults
            enforcedTools = tools && tools.length > 0 ? tools : undefined;
            modeSystemPrompt = `
You are in BUILD MODE. You can execute actions like creating files, running commands, and modifying code.`;
          }
        }
      } catch (convError) {
        logger.warn('Failed to load conversation mode, defaulting to build:', convError);
        // On error, default to build mode with client tools or defaults
        enforcedTools = tools && tools.length > 0 ? tools : undefined;
      }
    } else {
      // No conversation ID = new conversation, default to build mode
      enforcedTools = tools && tools.length > 0 ? tools : undefined;
    }
    
    // Get project context
    const contextProvider = new ProjectContextProvider(projectId);
    const projectContext = await contextProvider.getContext();
    const contextPrompt = ProjectContextProvider.formatAsSystemPrompt(projectContext);
    
    // ============================================================
    // RAG CONTEXT INTEGRATION - Fetch and inject knowledge graph context
    // ============================================================
    let ragContextPrompt = '';
    let ragEnabled = false;
    let ragNodesCount = 0;
    
    // Use client-provided conversationId as sessionId for RAG config lookup
    // This aligns with how /api/rag/session-config stores configs
    const ragSessionId = conversationId || `session_${userId}_${projectId}`;
    
    // Default RAG config for new sessions (RAG enabled by default for better context)
    const defaultRagConfig = {
      enabled: true,
      mode: 'auto' as const,
      retrievalDepth: 3,
      includeConversationHistory: false,
      maxContextTokens: 2000
    };
    
    try {
      // Check if RAG is enabled for this session - try multiple lookup strategies
      let ragConfig = defaultRagConfig;
      
      // Strategy 1: Look up by conversationId (client-provided sessionId from /api/rag/session-config)
      const [session] = await db.select()
        .from(agentSessions)
        .where(eq(agentSessions.sessionToken, ragSessionId))
        .limit(1);
      
      if (session?.context && (session.context as any).ragConfig) {
        ragConfig = (session.context as any).ragConfig;
        logger.info(`[RAG] Found session RAG config for ${ragSessionId}`);
      } else {
        // No session found - use default config (RAG enabled)
        logger.info(`[RAG] No session config found for ${ragSessionId}, using defaults (RAG enabled)`);
      }
      
      ragEnabled = ragConfig?.enabled ?? true; // Default to true for better UX
      
      if (ragEnabled) {
        logger.info(`[RAG] RAG enabled for session ${ragSessionId}, fetching context...`);
        
        // Fetch relevant knowledge from the knowledge graph
        // Safely handle empty message (avoid substring on empty string)
        const searchQuery = message && message.length > 0 ? message.substring(0, 500) : '';
        const ragContexts = await memoryMCP.searchNodes(
          searchQuery, // Use user message as search query
          undefined, // No type filter
          ragConfig?.retrievalDepth || 3 // Number of relevant nodes to fetch
        );
        
        ragNodesCount = ragContexts.length;
        
        if (ragContexts.length > 0) {
          // Build RAG context prompt
          const ragItems = ragContexts.map((node, index) => {
            return `[${index + 1}] ${node.type.toUpperCase()}: ${node.content}`;
          }).join('\n\n');
          
          ragContextPrompt = `
=== KNOWLEDGE GRAPH CONTEXT (RAG) ===
The following relevant information has been retrieved from your knowledge graph memory:

${ragItems}

Use this context to provide more accurate and informed responses.
=====================================
`;
          
          logger.info(`[RAG] Injected ${ragContexts.length} knowledge nodes into context`);
          
          // Send RAG status event to client - success with nodes
          sendSSE(res, 'rag_status', {
            enabled: true,
            nodesRetrieved: ragContexts.length,
            sessionId: ragSessionId,
            status: 'success'
          });
        } else {
          logger.info(`[RAG] No relevant knowledge nodes found for query`);
          // Send RAG status event to client - enabled but no results
          sendSSE(res, 'rag_status', {
            enabled: true,
            nodesRetrieved: 0,
            sessionId: ragSessionId,
            status: 'no_results'
          });
        }
        
        // Also fetch recent conversation history if enabled
        if (ragConfig?.includeConversationHistory) {
          const history = await memoryMCP.getConversationHistory(
            String(userId),
            ragSessionId,
            3 // Last 3 conversation turns
          );
          
          if (history.length > 0) {
            const historyItems = history.map(h => `${h.role}: ${h.content.substring(0, 200)}...`).join('\n');
            ragContextPrompt += `
=== CONVERSATION MEMORY ===
Previous conversation context:
${historyItems}
===========================
`;
          }
        }
      } else {
        // RAG disabled for this session - notify client
        logger.info(`[RAG] RAG disabled for session ${ragSessionId}`);
        sendSSE(res, 'rag_status', {
          enabled: false,
          nodesRetrieved: 0,
          sessionId: ragSessionId,
          status: 'disabled'
        });
      }
    } catch (ragError: any) {
      // RAG errors should not block the chat - log and continue
      logger.warn(`[RAG] Failed to fetch RAG context: ${ragError.message}`);
      // Send error status to client
      sendSSE(res, 'rag_status', {
        enabled: false,
        nodesRetrieved: 0,
        sessionId: ragSessionId,
        status: 'error',
        error: ragError.message
      });
    }
    
    // ============================================================
    // MEMORY BANK INTEGRATION - Persistent project context across sessions
    // ============================================================
    let memoryBankContext = '';
    
    if (projectId) {
      try {
        // ✅ Ensure project-specific path is set before fetching context
        const projectBasePath = path.join(process.cwd(), 'projects', String(projectId));
        memoryBankService.setProjectBasePath(Number(projectId), projectBasePath);
        
        memoryBankContext = await memoryBankService.getContextForAgent(projectId);
        if (memoryBankContext) {
          logger.info(`[MemoryBank] Injected memory bank context for project ${projectId} (${memoryBankContext.length} chars)`);
          sendSSE(res, 'memory_bank_status', {
            enabled: true,
            projectId,
            hasContext: true,
            contextLength: memoryBankContext.length
          });
        } else {
          logger.info(`[MemoryBank] No memory bank initialized for project ${projectId}`);
          sendSSE(res, 'memory_bank_status', {
            enabled: false,
            projectId,
            hasContext: false
          });
        }
      } catch (mbError: any) {
        logger.warn(`[MemoryBank] Failed to fetch memory bank context: ${mbError.message}`);
      }
    }
    
    // Build messages array with context (including RAG and Memory Bank if enabled)
    const rawMessages = [
      {
        role: 'system',
        content: systemPrompt || `You are an expert AI coding assistant integrated into the E-Code Platform IDE. 
        You help users build, debug, and improve their applications with detailed explanations and high-quality code.
        You have access to the project context and can execute actions like creating files, running commands, and modifying code.
        
        ${modeSystemPrompt}
        
        ${contextPrompt}
        
        ${memoryBankContext}
        
        ${ragContextPrompt}`
      },
      ...context,
      { role: 'user', content: message }
    ];
    
    // Apply context truncation to prevent exceeding provider limits
    const truncationResult = truncateContext(rawMessages, provider);
    const messages = truncationResult.messages;
    
    // Warn user if context was truncated
    if (truncationResult.truncated) {
      logger.info(`Context truncated for ${provider}: dropped ${truncationResult.droppedCount} messages (${truncationResult.originalSize} → ${truncationResult.finalSize})`);
      sendSSE(res, 'warning', {
        message: truncationResult.warning,
        droppedCount: truncationResult.droppedCount,
        originalSize: truncationResult.originalSize,
        finalSize: truncationResult.finalSize
      });
    }
    
    // Track usage (send normalized model to prevent client-side 'default' bugs)
    const normalizedModelForEvent = normalizeModelName(model, provider);
    sendSSE(res, 'usage', { 
      provider, 
      model: normalizedModelForEvent,
      tokens: 0 
    });
    
    let fullResponse = '';
    
    // ✅ Stream based on provider and CAPTURE token usage for billing
    let usage: { tokensInput: number; tokensOutput: number } | undefined;
    switch (provider) {
      case 'openai':
        usage = await streamOpenAI(res, messages, { model, temperature, maxTokens, tools: enforcedTools, projectId });
        break;
        
      case 'anthropic':
        usage = await streamAnthropic(res, messages, { 
          model, 
          temperature, 
          maxTokens,
          tools: enforcedTools,
          projectId,
          extendedThinking: capabilities.extendedThinking || false
        });
        break;
        
      case 'gemini':
        usage = await streamGemini(res, messages, { model, temperature, maxTokens, tools: enforcedTools, projectId });
        break;
        
      case 'xai':
        usage = await streamXAI(res, messages, { model, temperature, maxTokens, tools: enforcedTools, projectId });
        break;
        
      case 'moonshot':
        usage = await streamMoonshot(res, messages, { model, temperature, maxTokens, tools: enforcedTools, projectId });
        break;
        
      default:
        // Fallback to OpenAI with warning
        logger.warn(`Unknown provider "${provider}", falling back to OpenAI`);
        usage = await streamOpenAI(res, messages, { model, temperature, maxTokens, tools: enforcedTools, projectId });
    }
    
    // ✅ CRITICAL: Track AI usage for billing (Pay-As-You-Go)
    if (usage && userId) {
      const user = (req as any).user;
      const requestDurationMs = Date.now() - requestStartTime;
      
      // ✅ CRITICAL: Normalize model name to prevent DB insert failures
      const normalizedModel = normalizeModelName(model, provider);
      
      // Import trackAiUsageManually for SSE tracking
      const { trackAiUsageManually } = await import('../middleware/ai-usage-tracker');
      
      await trackAiUsageManually({
        userId,
        endpoint: req.path,
        model: normalizedModel,
        provider,
        tokensInput: usage.tokensInput,
        tokensOutput: usage.tokensOutput,
        userTier: user?.subscriptionTier || 'free',
        subscriptionId: user?.stripeSubscriptionId,
        requestDurationMs,
        status: 'success',
        metadata: {
          conversationId,
          projectId,
          agentMode: agentMode || 'build',
          originalModel: model, // Keep original for debugging
        },
      });
      
      tokensInput = usage.tokensInput;
      tokensOutput = usage.tokensOutput;
    }
    
    // ============================================================
    // AUTO-UPDATE MEMORY BANK - Log AI activity to activeContext.md
    // ============================================================
    if (projectId && agentMode === 'build') {
      try {
        await memoryBankService.updateActiveContext(Number(projectId), {
          action: 'AI assistant interaction completed'
        });
        logger.info(`[MemoryBank] Auto-updated activeContext.md for project ${projectId}`);
      } catch (mbError: any) {
        logger.warn(`[MemoryBank] Failed to auto-update: ${mbError.message}`);
      }
    }
    
    // ============================================================
    // AUTO-CHECKPOINT - Create checkpoint after successful AI response
    // Captures actual file content, database snapshot, and conversation history
    // ============================================================
    if (projectId && agentMode === 'build') {
      try {
        const { checkpointService } = await import('../services/checkpoint.service');
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const fs = await import('fs/promises');
        const execAsync = promisify(exec);
        
        const projectIdNum = Number(projectId);
        
        // Compute project base path (relative to cwd where projects are stored)
        const projectBasePath = path.join(process.cwd(), 'projects', String(projectIdNum));
        
        // Capture actual file state from the project directory
        const snapshot = await workspaceSnapshotService.captureFileState(
          projectBasePath,
          projectIdNum,
          { includeHidden: false } // Skip hidden files like .git
        );
        
        // Build filesSnapshot metadata for the checkpoint record
        const filesSnapshot: Record<string, { hash: string; size: number }> = {};
        for (const file of snapshot.files) {
          filesSnapshot[file.path] = { hash: file.hash, size: file.size };
        }
        
        // Create the checkpoint record with metadata
        const checkpoint = await checkpointService.createCheckpoint(projectIdNum, {
          type: 'auto',
          triggerSource: 'ai_response',
          aiSummary: `AI build checkpoint - ${snapshot.totalFiles} files captured`,
          filesSnapshot,
        });
        
        // Store actual file content in autoCheckpointFiles table for restore
        if (snapshot.files.length > 0) {
          const filesToStore = snapshot.files.map(file => ({
            filePath: file.path,
            fileHash: file.hash,
            fileContent: file.content,
          }));
          
          await checkpointService.addCheckpointFiles(checkpoint.id, filesToStore);
          logger.info(`[Checkpoint] Stored ${filesToStore.length} files for checkpoint ${checkpoint.id}`);
        }
        
        // ============================================================
        // DATABASE SNAPSHOT - Capture database state with pg_dump
        // SECURITY: Use spawn with args array to prevent command injection
        // ============================================================
        let includesDatabase = false;
        let dbSnapshotPath: string | undefined;
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
          try {
            const { spawn } = await import('child_process');
            const checkpointDir = path.join(process.cwd(), '.checkpoints', String(checkpoint.id));
            await fs.mkdir(checkpointDir, { recursive: true });
            
            const dumpFile = path.join(checkpointDir, 'database.sql');
            
            // Parse DATABASE_URL safely to extract components
            const dbUrlParsed = new URL(databaseUrl);
            const pgDumpArgs = [
              '-h', dbUrlParsed.hostname,
              '-p', dbUrlParsed.port || '5432',
              '-U', dbUrlParsed.username,
              '-d', dbUrlParsed.pathname.slice(1), // remove leading /
              '--schema=public',
              '--no-owner',
              '--no-acl',
              '-f', dumpFile
            ];
            
            // Execute pg_dump using spawn with args array (secure - no shell injection)
            await new Promise<void>((resolve, reject) => {
              const child = spawn('pg_dump', pgDumpArgs, {
                env: { ...process.env, PGPASSWORD: dbUrlParsed.password },
                stdio: ['pipe', 'pipe', 'pipe']
              });
              
              let stderr = '';
              child.stderr?.on('data', (data) => { stderr += data.toString(); });
              
              child.on('close', (code) => {
                if (code === 0) {
                  resolve();
                } else {
                  reject(new Error(`pg_dump exited with code ${code}: ${stderr}`));
                }
              });
              
              child.on('error', (err) => reject(err));
            });
            
            includesDatabase = true;
            dbSnapshotPath = dumpFile;
            logger.info(`[Checkpoint] Database snapshot saved to ${dumpFile}`);
          } catch (dbError: any) {
            logger.warn(`[Checkpoint] Database snapshot failed (non-fatal): ${dbError.message}`);
          }
        }
        
        // ============================================================
        // CONVERSATION SNAPSHOT - Capture AI conversation history
        // ============================================================
        let conversationSnapshot: Array<{ role: string; content: string; timestamp?: string }> | undefined;
        if (conversationId) {
          try {
            const { aiConversations, agentMessages } = await import('../../shared/schema');
            const { eq, desc } = await import('drizzle-orm');
            
            // Get conversation messages from agentMessages table
            const messages = await db
              .select({
                role: agentMessages.role,
                content: agentMessages.content,
                createdAt: agentMessages.createdAt,
              })
              .from(agentMessages)
              .where(eq(agentMessages.conversationId, Number(conversationId)))
              .orderBy(agentMessages.createdAt)
              .limit(100); // Limit to prevent huge snapshots
            
            if (messages.length > 0) {
              conversationSnapshot = messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.createdAt?.toISOString(),
              }));
              logger.info(`[Checkpoint] Captured ${messages.length} conversation messages`);
            }
          } catch (convError: any) {
            logger.warn(`[Checkpoint] Conversation snapshot failed (non-fatal): ${convError.message}`);
          }
        }
        
        // Update checkpoint with database and conversation data
        // RELIABILITY: Persist dbSnapshotPath and conversationId for reliable restore
        if (includesDatabase || conversationSnapshot || dbSnapshotPath) {
          await checkpointService.updateCheckpointData(checkpoint.id, {
            includesDatabase,
            conversationSnapshot,
            dbSnapshotPath,
            conversationId: conversationId ? Number(conversationId) : undefined,
          });
        }
        
        logger.info(`[Checkpoint] Auto-created checkpoint ${checkpoint.id} for project ${projectId} with ${snapshot.totalFiles} files, db=${includesDatabase}, conv=${!!conversationSnapshot}`);
      } catch (cpError: any) {
        // Handle rate-limited checkpoints silently - this is expected behavior
        if (cpError.code === 'RATE_LIMITED') {
          logger.debug(`[Checkpoint] Rate-limited auto-checkpoint for project ${projectId} - skipping silently`);
        } else {
          logger.warn(`[Checkpoint] Failed to create auto-checkpoint: ${cpError.message}`);
        }
      }
    }
    
    // Send completion event
    sendSSE(res, 'done', { 
      conversationId,
      projectId,
      totalTokens: tokensInput + tokensOutput,
      tokensInput,
      tokensOutput
    });
    
    res.end();
    
  } catch (error: any) {
    logger.error('Streaming chat error:', error);
    
    // ✅ Issue #34 FIX: Classify errors as retryable vs permanent
    const isRetryableError = (err: any): boolean => {
      const status = err.status || err.statusCode || err.response?.status;
      // 429 = Rate limit, 502/503/504 = Temporary server errors
      const retryableStatuses = [429, 502, 503, 504];
      if (retryableStatuses.includes(status)) return true;
      // Network/timeout errors are retryable
      const retryableMessages = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'socket hang up', 'network'];
      if (err.code && retryableMessages.some(m => err.code?.includes(m))) return true;
      if (err.message && retryableMessages.some(m => err.message?.toLowerCase().includes(m))) return true;
      return false;
    };
    
    const errorClassification = {
      isRetryable: isRetryableError(error),
      status: error.status || error.statusCode || error.response?.status,
      code: error.code || 'STREAM_ERROR'
    };
    
    // ✅ CRITICAL: Track failed AI requests for billing (error = still costs money!)
    if (userId) {
      try {
        const user = (req as any).user;
        const requestDurationMs = Date.now() - requestStartTime;
        const normalizedModel = normalizeModelName(model, provider);
        const { trackAiUsageManually } = await import('../middleware/ai-usage-tracker');
        
        await trackAiUsageManually({
          userId,
          endpoint: req.path,
          model: normalizedModel,
          provider,
          tokensInput: tokensInput || 0, // Fallback to 0 if error before streaming
          tokensOutput: 0,
          userTier: user?.subscriptionTier || 'free',
          subscriptionId: user?.stripeSubscriptionId,
          requestDurationMs,
          status: 'error',
          errorMessage: error.message || 'Unknown streaming error',
          metadata: {
            conversationId,
            projectId,
            agentMode: agentMode || 'build',
            originalModel: model,
            errorCode: error.code || 'STREAM_ERROR',
          },
        });
      } catch (trackingError) {
        logger.error('Failed to track error AI usage', { trackingError, originalError: error });
      }
    }
    
    // Send error event with retryability classification
    sendSSE(res, 'error', {
      message: error.message || 'An error occurred during streaming',
      code: errorClassification.code,
      isRetryable: errorClassification.isRetryable,
      status: errorClassification.status,
      provider
    });
    
    res.end();
  }
});

/**
 * Stream from OpenAI API with tool execution
 */
async function streamOpenAI(res: any, messages: any[], options: any) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return;
  }
  
  const openai = new OpenAI({ apiKey });
  const executor = new ToolExecutor(options.projectId || 'default');
  
  // Add tools to the stream (respect Plan Mode enforcement from options)
  const requestedTools = options.tools !== undefined ? options.tools : allTools;
  const tools = toOpenAITools(requestedTools);
  
  // Use provided model or fallback to gpt-4o-mini (reliable, cost-effective default)
  const modelToUse = options.model || 'gpt-4o-mini';
  logger.info(`[OpenAI Stream] Using model: ${modelToUse}`);
  
  // Get model capabilities for correct parameter usage
  const capabilities = getOpenAIModelCapabilities(modelToUse);
  
  const stream = await openai.chat.completions.create({
    model: modelToUse,
    messages,
    temperature: capabilities.supportsTemperature ? options.temperature : undefined,
    ...(capabilities.requiresMaxCompletionTokens 
      ? { max_completion_tokens: options.maxTokens }
      : { max_tokens: options.maxTokens }),
    stream: true,
    stream_options: { include_usage: true },
    tools: tools.length > 0 ? tools : undefined
  });
  
  let fullContent = '';
  let toolCalls: any[] = [];
  let currentToolCall: any = null;
  let tokensInput = 0;
  let tokensOutput = 0;
  
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    
    // ✅ Capture token usage from final chunk
    if (chunk.usage) {
      tokensInput = chunk.usage.prompt_tokens || 0;
      tokensOutput = chunk.usage.completion_tokens || 0;
    }
    
    if (delta?.content) {
      fullContent += delta.content;
      sendSSE(res, 'token', { content: delta.content });
    }
    
    // Handle tool calls
    if (delta?.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        if (toolCallDelta.index !== undefined) {
          if (!toolCalls[toolCallDelta.index]) {
            toolCalls[toolCallDelta.index] = {
              id: toolCallDelta.id,
              type: 'function',
              function: { name: '', arguments: '' }
            };
          }
          
          const toolCall = toolCalls[toolCallDelta.index];
          
          if (toolCallDelta.function?.name) {
            toolCall.function.name += toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            toolCall.function.arguments += toolCallDelta.function.arguments;
          }
        }
      }
    }
  }
  
  // Execute tools autonomously
  const toolResults: any[] = [];
  for (const toolCall of toolCalls) {
    try {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      sendSSE(res, 'tool_start', {
        toolCallId: toolCall.id,
        tool: functionName,
        parameters: functionArgs
      });
      
      const result = await executor.execute(functionName, functionArgs);
      
      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        name: functionName,
        content: JSON.stringify(result)
      });
      
      sendSSE(res, 'tool_result', {
        toolCallId: toolCall.id,
        tool: functionName,
        result: result.output,
        success: result.success,
        metadata: result.metadata
      });
      
    } catch (error: any) {
      sendSSE(res, 'tool_error', {
        toolCallId: toolCall.id,
        error: error.message
      });
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    tool_calls: toolCalls,
    tool_results: toolResults,
    model: options.model || 'gpt-5'
  });
  
  // ✅ Return token usage for billing
  return { tokensInput, tokensOutput };
}

/**
 * Stream from Anthropic API with Extended Thinking support
 */
async function streamAnthropic(res: any, messages: any[], options: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return;
  }
  
  const anthropic = new Anthropic({ apiKey });
  const executor = new ToolExecutor(options.projectId || 'default');
  
  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  // Add tools to the request (respect Plan Mode enforcement from options)
  const requestedTools = options.tools !== undefined ? options.tools : allTools;
  const tools = toAnthropicTools(requestedTools);
  
  // Use provided model or default to claude-sonnet-4-5-20250929 (latest, falls back to 3.5 if needed)
  const modelToUse = options.model || 'claude-sonnet-4-5-20250929';
  logger.info(`[Anthropic Stream] Using model: ${modelToUse}`);
  
  // ✅ Use .stream() helper to get finalMessage() with usage
  const stream = anthropic.messages.stream({
    model: modelToUse,
    messages: userMessages,
    system: systemMessage?.content,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    tools: tools.length > 0 ? tools : undefined,
    thinking: options.extendedThinking ? {
      type: 'enabled',
      budget_tokens: 10000
    } : undefined
  });
  
  let fullContent = '';
  let thinkingContent = '';
  let currentThinkingStep: any = null;
  let toolCalls: any[] = [];
  let currentToolUse: any = null;
  
  // ✅ Process stream events
  for await (const event of stream) {
    // Handle thinking blocks (extended thinking)
    if (event.type === 'content_block_start' && (event as any).content_block?.type === 'thinking') {
      currentThinkingStep = {
        id: Date.now().toString(),
        type: 'reasoning',
        title: 'AI Thinking',
        content: '',
        status: 'active',
        timestamp: new Date(),
        isStreaming: true
      };
      sendSSE(res, 'thinking_start', { step: currentThinkingStep });
    }
    
    // Handle tool use blocks
    if (event.type === 'content_block_start' && (event as any).content_block?.type === 'tool_use') {
      currentToolUse = {
        id: (event as any).content_block.id,
        name: (event as any).content_block.name,
        input: ''
      };
    }
    
    if (event.type === 'content_block_delta') {
      const delta = event.delta as any;
      
      // Thinking content
      if (delta.type === 'thinking_delta' && delta.thinking) {
        thinkingContent += delta.thinking;
        if (currentThinkingStep) {
          currentThinkingStep.content = thinkingContent;
          sendSSE(res, 'thinking_update', { 
            step: currentThinkingStep,
            content: delta.thinking 
          });
        }
      }
      
      // Regular text content
      if (delta.type === 'text_delta' && delta.text) {
        fullContent += delta.text;
        sendSSE(res, 'token', { content: delta.text });
      }
      
      // Tool use input
      if (delta.type === 'input_json_delta' && delta.partial_json && currentToolUse) {
        currentToolUse.input += delta.partial_json;
      }
    }
    
    if (event.type === 'content_block_stop') {
      if (currentThinkingStep) {
        currentThinkingStep.status = 'complete';
        currentThinkingStep.isStreaming = false;
        sendSSE(res, 'thinking_complete', { step: currentThinkingStep });
        currentThinkingStep = null;
        thinkingContent = '';
      }
      
      if (currentToolUse) {
        toolCalls.push(currentToolUse);
        currentToolUse = null;
      }
    }
  }
  
  // Execute tools autonomously
  const toolResults: any[] = [];
  for (const toolCall of toolCalls) {
    try {
      const functionArgs = JSON.parse(toolCall.input);
      
      sendSSE(res, 'tool_start', {
        toolCallId: toolCall.id,
        tool: toolCall.name,
        parameters: functionArgs
      });
      
      const result = await executor.execute(toolCall.name, functionArgs);
      
      toolResults.push({
        tool_use_id: toolCall.id,
        type: 'tool_result',
        content: JSON.stringify(result)
      });
      
      sendSSE(res, 'tool_result', {
        toolCallId: toolCall.id,
        tool: toolCall.name,
        result: result.output,
        success: result.success,
        metadata: result.metadata
      });
      
    } catch (error: any) {
      sendSSE(res, 'tool_error', {
        toolCallId: toolCall.id,
        error: error.message
      });
    }
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    tool_calls: toolCalls,
    tool_results: toolResults,
    model: options.model || 'claude-sonnet-4-5-20250929',
    thinking: thinkingContent
  });
  
  // ✅ Get token usage from finalMessage AFTER stream completes
  const finalMessage = await stream.finalMessage();
  const tokensInput = finalMessage.usage.input_tokens || 0;
  const tokensOutput = finalMessage.usage.output_tokens || 0;
  
  // ✅ Return token usage for billing
  return { tokensInput, tokensOutput };
}

/**
 * Stream from Google Gemini API
 */
async function streamGemini(res: any, messages: any[], options: any) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'Google AI API key not configured. Please add GOOGLE_AI_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return;
  }
  
  // Use provided model or default to gemini-2.0-flash (fast, latest)
  const modelToUse = options.model || 'gemini-2.0-flash';
  logger.info(`[Gemini Stream] Using model: ${modelToUse}`);
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: modelToUse 
  });
  
  // Convert messages to Gemini format
  const chat = model.startChat({
    history: messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
  });
  
  const result = await chat.sendMessageStream(messages[messages.length - 1].content);
  
  let fullContent = '';
  let tokensInput = 0;
  let tokensOutput = 0;
  
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullContent += text;
      sendSSE(res, 'token', { content: text });
    }
    
    // ✅ Capture token usage if available
    const usageMetadata = (chunk as any).usageMetadata;
    if (usageMetadata) {
      tokensInput = usageMetadata.promptTokenCount || 0;
      tokensOutput = usageMetadata.candidatesTokenCount || 0;
    }
  }
  
  // Fallback: Estimate tokens if not provided (1 token ≈ 4 chars)
  if (tokensInput === 0 && tokensOutput === 0) {
    const inputChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    tokensInput = Math.ceil(inputChars / 4);
    tokensOutput = Math.ceil(fullContent.length / 4);
  }
  
  // Send final message
  sendSSE(res, 'message', { 
    content: fullContent,
    model: modelToUse
  });
  
  // ✅ Return token usage for billing
  return { tokensInput, tokensOutput };
}

/**
 * Stream from xAI (Grok) API - OpenAI-compatible
 * Uses xAI's OpenAI-compatible API at https://api.x.ai/v1
 */
async function streamXAI(res: any, messages: any[], options: any) {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'xAI API key not configured. Please add XAI_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return { tokensInput: 0, tokensOutput: 0 };
  }
  
  // xAI uses OpenAI-compatible API
  const xaiClient = new OpenAI({ 
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  });
  
  // ✅ FIXED Dec 5, 2025: Use catalog model ID (was grok-3-fast-latest which doesn't exist)
  const modelToUse = options.model || 'grok-4-fast';
  logger.info(`[xAI Stream] Using model: ${modelToUse}`);
  
  try {
    const stream = await xaiClient.chat.completions.create({
      model: modelToUse,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
      stream_options: { include_usage: true }
    });
    
    let fullContent = '';
    let tokensInput = 0;
    let tokensOutput = 0;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      // Capture token usage from final chunk
      if (chunk.usage) {
        tokensInput = chunk.usage.prompt_tokens || 0;
        tokensOutput = chunk.usage.completion_tokens || 0;
      }
      
      if (delta?.content) {
        fullContent += delta.content;
        sendSSE(res, 'token', { content: delta.content });
      }
    }
    
    // Send final message
    sendSSE(res, 'message', { 
      content: fullContent,
      model: modelToUse
    });
    
    return { tokensInput, tokensOutput };
  } catch (error: any) {
    logger.error(`[xAI Stream] Error:`, error);
    sendSSE(res, 'error', { 
      message: error.message || 'xAI streaming error',
      code: error.code || 'XAI_ERROR'
    });
    return { tokensInput: 0, tokensOutput: 0 };
  }
}

/**
 * Stream from Moonshot AI (Kimi) API - OpenAI-compatible
 * Uses Moonshot's OpenAI-compatible API at https://api.moonshot.ai/v1
 */
async function streamMoonshot(res: any, messages: any[], options: any) {
  const apiKey = process.env.MOONSHOT_API_KEY;
  
  if (!apiKey) {
    sendSSE(res, 'error', { 
      message: 'Moonshot API key not configured. Please add MOONSHOT_API_KEY to secrets.',
      code: 'MISSING_API_KEY'
    });
    return { tokensInput: 0, tokensOutput: 0 };
  }
  
  // Moonshot uses OpenAI-compatible API
  const moonshotClient = new OpenAI({ 
    apiKey,
    baseURL: 'https://api.moonshot.ai/v1'
  });
  
  // Use provided model or default to moonshot-v1-32k
  const modelToUse = options.model || 'moonshot-v1-32k';
  logger.info(`[Moonshot Stream] Using model: ${modelToUse}`);
  
  try {
    const stream = await moonshotClient.chat.completions.create({
      model: modelToUse,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
      stream_options: { include_usage: true }
    });
    
    let fullContent = '';
    let tokensInput = 0;
    let tokensOutput = 0;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      // Capture token usage from final chunk
      if (chunk.usage) {
        tokensInput = chunk.usage.prompt_tokens || 0;
        tokensOutput = chunk.usage.completion_tokens || 0;
      }
      
      if (delta?.content) {
        fullContent += delta.content;
        sendSSE(res, 'token', { content: delta.content });
      }
    }
    
    // Send final message
    sendSSE(res, 'message', { 
      content: fullContent,
      model: modelToUse
    });
    
    return { tokensInput, tokensOutput };
  } catch (error: any) {
    logger.error(`[Moonshot Stream] Error:`, error);
    sendSSE(res, 'error', { 
      message: error.message || 'Moonshot streaming error',
      code: error.code || 'MOONSHOT_ERROR'
    });
    return { tokensInput: 0, tokensOutput: 0 };
  }
}

/**
 * Stop streaming endpoint - allows client to cancel ongoing stream
 */
router.post('/api/agent/chat/stop', ensureAuthenticated, (req, res) => {
  const { conversationId } = req.body;
  
  // In a production system, you'd track active streams and close them
  logger.info(`Stopping stream for conversation: ${conversationId}`);
  
  res.json({ success: true, conversationId });
});

/**
 * Get available AI models endpoint
 * Returns models with availability based on configured API keys
 */
router.get('/api/agent/models', ensureAuthenticated, (req, res) => {
  const models = [
    // OpenAI Models (December 2025)
    { provider: 'openai', model: 'gpt-5.1', name: 'GPT-5.1', context: 400000, available: !!process.env.OPENAI_API_KEY },
    { provider: 'openai', model: 'gpt-5', name: 'GPT-5', context: 400000, available: !!process.env.OPENAI_API_KEY },
    { provider: 'openai', model: 'gpt-5-mini', name: 'GPT-5 Mini', context: 400000, available: !!process.env.OPENAI_API_KEY },
    { provider: 'openai', model: 'gpt-5-nano', name: 'GPT-5 Nano', context: 400000, available: !!process.env.OPENAI_API_KEY },
    { provider: 'openai', model: 'o3', name: 'o3 (Reasoning)', context: 128000, available: !!process.env.OPENAI_API_KEY },
    { provider: 'openai', model: 'o4-mini', name: 'o4 Mini', context: 128000, available: !!process.env.OPENAI_API_KEY },
    
    // Anthropic Models (Claude 4.5 Family)
    { provider: 'anthropic', model: 'claude-opus-4-5-20251124', name: 'Claude Opus 4.5', context: 200000, available: !!process.env.ANTHROPIC_API_KEY },
    { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', context: 200000, available: !!process.env.ANTHROPIC_API_KEY },
    { provider: 'anthropic', model: 'claude-haiku-4-5-20251015', name: 'Claude Haiku 4.5', context: 200000, available: !!process.env.ANTHROPIC_API_KEY },
    
    // Google Gemini Models
    { provider: 'gemini', model: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', context: 1000000, available: !!process.env.GEMINI_API_KEY },
    { provider: 'gemini', model: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', context: 1000000, available: !!process.env.GEMINI_API_KEY },
    
    // xAI Grok Models
    { provider: 'xai', model: 'grok-4', name: 'Grok 4', context: 256000, available: !!process.env.XAI_API_KEY },
    { provider: 'xai', model: 'grok-4-fast', name: 'Grok 4 Fast', context: 256000, available: !!process.env.XAI_API_KEY },
    { provider: 'xai', model: 'grok-3-fast-latest', name: 'Grok 3 Fast', context: 128000, available: !!process.env.XAI_API_KEY },
    
    // Moonshot AI (Kimi) Models - Verified Dec 2025: Only these 4 models exist
    { provider: 'moonshot', model: 'kimi-k2-0711-preview', name: 'Kimi K2', context: 128000, available: !!process.env.MOONSHOT_API_KEY },
    { provider: 'moonshot', model: 'kimi-k2-thinking', name: 'Kimi K2 Thinking', context: 256000, available: !!process.env.MOONSHOT_API_KEY },
    { provider: 'moonshot', model: 'moonshot-v1-32k', name: 'Moonshot v1 32K', context: 32768, available: !!process.env.MOONSHOT_API_KEY },
    { provider: 'moonshot', model: 'moonshot-v1-128k', name: 'Moonshot v1 128K', context: 131072, available: !!process.env.MOONSHOT_API_KEY },
  ];
  
  res.json(models);
});

export default router;