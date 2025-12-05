import { readFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { encoding_for_model } from "@dqbd/tiktoken";
import OpenAI from "openai";

export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large";

export interface RagServiceConfig {
  openAIApiKey?: string;
  embeddingModel?: EmbeddingModel;
  maxChunkTokens?: number;
  chunkOverlapTokens?: number;
  maxRetrievedChunks?: number;
}

export interface DocumentMetadata {
  id: string;
  filename: string;
  mimeType?: string;
  uploadedAt: Date;
  [key: string]: unknown;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  embedding: number[];
  index: number;
  metadata: DocumentMetadata;
}

export interface RetrievedChunk {
  chunk: DocumentChunk;
  score: number;
}

export interface RagQueryResult {
  query: string;
  results: RetrievedChunk[];
}

interface InternalDocument {
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
}

const DEFAULT_MODEL: EmbeddingModel = "text-embedding-3-small";
const DEFAULT_MAX_CHUNK_TOKENS = 400;
const DEFAULT_CHUNK_OVERLAP_TOKENS = 40;
const DEFAULT_MAX_RETRIEVED_CHUNKS = 8;
const OPENAI_MODEL_FOR_ENCODING = "gpt-4o-mini";

export class RagService {
  private readonly openai?: OpenAI;
  private readonly embeddingModel: EmbeddingModel;
  private readonly maxChunkTokens: number;
  private readonly chunkOverlapTokens: number;
  private readonly maxRetrievedChunks: number;
  private readonly documents: Map<string, InternalDocument>;
  private readonly chunks: Map<string, DocumentChunk>;
  private readonly encoding = encoding_for_model(OPENAI_MODEL_FOR_ENCODING);

  constructor(config: RagServiceConfig = {}) {
    const apiKey = config.openAIApiKey ?? process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }

    this.embeddingModel = config.embeddingModel ?? DEFAULT_MODEL;
    this.maxChunkTokens = config.maxChunkTokens ?? DEFAULT_MAX_CHUNK_TOKENS;
    this.chunkOverlapTokens = config.chunkOverlapTokens ?? DEFAULT_CHUNK_OVERLAP_TOKENS;
    this.maxRetrievedChunks = config.maxRetrievedChunks ?? DEFAULT_MAX_RETRIEVED_CHUNKS;

    this.documents = new Map();
    this.chunks = new Map();
  }

  public async addDocumentFromFile(
    filePath: string,
    mimeType?: string,
    extraMetadata: Record<string, unknown> = {}
  ): Promise<DocumentMetadata> {
    const absolutePath = path.resolve(filePath);
    const buffer = await readFile(absolutePath);
    const filename = path.basename(absolutePath);
    const text = buffer.toString("utf8");

    return this.addDocumentFromText(text, {
      filename,
      mimeType,
      ...extraMetadata,
    });
  }

  public async addDocumentFromText(
    text: string,
    metadata: Partial<Omit<DocumentMetadata, "id" | "uploadedAt">> = {}
  ): Promise<DocumentMetadata> {
    if (!this.openai) {
      throw new Error("OpenAI client not configured. Set OPENAI_API_KEY or pass openAIApiKey.");
    }

    const documentId = this.generateId("doc");
    const baseMetadata: DocumentMetadata = {
      id: documentId,
      filename: metadata.filename ?? `undefined.txt`,
      mimeType: metadata.mimeType ?? "text/plain",
      uploadedAt: new Date(),
      ...metadata,
    };

    const chunksText = this.chunkText(text);
    const embeddings = await this.embedTexts(chunksText);

    const chunks: DocumentChunk[] = chunksText.map((chunkText, index) => {
      const id = this.generateId("chunk");
      const chunk: DocumentChunk = {
        id,
        documentId,
        text: chunkText,
        embedding: embeddings[index],
        index,
        metadata: baseMetadata,
      };
      this.chunks.set(id, chunk);
      return chunk;
    });

    this.documents.set(documentId, {
      metadata: baseMetadata,
      chunks,
    });

    return baseMetadata;
  }

  public getDocument(documentId: string): InternalDocument | undefined {
    return this.documents.get(documentId);
  }

  public listDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values()).map((doc) => doc.metadata);
  }

  public deleteDocument(documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc) return false;

    for (const chunk of doc.chunks) {
      this.chunks.delete(chunk.id);
    }
    this.documents.delete(documentId);
    return true;
  }

  public clearAll(): void {
    this.documents.clear();
    this.chunks.clear();
  }

  public async query(query: string, options?: { maxResults?: number }): Promise<RagQueryResult> {
    if (!this.openai) {
      throw new Error("OpenAI client not configured. Set OPENAI_API_KEY or pass openAIApiKey.");
    }

    const maxResults = options?.maxResults ?? this.maxRetrievedChunks;
    if (this.chunks.size === 0) {
      return { query, results: [] };
    }

    const [queryEmbedding] = await this.embedTexts([query]);
    const scored: RetrievedChunk[] = [];

    for (const chunk of this.chunks.values()) {
      const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, maxResults);

    return {
      query,
      results: top,
    };
  }

  private chunkText(text: string): string[] {
    const tokens = this.encoding.encode(text);
    if (tokens.length <= this.maxChunkTokens) {
      return [text.trim()];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + this.maxChunkTokens, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      const chunkText = this.encoding.decode(chunkTokens).trim();
      if (chunkText.length > 0) {
        chunks.push(chunkText);
      }
      if (end === tokens.length) break;
      start = end - this.chunkOverlapTokens;
      if (start < 0) start = 0;
    }

    return chunks;
  }

  private async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error("OpenAI client not configured. Set OPENAI_API_KEY or pass openAIApiKey.");
    }

    if (texts.length === 0) return [];

    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: texts,
    });

    if (!response.data || response.data.length !== texts.length) {
      throw new Error("Embedding API returned unexpected number of embeddings.");
    }

    return response.data.map((item) => item.embedding as number[]);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embedding vectors must have the same length for cosine similarity.");
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i += 1) {
      const va = a[i];
      const vb = b[i];
      dot += va * vb;
      normA += va * va;
      normB += vb * vb;
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private generateId(prefix: string): string {
    const random = crypto.randomBytes(16).toString("hex");
    return `undefined_undefined`;
  }
}

export default RagService;