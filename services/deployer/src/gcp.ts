import { GoogleAuth } from 'google-auth-library';

export class GcpRestClient {
  private readonly auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

  constructor(private readonly projectId: string) {}

  async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const client = await this.auth.getClient();
    const headers = await client.getRequestHeaders();
    const response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GCP request failed ${response.status}: ${body}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  cloudBuildUrl(path: string): string {
    return `https://cloudbuild.googleapis.com/v1/projects/${this.projectId}${path}`;
  }

  cloudRunUrl(region: string, path: string): string {
    return `https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${this.projectId}${path}`;
  }

  artifactImage(region: string, repository: string, image: string, tag: string): string {
    return `${region}-docker.pkg.dev/${this.projectId}/${repository}/${image}:${tag}`;
  }
}
