export type GeneratorStep = 'understanding' | 'stack' | 'architecture' | 'generation' | 'boot' | 'iterate';

export type GeneratorEventType =
  | 'spec_delta'
  | 'stack_options'
  | 'architecture_delta'
  | 'file_delta'
  | 'build_log'
  | 'correction_attempt'
  | 'boot_event'
  | 'ready'
  | 'failed';

export interface GeneratorAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  uploadUrl: string;
  objectKey: string;
}

export interface StructuredSpec {
  title: string;
  summary: string;
  roles: string[];
  features: string[];
  screens: Array<{ name: string; purpose: string }>;
  dataModel: Array<{ entity: string; fields: string[] }>;
}

export interface StackOption {
  id: string;
  label: string;
  templateId: string;
  reason: string;
  tradeoffs: string[];
  recommended: boolean;
}

export interface ArchitecturePlan {
  routes: string[];
  apiEndpoints: string[];
  databaseSchema: string;
  mermaid: string;
}

export interface GeneratedFileDelta {
  path: string;
  layer: 'db' | 'api' | 'ui' | 'tests' | 'docs' | 'infra';
  status: 'created' | 'updated' | 'deleted';
  contentDelta?: string;
}

export interface GeneratorEvent {
  type: GeneratorEventType;
  step: GeneratorStep;
  at: string;
  message: string;
  progress: number;
  spec?: StructuredSpec;
  stacks?: StackOption[];
  architecture?: ArchitecturePlan;
  file?: GeneratedFileDelta;
  previewUrl?: string;
  workspaceUrl?: string;
  commitSha?: string;
}

export interface StartGenerationRequest {
  description: string;
  attachmentObjectKeys: string[];
  preferredTemplateId?: string;
}

export interface StartGenerationResponse {
  generationId: string;
  draftSpec: StructuredSpec;
}

export interface ApproveSpecRequest {
  spec: StructuredSpec;
  selectedStackId: string;
  architecture: ArchitecturePlan;
}

export interface IterationRequest {
  prompt: string;
  generationId: string;
}
