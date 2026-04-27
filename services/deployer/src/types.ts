export type DeploymentKind = 'static' | 'cloud-run' | 'cloud-run-cpu-always' | 'multi-region-cloud-run';

export type DeploymentStatus = 'queued' | 'building' | 'deploying' | 'ready' | 'failed' | 'rolled_back';

export interface ProjectSource {
  projectId: string;
  gcsBucket: string;
  gcsPrefix: string;
  commitSha: string;
}

export interface DeploymentRequest {
  project: ProjectSource;
  serviceName: string;
  region: string;
  environment: 'preview' | 'production';
  domain?: string;
  envSecretNames: string[];
  minInstances?: number;
  cpuAlwaysAllocated?: boolean;
}

export interface AppDetection {
  kind: DeploymentKind;
  runtime: string;
  buildCommand: string;
  startCommand: string;
  outputDir?: string;
  ports: number[];
  dockerfilePath: string;
}

export interface DeploymentRelease {
  id: string;
  serviceName: string;
  region: string;
  status: DeploymentStatus;
  kind: DeploymentKind;
  buildId?: string;
  image?: string;
  revision?: string;
  url?: string;
  commitSha: string;
  createdAt: string;
}

export interface TrafficTarget {
  revision: string;
  percent: number;
}
