/* eslint-disable @typescript-eslint/no-explicit-any */

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export enum ChatRoleEnum {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
  Tool = 'tool',
}

export interface BaseChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string; // ISO 8601
  metadata?: Record<string, any>;
}

export interface SystemChatMessage extends BaseChatMessage {
  role: 'system';
}

export interface UserChatMessage extends BaseChatMessage {
  role: 'user';
  userId?: string;
  name?: string;
}

export interface AssistantChatMessage extends BaseChatMessage {
  role: 'assistant';
  model?: string;
  finishReason?: ChatFinishReason;
}

export interface ToolChatMessage extends BaseChatMessage {
  role: 'tool';
  toolName: string;
  toolCallId: string;
}

export type ChatMessage =
  | SystemChatMessage
  | UserChatMessage
  | AssistantChatMessage
  | ToolChatMessage;

export enum ChatFinishReason {
  Stop = 'stop',
  Length = 'length',
  ContentFilter = 'content_filter',
  ToolCalls = 'tool_calls',
  Error = 'error',
}

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ChatToolResult {
  id: string;
  name: string;
  result: any;
  error?: string;
}

export interface ChatConversation {
  id: string;
  title?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  userId?: string;
  messages: ChatMessage[];
  metadata?: Record<string, any>;
}

export interface ChatRequestOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  tools?: ChatToolDefinition[];
  toolChoice?: 'auto' | 'none' | { name: string };
  metadata?: Record<string, any>;
}

export interface ChatToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'integer';
  description?: string;
  enum?: string[];
  items?: ChatToolParameter;
  properties?: Record<string, ChatToolParameter>;
  required?: string[];
}

export interface ChatToolDefinition {
  name: string;
  description?: string;
  parameters?: ChatToolParameter;
}

export interface ChatCompletionRequest {
  conversationId?: string;
  messages: ChatMessage[];
  options: ChatRequestOptions;
}

export interface ChatCompletionResponse {
  conversationId: string;
  message: AssistantChatMessage;
  usage?: ChatUsage;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export enum ChatStreamEventType {
  MessageStart = 'message_start',
  MessageDelta = 'message_delta',
  MessageComplete = 'message_complete',
  Error = 'error',
  ToolCall = 'tool_call',
  ToolResult = 'tool_result',
  Usage = 'usage',
}

export interface ChatStreamBaseEvent {
  id: string;
  type: ChatStreamEventType;
  conversationId: string;
  createdAt: string; // ISO 8601
}

export interface ChatStreamMessageStartEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.MessageStart;
  message: Omit<AssistantChatMessage, 'content'> & { content: string };
}

export interface ChatStreamMessageDeltaEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.MessageDelta;
  delta: {
    content?: string;
    finishReason?: ChatFinishReason | null;
    metadata?: Record<string, any>;
  };
}

export interface ChatStreamMessageCompleteEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.MessageComplete;
  message: AssistantChatMessage;
}

export interface ChatStreamErrorEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.Error;
  error: {
    code?: string;
    message: string;
    details?: any;
  };
}

export interface ChatStreamToolCallEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.ToolCall;
  toolCall: ChatToolCall;
}

export interface ChatStreamToolResultEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.ToolResult;
  toolResult: ChatToolResult;
}

export interface ChatStreamUsageEvent extends ChatStreamBaseEvent {
  type: ChatStreamEventType.Usage;
  usage: ChatUsage;
}

export type ChatStreamEvent =
  | ChatStreamMessageStartEvent
  | ChatStreamMessageDeltaEvent
  | ChatStreamMessageCompleteEvent
  | ChatStreamErrorEvent
  | ChatStreamToolCallEvent
  | ChatStreamToolResultEvent
  | ChatStreamUsageEvent;

export interface ServerSentEventEnvelope<T = any> {
  event: string;
  data: T;
}

export interface ChatStreamServerEvent
  extends ServerSentEventEnvelope<ChatStreamEvent> {}

export interface ChatClientEventHandlers {
  onMessageStart?: (event: ChatStreamMessageStartEvent) => void;
  onMessageDelta?: (event: ChatStreamMessageDeltaEvent) => void;
  onMessageComplete?: (event: ChatStreamMessageCompleteEvent) => void;
  onError?: (event: ChatStreamErrorEvent) => void;
  onToolCall?: (event: ChatStreamToolCallEvent) => void;
  onToolResult?: (event: ChatStreamToolResultEvent) => void;
  onUsage?: (event: ChatStreamUsageEvent) => void;
  onAnyEvent?: (event: ChatStreamEvent) => void;
}

export interface ChatClientStreamConfig {
  conversationId?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  handlers: ChatClientEventHandlers;
}

export type ChatMessageWithoutId = Omit<BaseChatMessage, 'id' | 'createdAt'>;

export interface CreateChatMessageInput {
  role: ChatRole;
  content: string;
  metadata?: Record<string, any>;
}

export interface PaginatedConversations {
  items: ChatConversation[];
  nextCursor?: string;
  prevCursor?: string;
  total?: number;
}

export interface ListConversationsQuery {
  userId?: string;
  limit?: number;
  cursor?: string;
  metadata?: Record<string, any>;
}