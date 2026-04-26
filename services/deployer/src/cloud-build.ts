import type { AppDetection, DeploymentRequest } from './types.js';
import { GcpRestClient } from './gcp.js';

export interface CloudBuildResult {
  id: string;
  image: string;
  logUrl?: string;
}

export class CloudBuildDeployer {
  constructor(
    private readonly gcp: GcpRestClient,
    private readonly projectId: string,
    private readonly artifactRepository: string,
  ) {}

  async startBuild(request: DeploymentRequest, detection: AppDetection): Promise<CloudBuildResult> {
    const image = this.gcp.artifactImage(request.region, this.artifactRepository, request.serviceName, request.project.commitSha);
    const sourcePath = `gs://${request.project.gcsBucket}/${request.project.gcsPrefix}`;
    const body = {
      source: {
        storageSource: {
          bucket: request.project.gcsBucket,
          object: `${request.project.gcsPrefix}.tar.gz`,
        },
      },
      substitutions: {
        _SOURCE_PATH: sourcePath,
        _IMAGE: image,
        _BUILD_COMMAND: detection.buildCommand,
      },
      images: [image],
      steps: [
        { name: 'gcr.io/cloud-builders/gcloud', args: ['storage', 'cp', '-r', '${_SOURCE_PATH}', '.'] },
        { name: 'gcr.io/cloud-builders/docker', args: ['build', '--cache-from', image, '-t', image, '-f', detection.dockerfilePath, '.'] },
        { name: 'gcr.io/cloud-builders/docker', args: ['push', image] },
      ],
      options: { logging: 'CLOUD_LOGGING_ONLY', machineType: 'E2_HIGHCPU_8' },
    };
    const result = await this.gcp.request<{ metadata?: { build?: { id: string; logUrl?: string } } }>(
      this.gcp.cloudBuildUrl('/builds'),
      { method: 'POST', body: JSON.stringify(body) },
    );
    const id = result.metadata?.build?.id ?? crypto.randomUUID();
    return { id, image, logUrl: result.metadata?.build?.logUrl };
  }
}
