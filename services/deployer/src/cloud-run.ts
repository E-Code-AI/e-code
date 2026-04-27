import type { DeploymentRelease, DeploymentRequest, TrafficTarget } from './types.js';
import { GcpRestClient } from './gcp.js';

export class CloudRunDeployer {
  constructor(private readonly gcp: GcpRestClient) {}

  async deploy(request: DeploymentRequest, image: string): Promise<DeploymentRelease> {
    const serviceBody = {
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      metadata: {
        name: request.serviceName,
        annotations: {
          'run.googleapis.com/ingress': 'all',
          'run.googleapis.com/launch-stage': 'GA',
        },
      },
      spec: {
        template: {
          metadata: {
            annotations: {
              'autoscaling.knative.dev/minScale': String(request.minInstances ?? 0),
              'run.googleapis.com/cpu-throttling': request.cpuAlwaysAllocated ? 'false' : 'true',
            },
          },
          spec: {
            containers: [
              {
                image,
                env: request.envSecretNames.map((name) => ({
                  name,
                  valueFrom: { secretKeyRef: { name, key: 'latest' } },
                })),
              },
            ],
          },
        },
        traffic: [{ percent: 100, latestRevision: true }],
      },
    };

    const service = await this.gcp.request<{ status?: { url?: string; latestReadyRevisionName?: string } }>(
      this.gcp.cloudRunUrl(request.region, `/services/${request.serviceName}`),
      { method: 'PUT', body: JSON.stringify(serviceBody) },
    );

    return {
      id: crypto.randomUUID(),
      serviceName: request.serviceName,
      region: request.region,
      status: 'ready',
      kind: request.cpuAlwaysAllocated ? 'cloud-run-cpu-always' : 'cloud-run',
      image,
      revision: service.status?.latestReadyRevisionName,
      url: service.status?.url,
      commitSha: request.project.commitSha,
      createdAt: new Date().toISOString(),
    };
  }

  async setTraffic(region: string, serviceName: string, targets: TrafficTarget[]): Promise<void> {
    await this.gcp.request(this.gcp.cloudRunUrl(region, `/services/${serviceName}`), {
      method: 'PATCH',
      body: JSON.stringify({
        spec: { traffic: targets.map((target) => ({ revisionName: target.revision, percent: target.percent })) },
      }),
    });
  }

  async rollback(region: string, serviceName: string, revision: string): Promise<void> {
    await this.setTraffic(region, serviceName, [{ revision, percent: 100 }]);
  }
}
