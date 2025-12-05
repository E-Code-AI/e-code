import { EventEmitter } from "events";

export type Role = "system" | "user" | "assistant" | "tool";

export interface MessageMetadata {
  [key: string]: unknown;
}

export interface ConversationMetadata {
  [key: string]: unknown;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: Date;
  metadata?: MessageMetadata;
}

export interface ConversationState {
  id: string;
  messages: Message[];
  metadata?: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppendMessageOptions {
  metadata?: MessageMetadata;
}

export interface TruncateOptions {
  /**
   * Keep only the last `keepLast` messages.
   */
  keepLast?: number;
  /**
   * Remove messages older than this date.
   */
  before?: Date;
}

export interface GetContextOptions {
  /**
   * Maximum number of messages to return (from the end).
   */
  limit?: number;
  /**
   * Only return messages created after this date.
   */
  since?: Date;
}

export interface MemoryStore {
  getConversation(conversationId: string): ConversationState | undefined;
  getOrCreateConversation(
    conversationId: string,
    metadata?: ConversationMetadata
  ): ConversationState;
  setConversationMetadata(
    conversationId: string,
    metadata: ConversationMetadata
  ): ConversationState;
  appendMessage(
    conversationId: string,
    role: Role,
    content: string,
    options?: AppendMessageOptions
  ): Message;
  appendMessages(
    conversationId: string,
    messages: Omit<Message, "id" | "createdAt">[],
    defaultMetadata?: MessageMetadata
  ): Message[];
  truncateConversation(
    conversationId: string,
    options: TruncateOptions
  ): ConversationState | undefined;
  getContext(
    conversationId: string,
    options?: GetContextOptions
  ): Message[] | undefined;
  deleteConversation(conversationId: string): boolean;
  listConversationIds(): string[];
  clear(): void;
  on(
    event: "conversationCreated" | "conversationUpdated" | "conversationDeleted",
    listener: (conversation: ConversationState) => void
  ): this;
  off(
    event: "conversationCreated" | "conversationUpdated" | "conversationDeleted",
    listener: (conversation: ConversationState) => void
  ): this;
}

type MemoryStoreEvents =
  | "conversationCreated"
  | "conversationUpdated"
  | "conversationDeleted";

export class InMemoryStore extends EventEmitter implements MemoryStore {
  private conversations: Map<string, ConversationState>;

  constructor() {
    super();
    this.conversations = new Map();
  }

  public getConversation(conversationId: string): ConversationState | undefined {
    return this.conversations.get(conversationId);
  }

  public getOrCreateConversation(
    conversationId: string,
    metadata?: ConversationMetadata
  ): ConversationState {
    const existing = this.conversations.get(conversationId);
    if (existing) {
      if (metadata && Object.keys(metadata).length > 0) {
        existing.metadata = { ...(existing.metadata ?? {}), ...metadata };
        existing.updatedAt = new Date();
        this.emitEvent("conversationUpdated", existing);
      }
      return existing;
    }

    const now = new Date();
    const conversation: ConversationState = {
      id: conversationId,
      messages: [],
      metadata: metadata ? { ...metadata } : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(conversationId, conversation);
    this.emitEvent("conversationCreated", conversation);
    return conversation;
  }

  public setConversationMetadata(
    conversationId: string,
    metadata: ConversationMetadata
  ): ConversationState {
    const conversation = this.getOrCreateConversation(conversationId);
    conversation.metadata = { ...(conversation.metadata ?? {}), ...metadata };
    conversation.updatedAt = new Date();
    this.emitEvent("conversationUpdated", conversation);
    return conversation;
  }

  public appendMessage(
    conversationId: string,
    role: Role,
    content: string,
    options?: AppendMessageOptions
  ): Message {
    const conversation = this.getOrCreateConversation(conversationId);
    const message: Message = {
      id: this.generateMessageId(conversation),
      role,
      content,
      createdAt: new Date(),
      metadata: options?.metadata ? { ...options.metadata } : undefined,
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    this.emitEvent("conversationUpdated", conversation);
    return message;
  }

  public appendMessages(
    conversationId: string,
    messages: Omit<Message, "id" | "createdAt">[],
    defaultMetadata?: MessageMetadata
  ): Message[] {
    const conversation = this.getOrCreateConversation(conversationId);
    const now = new Date();

    const appended: Message[] = messages.map((msg) => {
      const mergedMetadata: MessageMetadata | undefined =
        msg.metadata || defaultMetadata
          ? { ...(defaultMetadata ?? {}), ...(msg.metadata ?? {}) }
          : undefined;

      return {
        id: this.generateMessageId(conversation),
        role: msg.role,
        content: msg.content,
        createdAt: now,
        metadata: mergedMetadata,
      };
    });

    conversation.messages.push(...appended);
    conversation.updatedAt = new Date();
    this.emitEvent("conversationUpdated", conversation);
    return appended;
  }

  public truncateConversation(
    conversationId: string,
    options: TruncateOptions
  ): ConversationState | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;

    let messages = conversation.messages;

    if (options.before) {
      messages = messages.filter((m) => m.createdAt >= options.before!);
    }

    if (typeof options.keepLast === "number" && options.keepLast >= 0) {
      if (messages.length > options.keepLast) {
        messages = messages.slice(-options.keepLast);
      }
    }

    conversation.messages = messages;
    conversation.updatedAt = new Date();
    this.emitEvent("conversationUpdated", conversation);
    return conversation;
  }

  public getContext(
    conversationId: string,
    options?: GetContextOptions
  ): Message[] | undefined {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;

    let messages = conversation.messages;

    if (options?.since) {
      messages = messages.filter((m) => m.createdAt >= options.since!);
    }

    if (typeof options?.limit === "number" && options.limit >= 0) {
      if (messages.length > options.limit) {
        messages = messages.slice(-options.limit);
      }
    }

    return messages;
  }

  public deleteConversation(conversationId: string): boolean {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return false;

    const deleted = this.conversations.delete(conversationId);
    if (deleted) {
      this.emitEvent("conversationDeleted", conversation);
    }
    return deleted;
  }

  public listConversationIds(): string[] {
    return Array.from(this.conversations.keys());
  }

  public clear(): void {
    const all = Array.from(this.conversations.values());
    this.conversations.clear();
    for (const conv of all) {
      this.emitEvent("conversationDeleted", conv);
    }
  }

  public override on(
    event: MemoryStoreEvents,
    listener: (conversation: ConversationState) => void
  ): this {
    return super.on(event, listener);
  }

  public override off(
    event: MemoryStoreEvents,
    listener: (conversation: ConversationState) => void
  ): this {
    return super.off(event, listener);
  }

  private generateMessageId(conversation: ConversationState): string {
    const base = conversation.messages.length + 1;
    const timestamp = Date.now().toString(36);
    return `undefined-undefined-undefined`;
  }

  private emitEvent(event: MemoryStoreEvents, conversation: ConversationState): void {
    // Emit a shallow copy to avoid external mutation of internal state
    const cloned: ConversationState = {
      id: conversation.id,
      messages: [...conversation.messages],
      metadata: conversation.metadata ? { ...conversation.metadata } : undefined,
      createdAt: new Date(conversation.createdAt),
      updatedAt: new Date(conversation.updatedAt),
    };
    this.emit(event, cloned);
  }
}

const defaultStore = new InMemoryStore();

export const memoryStore: MemoryStore = defaultStore;