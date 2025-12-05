export type UUID = string;

export type ISODateString = string;

export type MimeType =
  | 'text/plain'
  | 'text/markdown'
  | 'text/html'
  | 'application/pdf'
  | 'application/json'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'video/mp4'
  | string;

export type EmbeddingVector = number[];

export interface BaseMetadata {
  source?: string;
  sourceType?: 'file' | 'url' | 'manual' | 'api' | 'synthetic';
  title?: string;
  author?: string;
  language?: string;
  tags?: string[];
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
  [key: string]: unknown;
}

export interface DocumentMetadata extends BaseMetadata {
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: MimeType;
  pageCount?: number;
  collection?: string;
  topic?: string;
  version?: string;
  externalId?: string;
}

export interface ChunkMetadata extends BaseMetadata {
  documentId: UUID;
  documentTitle?: string;
  documentSource?: string;
  documentExternalId?: string;
  chunkIndex: number;
  chunkCount?: number;
  pageNumber?: number;
  section?: string;
  subsection?: string;
  heading?: string;
  tokenCount?: number;
  charStart?: number;
  charEnd?: number;
  isTitleChunk?: boolean;
  isSummaryChunk?: boolean;
}

export interface EmbeddingMetadata extends ChunkMetadata {
  embeddingModel?: string;
  embeddingDimensions?: number;
  embeddingCreatedAt?: ISODateString;
}

export interface RagDocument {
  id: UUID;
  collectionId?: UUID;
  externalId?: string;
  title?: string;
  content: string;
  mimeType?: MimeType;
  metadata?: DocumentMetadata;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface RagChunk {
  id: UUID;
  documentId: UUID;
  content: string;
  metadata: ChunkMetadata;
  embedding?: EmbeddingVector;
  embeddingMetadata?: EmbeddingMetadata;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface EmbeddingRecord {
  id: UUID;
  chunkId: UUID;
  documentId: UUID;
  vector: EmbeddingVector;
  dimensions: number;
  model: string;
  createdAt: ISODateString;
  metadata: EmbeddingMetadata;
}

export interface UploadDocumentRequest {
  collectionId?: UUID;
  externalId?: string;
  title?: string;
  content: string;
  mimeType?: MimeType;
  metadata?: DocumentMetadata;
  chunk?: {
    maxChunkSize?: number;
    overlap?: number;
    strategy?: 'recursive' | 'sentence' | 'token' | 'page';
  };
  embed?: boolean;
  embeddingModel?: string;
}

export interface UploadDocumentResponse {
  document: RagDocument;
  chunks: RagChunk[];
  embeddingsCreated: boolean;
}

export interface BulkUploadDocumentRequest {
  documents: UploadDocumentRequest[];
}

export interface BulkUploadDocumentResultItem {
  requestIndex: number;
  success: boolean;
  document?: RagDocument;
  chunks?: RagChunk[];
  embeddingsCreated?: boolean;
  error?: string;
}

export interface BulkUploadDocumentResponse {
  results: BulkUploadDocumentResultItem[];
  successCount: number;
  failureCount: number;
}

export interface DeleteDocumentResponse {
  documentId: UUID;
  deletedChunks: number;
  deletedEmbeddings: number;
}

export interface RagQueryFilter {
  documentIds?: UUID[];
  collectionIds?: UUID[];
  externalIds?: string[];
  mimeTypes?: MimeType[];
  sourceTypes?: BaseMetadata['sourceType'][];
  tagsAny?: string[];
  tagsAll?: string[];
  createdAfter?: ISODateString;
  createdBefore?: ISODateString;
  updatedAfter?: ISODateString;
  updatedBefore?: ISODateString;
  metadataEquals?: Record<string, unknown>;
  metadataContains?: Record<string, unknown>;
}

export interface RagQueryRequest {
  query: string;
  topK?: number;
  minScore?: number;
  filter?: RagQueryFilter;
  embeddingModel?: string;
  withEmbeddings?: boolean;
  withDocument?: boolean;
  withHighlights?: boolean;
  highlightOptions?: {
    maxSnippets?: number;
    snippetRadius?: number;
  };
}

export interface RagQueryEmbeddingRequest {
  embedding: EmbeddingVector;
  topK?: number;
  minScore?: number;
  filter?: RagQueryFilter;
  withEmbeddings?: boolean;
  withDocument?: boolean;
  withHighlights?: boolean;
  highlightOptions?: {
    maxSnippets?: number;
    snippetRadius?: number;
  };
}

export interface HighlightSnippet {
  text: string;
  start: number;
  end: number;
  score: number;
}

export interface RetrievedChunk {
  chunk: RagChunk;
  score: number;
  rank: number;
  document?: RagDocument;
  highlights?: HighlightSnippet[];
}

export interface RagQueryResult {
  query: string;
  results: RetrievedChunk[];
  usedEmbeddingModel?: string;
  totalResults: number;
  processingTimeMs?: number;
}

export interface RagQueryError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface RagRetrievalResponse {
  ok: boolean;
  data?: RagQueryResult;
  error?: RagQueryError;
}

export interface RagCollection {
  id: UUID;
  name: string;
  description?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  metadata?: Record<string, unknown>;
}

export interface ListDocumentsRequest {
  collectionId?: UUID;
  limit?: number;
  offset?: number;
  filter?: RagQueryFilter;
}

export interface ListDocumentsResponse {
  documents: RagDocument[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListChunksRequest {
  documentId?: UUID;
  collectionId?: UUID;
  limit?: number;
  offset?: number;
}

export interface ListChunksResponse {
  chunks: RagChunk[];
  total: number;
  limit: number;
  offset: number;
}

export type RagUploadResponse =
  | UploadDocumentResponse
  | BulkUploadDocumentResponse;

export type RagRetrievalRequest =
  | RagQueryRequest
  | RagQueryEmbeddingRequest;