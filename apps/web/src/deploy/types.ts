export type ReleaseStatus = 'queued' | 'building' | 'deploying' | 'ready' | 'failed' | 'rolled_back';

export interface DeployEnvironmentSecret {
  name: string;
  environment: 'dev' | 'preview' | 'production';
  secretManagerName: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  commitSha: string;
  author: string;
  status: ReleaseStatus;
  region: string;
  buildId?: string;
  imageSizeMb?: number;
  image?: string;
  revision?: string;
  previewUrl?: string;
  productionUrl?: string;
  createdAt: string;
  durationSec?: number;
}

export interface DeploymentProject {
  projectId: string;
  serviceName: string;
  region: string;
  freeDomain: string;
  customDomains: string[];
  secrets: DeployEnvironmentSecret[];
  releases: Release[];
}

export interface StartDeployRequest {
  projectId: string;
  serviceName: string;
  region: string;
  environment: 'preview' | 'production';
  envSecretNames: string[];
  domain?: string;
}
