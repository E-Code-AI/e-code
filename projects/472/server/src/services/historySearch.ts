import { isBefore, isAfter, parseISO } from 'date-fns';

export type HistoryMessage = {
  id: string;
  conversationId: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO string
  tags?: string[];
};

export type HistorySearchQuery = {
  text?: string;
  tags?: string[];
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  conversationId?: string;
  authorId?: string;
  limit?: number;
  offset?: number;
};

export type HistorySearchResult = {
  items: HistoryMessage[];
  total: number;
};

export interface HistorySearchIndex {
  addMessage(message: HistoryMessage): void;
  addMessages(messages: HistoryMessage[]): void;
  removeMessage(messageId: string): void;
  clear(): void;
  search(query: HistorySearchQuery): HistorySearchResult;
}

type TokenIndex = Map<string, Set<string>>;
type TagIndex = Map<string, Set<string>>;
type MessageStore = Map<string, HistoryMessage>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized.split(' ');
}

function safeParseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
}

function isWithinDateRange(
  createdAt: string,
  startDate?: string,
  endDate?: string
): boolean {
  const created = safeParseDate(createdAt);
  if (!created) return false;

  const start = safeParseDate(startDate);
  const end = safeParseDate(endDate);

  if (start && isBefore(created, start)) return false;
  if (end && isAfter(created, end)) return false;

  return true;
}

function intersectSets<T>(sets: Set<T>[]): Set<T> {
  if (sets.length === 0) return new Set<T>();
  if (sets.length === 1) return new Set<T>(sets[0]);

  const sorted = [...sets].sort((a, b) => a.size - b.size);
  const [smallest, ...rest] = sorted;
  const result = new Set<T>();

  for (const value of smallest) {
    if (rest.every(set => set.has(value))) {
      result.add(value);
    }
  }

  return result;
}

function unionSets<T>(sets: Set<T>[]): Set<T> {
  const result = new Set<T>();
  for (const set of sets) {
    for (const value of set) {
      result.add(value);
    }
  }
  return result;
}

function scoreMessage(
  message: HistoryMessage,
  queryTokens: string[],
  tagFilter?: string[]
): number {
  let score = 0;

  if (queryTokens.length > 0) {
    const text = normalizeText(message.text);
    const textTokens = new Set(tokenize(text));
    for (const token of queryTokens) {
      if (textTokens.has(token)) {
        score += 2;
      }
    }
  }

  if (tagFilter && tagFilter.length > 0 && message.tags && message.tags.length > 0) {
    const messageTags = new Set(message.tags.map(t => t.toLowerCase()));
    for (const tag of tagFilter) {
      if (messageTags.has(tag.toLowerCase())) {
        score += 1;
      }
    }
  }

  return score;
}

export class InMemoryHistorySearchIndex implements HistorySearchIndex {
  private messages: MessageStore;
  private tokenIndex: TokenIndex;
  private tagIndex: TagIndex;

  constructor(initialMessages?: HistoryMessage[]) {
    this.messages = new Map();
    this.tokenIndex = new Map();
    this.tagIndex = new Map();

    if (initialMessages && initialMessages.length > 0) {
      this.addMessages(initialMessages);
    }
  }

  addMessage(message: HistoryMessage): void {
    if (!message.id) {
      throw new Error('Message must have an id');
    }

    const existing = this.messages.get(message.id);
    if (existing) {
      this.removeMessage(message.id);
    }

    this.messages.set(message.id, message);

    const tokens = tokenize(message.text);
    for (const token of tokens) {
      if (!this.tokenIndex.has(token)) {
        this.tokenIndex.set(token, new Set());
      }
      this.tokenIndex.get(token)!.add(message.id);
    }

    if (message.tags && message.tags.length > 0) {
      for (const tag of message.tags) {
        const normalizedTag = tag.toLowerCase();
        if (!this.tagIndex.has(normalizedTag)) {
          this.tagIndex.set(normalizedTag, new Set());
        }
        this.tagIndex.get(normalizedTag)!.add(message.id);
      }
    }
  }

  addMessages(messages: HistoryMessage[]): void {
    for (const message of messages) {
      this.addMessage(message);
    }
  }

  removeMessage(messageId: string): void {
    const message = this.messages.get(messageId);
    if (!message) return;

    const tokens = tokenize(message.text);
    for (const token of tokens) {
      const set = this.tokenIndex.get(token);
      if (!set) continue;
      set.delete(messageId);
      if (set.size === 0) {
        this.tokenIndex.delete(token);
      }
    }

    if (message.tags && message.tags.length > 0) {
      for (const tag of message.tags) {
        const normalizedTag = tag.toLowerCase();
        const set = this.tagIndex.get(normalizedTag);
        if (!set) continue;
        set.delete(messageId);
        if (set.size === 0) {
          this.tagIndex.delete(normalizedTag);
        }
      }
    }

    this.messages.delete(messageId);
  }

  clear(): void {
    this.messages.clear();
    this.tokenIndex.clear();
    this.tagIndex.clear();
  }

  search(query: HistorySearchQuery): HistorySearchResult {
    const {
      text,
      tags,
      startDate,
      endDate,
      conversationId,
      authorId,
      limit = DEFAULT_LIMIT,
      offset = 0,
    } = query;

    const normalizedLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const normalizedOffset = Math.max(offset, 0);

    const queryTokens = text ? tokenize(text) : [];

    let candidateIds: Set<string> | null = null;

    if (queryTokens.length > 0) {
      const tokenSets: Set<string>[] = [];
      for (const token of queryTokens) {
        const set = this.tokenIndex.get(token);
        if (set) {
          tokenSets.push(set);
        }
      }

      if (tokenSets.length === 0) {
        return { items: [], total: 0 };
      }

      candidateIds = intersectSets(tokenSets);
    }

    if (tags && tags.length > 0) {
      const tagSets: Set<string>[] = [];
      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase();
        const set = this.tagIndex.get(normalizedTag);
        if (set) {
          tagSets.push(set);
        }
      }

      if (tagSets.length === 0) {
        return { items: [], total: 0 };
      }

      const tagCandidates = unionSets(tagSets);

      if (candidateIds === null) {
        candidateIds = tagCandidates;
      } else {
        candidateIds = intersectSets([candidateIds, tagCandidates]);
      }
    }

    let candidates: HistoryMessage[];

    if (candidateIds === null) {
      candidates = Array.from(this.messages.values());
    } else {
      candidates = Array.from(candidateIds)
        .map(id => this.messages.get(id))
        .filter((m): m is HistoryMessage => Boolean(m));
    }

    const filtered = candidates.filter(message => {
      if (!isWithinDateRange(message.createdAt, startDate, endDate)) {
        return false;
      }

      if (conversationId && message.conversationId !== conversationId) {
        return false;
      }

      if (authorId && message.authorId !== authorId) {
        return false;
      }

      if (tags && tags.length > 0) {
        const messageTags = new Set(
          (message.tags || []).map(t => t.toLowerCase())
        );
        const hasAnyTag = tags.some(tag =>
          messageTags.has(tag.toLowerCase())
        );
        if (!hasAnyTag) {
          return false;
        }
      }

      return true;
    });

    const scored = filtered.map(message => ({
      message,
      score: scoreMessage(message, queryTokens, tags),
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDate = safeParseDate(a.message.createdAt)?.getTime() ?? 0;
      const bDate =