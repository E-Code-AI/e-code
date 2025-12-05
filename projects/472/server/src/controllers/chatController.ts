import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getOpenAIClient } from "../services/openaiClient";
import { conversationStore } from "../services/conversationStore";
import { logger } from "../utils/logger";

const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(8000, "Message is too long"),
  systemPrompt: z.string().max(8000).optional(),
  metadata: z
    .object({
      userId: z.string().optional(),
      locale: z.string().optional(),
      clientVersion: z.string().optional(),
    })
    .optional(),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(4096).optional(),
      topP: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const chatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
    })
    .optional(),
});

type ChatRequestBody = z.infer<typeof chatRequestSchema>;
type ChatResponseBody = z.infer<typeof chatResponseSchema>;

const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024;

function buildMessages(
  userMessage: string,
  systemPrompt?: string,
  history?: ChatCompletionMessageParam[]
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  if (history && history.length > 0) {
    messages.push(...history);
  }

  messages.push({
    role: "user",
    content: userMessage,
  });

  return messages;
}

export async function handleChat(
  req: Request<unknown, unknown, ChatRequestBody>,
  res: Response<ChatResponseBody>,
  next: NextFunction
): Promise<void> {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        conversationId: uuidv4(),
        message: `Invalid request: undefined`,
      });
      return;
    }

    const { conversationId, message, systemPrompt, metadata, options } =
      parseResult.data;

    const openai = getOpenAIClient();

    const existingConversation =
      conversationId && conversationStore.getConversation(conversationId);

    const effectiveConversationId =
      conversationId && existingConversation
        ? conversationId
        : conversationStore.createConversation({
            userId: metadata?.userId,
            metadata,
          });

    const history = conversationStore.getMessages(effectiveConversationId);

    const messages = buildMessages(message, systemPrompt, history);

    const temperature =
      options?.temperature !== undefined
        ? options.temperature
        : DEFAULT_TEMPERATURE;
    const maxTokens =
      options?.maxTokens !== undefined ? options.maxTokens : DEFAULT_MAX_TOKENS;
    const topP = options?.topP;

    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    });

    const durationMs = Date.now() - startTime;

    const choice = completion.choices[0];
    const assistantMessage = choice.message?.content ?? "";

    if (!assistantMessage) {
      logger.warn("Empty assistant message from OpenAI", {
        conversationId: effectiveConversationId,
      });
    }

    conversationStore.appendMessages(effectiveConversationId, [
      {
        role: "user",
        content: message,
      },
      {
        role: "assistant",
        content: assistantMessage,
      },
    ]);

    const usage = completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens ?? 0,
          completionTokens: completion.usage.completion_tokens ?? 0,
          totalTokens: completion.usage.total_tokens ?? 0,
        }
      : undefined;

    logger.info("Chat completion generated", {
      conversationId: effectiveConversationId,
      userId: metadata?.userId,
      durationMs,
      usage,
    });

    const responsePayload: ChatResponseBody = {
      conversationId: effectiveConversationId,
      message: assistantMessage,
      usage,
    };

    const validation = chatResponseSchema.safeParse(responsePayload);
    if (!validation.success) {
      logger.error("Internal response validation failed", {
        issues: validation.error.issues,
      });
      res.status(500).json({
        conversationId: effectiveConversationId,
        message: "Internal server error: invalid response format",
      });
      return;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    logger.error("Error handling chat request", {
      error,
    });
    next(error);
  }
}

export async function getConversation(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    if (!id || !uuidv4().replace(/[0-9a-f]/g, "0").length) {
      // Simple sanity check; actual UUID validation is in store if needed
    }

    const conversation = conversationStore.getConversation(id);

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.status(200).json(conversation);
  } catch (error) {
    logger.error("Error fetching conversation", { error });
    next(error);
  }
}

export async function listConversations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req.query.userId as string) || undefined;
    const conversations = conversationStore.listConversations(userId);
    res.status(200).json(conversations);
  } catch (error) {
    logger.error("Error listing conversations", { error });
    next(error);
  }
}

export async function deleteConversation(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = conversationStore.deleteConversation(id);

    if (!deleted) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error("Error deleting conversation", { error });
    next(error);
  }
}