import { randomUUID } from "crypto";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface ConversationHistory {
  id: string;
  sessionId: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  metadata?: Record<string, unknown>;
}

export interface CreateConversationInput {
  sessionId: string;
  title?: string;
  metadata?: Record<string, unknown>;
  initialMessages?: Omit<Message, "id" | "createdAt">[];
}

export interface UpdateConversationInput {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface AppendMessagesInput {
  messages: Omit<Message, "id" | "createdAt">[];
}

export interface ConversationQuery {
  sessionId: string;
  limit?: number;
  offset?: number;
}

export interface HistoryStore {
  createConversation(input: CreateConversationInput): Promise<ConversationHistory>;
  getConversation(sessionId: string, conversationId: string): Promise<ConversationHistory | null>;
  listConversations(query: ConversationQuery): Promise<ConversationHistory[]>;
  updateConversation(
    sessionId: string,
    conversationId: string,
    updates: UpdateConversationInput
  ): Promise<ConversationHistory | null>;
  appendMessages(
    sessionId: string,
    conversationId: string,
    input: AppendMessagesInput
  ): Promise<ConversationHistory | null>;
  deleteConversation(sessionId: string, conversationId: string): Promise<boolean>;
  deleteAllConversationsForSession(sessionId: string): Promise<number>;
}

export interface HistoryStoreOptions {
  /**
   * Maximum number of conversations to keep per session.
   * Oldest conversations will be removed when the limit is exceeded.
   * Set to 0 or undefined for no limit.
   */
  maxConversationsPerSession?: number;
  /**
   * Maximum number of messages to keep per conversation.
   * Oldest messages will be removed when the limit is exceeded.
   * Set to 0 or undefined for no limit.
   */
  maxMessagesPerConversation?: number;
}

/**
 * In-memory implementation of HistoryStore.
 * Not suitable for multi-process or multi-instance deployments without an external backing store.
 */
export class InMemoryHistoryStore implements HistoryStore {
  private readonly store: Map<string, Map<string, ConversationHistory>>;
  private readonly maxConversationsPerSession?: number;
  private readonly maxMessagesPerConversation?: number;

  constructor(options: HistoryStoreOptions = {}) {
    this.store = new Map();
    this.maxConversationsPerSession =
      options.maxConversationsPerSession && options.maxConversationsPerSession > 0
        ? options.maxConversationsPerSession
        : undefined;
    this.maxMessagesPerConversation =
      options.maxMessagesPerConversation && options.maxMessagesPerConversation > 0
        ? options.maxMessagesPerConversation
        : undefined;
  }

  async createConversation(input: CreateConversationInput): Promise<ConversationHistory> {
    const now = new Date();
    const conversationId = randomUUID();

    const messages: Message[] = (input.initialMessages ?? []).map((msg) => ({
      ...msg,
      id: randomUUID(),
      createdAt: now,
    }));

    const conversation: ConversationHistory = {
      id: conversationId,
      sessionId: input.sessionId,
      title: input.title,
      createdAt: now,
      updatedAt: now,
      messages: this.enforceMessageLimit(messages),
      metadata: input.metadata ?? {},
    };

    let sessionConversations = this.store.get(input.sessionId);
    if (!sessionConversations) {
      sessionConversations = new Map();
      this.store.set(input.sessionId, sessionConversations);
    }

    sessionConversations.set(conversationId, conversation);
    this.enforceConversationLimit(input.sessionId);

    return conversation;
  }

  async getConversation(
    sessionId: string,
    conversationId: string
  ): Promise<ConversationHistory | null> {
    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return null;
    const conversation = sessionConversations.get(conversationId);
    return conversation ?? null;
  }

  async listConversations(query: ConversationQuery): Promise<ConversationHistory[]> {
    const { sessionId, limit, offset } = query;
    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return [];

    const allConversations = Array.from(sessionConversations.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;

    return allConversations.slice(start, end);
  }

  async updateConversation(
    sessionId: string,
    conversationId: string,
    updates: UpdateConversationInput
  ): Promise<ConversationHistory | null> {
    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return null;

    const existing = sessionConversations.get(conversationId);
    if (!existing) return null;

    const updated: ConversationHistory = {
      ...existing,
      title: updates.title ?? existing.title,
      metadata: {
        ...(existing.metadata ?? {}),
        ...(updates.metadata ?? {}),
      },
      updatedAt: new Date(),
    };

    sessionConversations.set(conversationId, updated);
    return updated;
  }

  async appendMessages(
    sessionId: string,
    conversationId: string,
    input: AppendMessagesInput
  ): Promise<ConversationHistory | null> {
    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return null;

    const existing = sessionConversations.get(conversationId);
    if (!existing) return null;

    const now = new Date();
    const newMessages: Message[] = input.messages.map((msg) => ({
      ...msg,
      id: randomUUID(),
      createdAt: now,
    }));

    const combinedMessages = this.enforceMessageLimit([...existing.messages, ...newMessages]);

    const updated: ConversationHistory = {
      ...existing,
      messages: combinedMessages,
      updatedAt: now,
    };

    sessionConversations.set(conversationId, updated);
    return updated;
  }

  async deleteConversation(sessionId: string, conversationId: string): Promise<boolean> {
    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return false;

    const deleted = sessionConversations.delete(conversationId);
    if (sessionConversations.size === 0) {
      this.store.delete(sessionId);
    }
    return deleted;
  }

  async deleteAllConversationsForSession(sessionId: string): Promise<number> {
    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return 0;

    const count = sessionConversations.size;
    this.store.delete(sessionId);
    return count;
  }

  private enforceConversationLimit(sessionId: string): void {
    if (!this.maxConversationsPerSession) return;

    const sessionConversations = this.store.get(sessionId);
    if (!sessionConversations) return;

    const conversations = Array.from(sessionConversations.values()).sort(
      (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
    );

    while (conversations.length > this.maxConversationsPerSession) {
      const oldest = conversations.shift();
      if (oldest) {
        sessionConversations.delete(oldest.id);
      }
    }
  }

  private enforceMessageLimit(messages: Message[]): Message[] {
    if (!this.maxMessagesPerConversation) return messages;
    if (messages.length <= this.maxMessagesPerConversation) return messages;
    return messages.slice(messages.length - this.maxMessagesPerConversation);
  }
}

export const historyStore: HistoryStore = new InMemoryHistoryStore();