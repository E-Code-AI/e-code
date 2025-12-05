import { randomUUID } from "crypto";

export interface VectorStoreDocumentMetadata {
  [key: string]: string | number | boolean | null;
}

export interface VectorStoreDocument {
  id: string;
  embedding: number[];
  content: string;
  metadata?: VectorStoreDocumentMetadata;
}

export interface SimilaritySearchResult extends VectorStoreDocument {
  score: number;
}

export interface VectorStore {
  upsert(documents: VectorStoreDocument[]): Promise<void>;
  similaritySearch(
    queryEmbedding: number[],
    k: number,
    filter?: (metadata: VectorStoreDocumentMetadata | undefined) => boolean
  ): Promise<SimilaritySearchResult[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface InMemoryVectorStoreOptions {
  /**
   * If true, embeddings will be normalized to unit length on upsert.
   * This can make cosine similarity equivalent to dot product and
   * improve numerical stability.
   */
  normalizeEmbeddings?: boolean;
  /**
   * Optional maximum number of documents to keep in memory.
   * If exceeded, oldest documents will be removed (FIFO).
   */
  maxDocuments?: number;
}

export class InMemoryVectorStore implements VectorStore {
  private documents: Map<string, VectorStoreDocument>;
  private options: Required<InMemoryVectorStoreOptions>;

  constructor(options?: InMemoryVectorStoreOptions) {
    this.documents = new Map();
    this.options = {
      normalizeEmbeddings: options?.normalizeEmbeddings ?? true,
      maxDocuments: options?.maxDocuments ?? Number.POSITIVE_INFINITY,
    };
  }

  public async upsert(documents: VectorStoreDocument[]): Promise<void> {
    for (const doc of documents) {
      const id = doc.id || randomUUID();
      const embedding = this.options.normalizeEmbeddings
        ? this.normalizeEmbedding(doc.embedding)
        : [...doc.embedding];

      const storedDoc: VectorStoreDocument = {
        id,
        embedding,
        content: doc.content,
        metadata: doc.metadata ? { ...doc.metadata } : undefined,
      };

      this.documents.set(id, storedDoc);
    }

    this.enforceMaxDocuments();
  }

  public async similaritySearch(
    queryEmbedding: number[],
    k: number,
    filter?: (metadata: VectorStoreDocumentMetadata | undefined) => boolean
  ): Promise<SimilaritySearchResult[]> {
    if (k <= 0) {
      return [];
    }

    const normalizedQuery = this.options.normalizeEmbeddings
      ? this.normalizeEmbedding(queryEmbedding)
      : [...queryEmbedding];

    const results: SimilaritySearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (filter && !filter(doc.metadata)) {
        continue;
      }

      const score = this.cosineSimilarity(normalizedQuery, doc.embedding);
      results.push({
        ...doc,
        score,
      });
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, Math.min(k, results.length));
  }

  public async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  public async clear(): Promise<void> {
    this.documents.clear();
  }

  private enforceMaxDocuments(): void {
    const { maxDocuments } = this.options;
    if (!Number.isFinite(maxDocuments)) {
      return;
    }

    while (this.documents.size > maxDocuments) {
      const oldestKey = this.documents.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.documents.delete(oldestKey);
    }
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) {
      return embedding.map(() => 0);
    }
    return embedding.map((v) => v / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embedding dimension mismatch in cosineSimilarity");
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const av = a[i];
      const bv = b[i];
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export function createVectorStore(
  backend: "in-memory" = "in-memory",
  options?: InMemoryVectorStoreOptions
): VectorStore {
  switch (backend) {
    case "in-memory":
      return new InMemoryVectorStore(options);
    default:
      throw new Error(`Unsupported vector store backend: undefined`);
  }
}