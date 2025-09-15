export interface ImportOptions {
  projectId: number;
  userId: number;
  url?: string;
  data?: any;
  metadata?: Record<string, any>;
}

export interface ImportProgress {
  stage: string;
  progress: number; // 0-100
  message: string;
  timestamp: Date;
}

export interface ImportResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: ImportProgress[];
  metadata: Record<string, any>;
  filesCreated?: number;
  assetsCreated?: number;
  error?: string;
}

export interface ImportAdapter {
  /**
   * Prepare import by validating inputs and checking prerequisites
   */
  prepare(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }>;
  
  /**
   * Validate the source data/URL before processing
   */
  validate(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }>;
  
  /**
   * Perform the actual import operation
   */
  import(options: ImportOptions): Promise<ImportResult>;
  
  /**
   * Report progress during import
   */
  reportProgress(importId: string, progress: ImportProgress): Promise<void>;
  
  /**
   * Get import type identifier
   */
  getType(): string;
}

export interface FigmaImportOptions extends ImportOptions {
  figmaUrl: string;
  figmaToken?: string;
  componentsOnly?: boolean;
  exportImages?: boolean;
  imageScale?: 1 | 2;
}

export interface BoltImportOptions extends ImportOptions {
  boltUrl?: string;
  boltProjectData?: any;
  zipFile?: Buffer;
}

export interface GitHubImportOptions extends ImportOptions {
  githubUrl: string;
  branch?: string;
  subdirectory?: string;
  token?: string;
  includeHistory?: boolean;
  handleLFS?: boolean;
}

export interface ImportTelemetry {
  importType: string;
  success: boolean;
  duration: number;
  artifactCounts: {
    files: number;
    assets: number;
    components: number;
  };
  error?: string;
  metadata?: Record<string, any>;
}