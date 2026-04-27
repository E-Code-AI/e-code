export type CreationMethod = 'template' | 'git' | 'zip' | 'empty' | 'ai';

export type CloudRunRegion = 'us-central1' | 'europe-west1' | 'asia-northeast1';

export type ProjectVisibility = 'private' | 'unlisted' | 'public';

export type BootStage =
  | 'queued'
  | 'copying_files'
  | 'resolving_dependencies'
  | 'spawning_preview'
  | 'ready'
  | 'failed';

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  runtime: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author: string;
  previewImageUrl: string;
  popularity: number;
  updatedAt: string;
  recommendedExtensions: string[];
  envExample: Record<string, string>;
}

export interface InitialSecret {
  name: string;
  value: string;
  source: '.env.example' | 'manual';
}

export interface CreateProjectRequest {
  method: CreationMethod;
  name: string;
  visibility: ProjectVisibility;
  teamId?: string;
  region: CloudRunRegion;
  templateId?: string;
  gitUrl?: string;
  gitProvider?: 'github' | 'gitlab' | 'bitbucket';
  zipUploadId?: string;
  secrets: InitialSecret[];
  ecodeManifest?: Record<string, unknown>;
}

export interface CreateProjectResponse {
  projectId: string;
  workspaceUrl: string;
  bootSessionId: string;
  previewUrl?: string;
}

export interface BootEvent {
  stage: BootStage;
  message: string;
  at: string;
  progress: number;
  details?: Record<string, string | number | boolean>;
}

export interface GitStackDetection {
  framework: string;
  language: string;
  packageManager?: string;
  runtime: string;
  manifest: Record<string, unknown>;
  envKeys: string[];
}

export interface RecentlyUsedTemplate {
  templateId: string;
  usedAt: string;
}
