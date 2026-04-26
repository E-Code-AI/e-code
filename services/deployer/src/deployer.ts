import { detectApplication } from './detect.js';
import { CloudBuildDeployer } from './cloud-build.js';
import { CloudRunDeployer } from './cloud-run.js';
import { GcpRestClient } from './gcp.js';
import type { DeploymentRelease, DeploymentRequest } from './types.js';

export interface DeployerConfig {
  projectId: string;
  artifactRepository: string;
}

export class EcodeDeployer {
  private readonly gcp: GcpRestClient;
  private readonly builder: CloudBuildDeployer;
  private readonly cloudRun: CloudRunDeployer;

  constructor(private readonly config: DeployerConfig) {
    this.gcp = new GcpRestClient(config.projectId);
    this.builder = new CloudBuildDeployer(this.gcp, config.projectId, config.artifactRepository);
    this.cloudRun = new CloudRunDeployer(this.gcp);
  }

  async deploy(request: DeploymentRequest): Promise<DeploymentRelease> {
    const detection = await detectApplication(request.project);
    const build = await this.builder.startBuild(request, detection);
    const release = await this.cloudRun.deploy(request, build.image);
    return { ...release, buildId: build.id, kind: detection.kind };
  }

  async promote(region: string, serviceName: string, revision: string): Promise<void> {
    await this.cloudRun.setTraffic(region, serviceName, [{ revision, percent: 100 }]);
  }

  async rollback(region: string, serviceName: string, revision: string): Promise<void> {
    await this.cloudRun.rollback(region, serviceName, revision);
  }
}
