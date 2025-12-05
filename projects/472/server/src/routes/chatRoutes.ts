import express, { Request, Response, NextFunction, Router } from "express";
import { z } from "zod";
import { OpenAI } from "openai";
import { PassThrough } from "stream";

type Role = "system" | "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface MemoryStore {
  createConversation(initialMessage?: ChatMessage): Promise<Conversation>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  appendMessage(conversationId: string, message: ChatMessage): Promise<void>;
  listConversations(limit?: number): Promise<Conversation[]>;
}

interface ChatRoutesOptions {
  openaiClient: OpenAI;
  memoryStore: MemoryStore;
  defaultModel?: string;
  systemPrompt?: string;
}

const startConversationSchema = z.object({
  message: z
    .object({
      content: z.string().min(1),
    })
    .optional(),
  model: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const sendMessageSchema = z.object({
  message: z.object({
    content: z.string().min(1),
  }),
  model: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const listConversationsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => val === undefined || (!Number.isNaN(val) && val > 0), {
      message: "limit must be a positive integer",
    }),
});

const getConversationParamsSchema = z.object({
  id: z.string().min(1),
});

const sendMessageParamsSchema = z.object({
  id: z.string().min(1),
});

function createId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 10)
  );
}

function buildPrompt(
  systemPrompt: string | undefined,
  conversation: Conversation | null,
  userContent: string
): Array<{ role: Role; content: string }> {
  const messages: Array<{ role: Role; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (conversation) {
    for (const msg of conversation.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userContent });

  return messages;
}

async function handleStreamingResponse(
  res: Response,
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  onChunk?: (chunk: string) => Promise<void> | void,
  onComplete?: (fullText: string) => Promise<void> | void
): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const passThrough = new PassThrough();
  passThrough.pipe(res);

  let fullText = "";

  try {
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content ?? "";
      if (!delta) continue;

      fullText += delta;

      const payload = JSON.stringify({
        type: "chunk",
        data: delta,
      });

      passThrough.write(`data: undefined\n\n`);

      if (onChunk) {
        await onChunk(delta);
      }
    }

    const endPayload = JSON.stringify({
      type: "end",
      data: fullText,
    });

    passThrough.write(`data: undefined\n\n`);
    passThrough.end();

    if (onComplete) {
      await onComplete(fullText);
    }
  } catch (error) {
    const errPayload = JSON.stringify({
      type: "error",
      error: "Streaming error",
    });
    passThrough.write(`data: undefined\n\n`);
    passThrough.end();
  }
}

export function createChatRouter(options: ChatRoutesOptions): Router {
  const { openaiClient, memoryStore, defaultModel = "gpt-4o-mini", systemPrompt } = options;

  const router = express.Router();

  router.post(
    "/conversations",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parseResult = startConversationSchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid request body",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const { message, model, stream } = parseResult.data;

        const initialMessage: ChatMessage | undefined = message
          ? {
              id: createId(),
              role: "user",
              content: message.content,
              createdAt: new Date().toISOString(),
            }
          : undefined;

        const conversation = await memoryStore.createConversation(
          initialMessage
        );

        if (!message) {
          res.status(201).json({
            conversationId: conversation.id,
            conversation,
          });
          return;
        }

        const promptMessages = buildPrompt(
          systemPrompt,
          conversation,
          message.content
        );

        if (stream) {
          const completionStream =
            await openaiClient.chat.completions.create({
              model: model || defaultModel,
              messages: promptMessages,
              stream: true,
            });

          await handleStreamingResponse(
            res,
            completionStream,
            undefined,
            async (fullText: string) => {
              const assistantMessage: ChatMessage = {
                id: createId(),
                role: "assistant",
                content: fullText,
                createdAt: new Date().toISOString(),
              };
              await memoryStore.appendMessage(
                conversation.id,
                assistantMessage
              );
            }
          );
          return;
        }

        const completion = await openaiClient.chat.completions.create({
          model: model || defaultModel,
          messages: promptMessages,
          stream: false,
        });

        const content =
          completion.choices?.[0]?.message?.content?.trim() ?? "";

        const assistantMessage: ChatMessage = {
          id: createId(),
          role: "assistant",
          content,
          createdAt: new Date().toISOString(),
        };

        await memoryStore.appendMessage(conversation.id, assistantMessage);

        res.status(201).json({
          conversationId: conversation.id,
          conversation: {
            ...conversation,
            messages: [...conversation.messages, assistantMessage],
          },
          response: assistantMessage,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/conversations",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parseResult = listConversationsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid query parameters",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const { limit } = parseResult.data;
        const conversations = await memoryStore.listConversations(limit);

        res.json({
          conversations,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.get(
    "/conversations/:id",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const parseResult = getConversationParamsSchema.safeParse(req.params);
        if (!parseResult.success) {
          res.status(400).json({
            error: "Invalid conversation id",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const { id } = parseResult.data;
        const conversation = await memoryStore.getConversation(id);

        if (!conversation) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }

        res.json({ conversation });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/conversations/:id/messages",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const paramsResult = sendMessageParamsSchema.safeParse(req.params);
        if (!paramsResult.success) {
          res.status(400).json({
            error: "Invalid conversation id",
            details: paramsResult.error.flatten(),
          });
          return;
        }

        const bodyResult = sendMessageSchema.safeParse(req.body);
        if (!bodyResult.success) {
          res.status(400).json({
            error: "Invalid request body",
            details: bodyResult.error.flatten(),
          });
          return;
        }

        const { id } = paramsResult.data;
        const { message, model, stream } = bodyResult.data;

        const conversation = await memoryStore.getConversation(id);
        if (!conversation) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }

        const userMessage: ChatMessage =