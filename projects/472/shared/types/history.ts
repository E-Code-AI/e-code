/* eslint-disable @typescript-eslint/no-explicit-any */

export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'hi'
  | 'bn'
  | 'tr'
  | 'nl'
  | 'sv'
  | 'no'
  | 'da'
  | 'fi'
  | 'pl'
  | 'cs'
  | 'el'
  | 'he'
  | 'id'
  | 'ms'
  | 'th'
  | 'vi'
  | 'uk'
  | 'ro'
  | 'hu'
  | 'sk'
  | 'sl'
  | 'bg'
  | 'hr'
  | 'sr'
  | 'lt'
  | 'lv'
  | 'et'
  | 'fa'
  | 'ur'
  | 'other';

export type HistoryRole = 'user' | 'assistant' | 'system';

export interface HistoryMessageBase {
  id: string;
  role: HistoryRole;
  content: string;
  createdAt: string;
  updatedAt?: string;
  language?: LanguageCode;
  tokens?: number;
  metadata?: Record<string, any>;
}

export interface HistoryUserMessage extends HistoryMessageBase {
  role: 'user';
  inputLanguage?: LanguageCode;
}

export interface HistoryAssistantMessage extends HistoryMessageBase {
  role: 'assistant';
  model?: string;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  responseTimeMs?: number;
}

export interface HistorySystemMessage extends HistoryMessageBase {
  role: 'system';
  source?: 'default' | 'user' | 'system';
}

export type HistoryMessage =
  | HistoryUserMessage
  | HistoryAssistantMessage
  | HistorySystemMessage;

export type HistoryMessageRoleMap = {
  [R in HistoryRole]: Extract<HistoryMessage, { role: R }>;
};

export interface HistoryTag {
  id: string;
  label: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export type HistoryVisibility = 'private' | 'shared' | 'public' | 'archived';

export interface HistoryTitle {
  text: string;
  language?: LanguageCode;
  generated?: boolean;
  generatedAt?: string;
  model?: string;
}

export interface HistorySummary {
  text: string;
  language?: LanguageCode;
  generatedAt: string;
  model?: string;
  tokens?: number;
}

export interface HistorySearchIndexEntry {
  id: string;
  conversationId: string;
  messageId?: string;
  title?: string;
  content: string;
  language?: LanguageCode;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  embeddingVectorId?: string;
  termFrequency?: Record<string, number>;
  fieldBoosts?: {
    title?: number;
    content?: number;
    tags?: number;
  };
  metadata?: Record<string, any>;
}

export interface HistorySearchIndex {
  byId: Record<string, HistorySearchIndexEntry>;
  byConversationId: Record<string, string[]>;
  byTagId: Record<string, string[]>;
  byLanguage: Record<LanguageCode, string[]>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HistoryConversationIndexEntry {
  id: string;
  title: string;
  language?: LanguageCode;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  tags: string[];
  visibility: HistoryVisibility;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface HistoryConversationIndex {
  byId: Record<string, HistoryConversationIndexEntry>;
  allIds: string[];
  byTagId: Record<string, string[]>;
  byLanguage: Record<LanguageCode, string[]>;
  pinnedIds: string[];
  archivedIds: string[];
  deletedIds: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HistoryConversation {
  id: string;
  title: HistoryTitle;
  language?: LanguageCode;
  messages: HistoryMessage[];
  tags: HistoryTag[];
  visibility: HistoryVisibility;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  summary?: HistorySummary;
  metadata?: Record<string, any>;
}

export interface HistoryStoreSnapshot {
  conversations: Record<string, HistoryConversation>;
  conversationIndex: HistoryConversationIndex;
  searchIndex: HistorySearchIndex;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HistorySearchFilters {
  query?: string;
  tagIds?: string[];
  language?: LanguageCode | LanguageCode[];
  visibility?: HistoryVisibility | HistoryVisibility[];
  dateFrom?: string;
  dateTo?: string;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface HistorySearchResultItem {
  conversationId: string;
  messageId?: string;
  score: number;
  snippet?: string;
  matchedFields?: ('title' | 'content' | 'tags')[];
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  language?: LanguageCode;
}

export interface HistorySearchResult {
  items: HistorySearchResultItem[];
  total: number;
  limit: number;
  offset: number;
  query: string;
  filters?: HistorySearchFilters;
  tookMs?: number;
}

export interface HistoryCreateConversationInput {
  title?: string;
  language?: LanguageCode;
  tags?: string[];
  visibility?: HistoryVisibility;
  metadata?: Record<string, any>;
}

export interface HistoryAppendMessageInput {
  conversationId: string;
  message: Omit<HistoryMessage, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface HistoryUpdateConversationInput {
  id: string;
  title?: string;
  language?: LanguageCode;
  tags?: string[];
  visibility?: HistoryVisibility;
  pinned?: boolean;
  archived?: boolean;
  deleted?: boolean;
  metadata?: Record<string, any>;
}

export interface HistoryTagIndex {
  byId: Record<string, HistoryTag>;
  byLabelLower: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HistoryState {
  conversations: Record<string, HistoryConversation>;
  conversationIndex: HistoryConversationIndex;
  searchIndex: HistorySearchIndex;
  tagIndex: HistoryTagIndex;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type HistoryEntityType =
  | 'conversation'
  | 'message'
  | 'tag'
  | 'searchIndex'
  | 'conversationIndex';

export interface HistoryAuditEntry {
  id: string;
  entityType: HistoryEntityType;
  entityId: string;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'restore'
    | 'archive'
    | 'unarchive'
    | 'pin'
    | 'unpin';
  timestamp: string;
  userId?: string;
  changes?: Record<string, { oldValue: any; newValue: any }>;
  metadata?: Record<string, any>;
}

export interface HistoryAuditLog {
  entries: HistoryAuditEntry[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface HistoryExportPayload {
  state: HistoryState;
  auditLog?: HistoryAuditLog;
  exportedAt: string;
  formatVersion: number;
}

export interface HistoryImportResult {
  state: HistoryState;
  auditLog?: HistoryAuditLog;
  importedAt: string;
  source?: string;
}

export type HistoryIdGenerator = () => string;

export interface HistoryIndexingConfig {
  enableEmbeddings?: boolean;
  maxIndexedMessagesPerConversation?: number;
  maxContentLength?: number;
  languageDetectionEnabled?: boolean;
}

export interface HistorySearchOptions {
  useEmbeddings?: boolean;
  fuzzy?: boolean;
  prefix?: boolean;
  highlight?: boolean;
  maxResults?: number;
}