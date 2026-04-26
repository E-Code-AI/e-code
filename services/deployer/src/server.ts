import { createServer } from 'node:http';
import { EcodeDeployer } from './deployer.js';
import type { DeploymentRequest } from './types.js';

const deployer = new EcodeDeployer({
  projectId: process.env.GCP_PROJECT_ID ?? '',
  artifactRepository: process.env.ARTIFACT_REPOSITORY ?? 'ecode-apps',
});

export function createDeployerServer() {
  return createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
      if (req.method === 'POST' && req.url === '/deployments') {
        const body = await readJson<DeploymentRequest>(req);
        return json(res, 202, await deployer.deploy(body));
      }
      if (req.method === 'POST' && req.url?.startsWith('/deployments/promote')) {
        const body = await readJson<{ region: string; serviceName: string; revision: string }>(req);
        await deployer.promote(body.region, body.serviceName, body.revision);
        return json(res, 204, undefined);
      }
      if (req.method === 'POST' && req.url?.startsWith('/deployments/rollback')) {
        const body = await readJson<{ region: string; serviceName: string; revision: string }>(req);
        await deployer.rollback(body.region, body.serviceName, body.revision);
        return json(res, 204, undefined);
      }
      return json(res, 404, { message: 'Not found' });
    } catch (error) {
      return json(res, 500, { message: error instanceof Error ? error.message : 'Unhandled deployer error' });
    }
  });
}

function json(res: import('node:http').ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  if (status === 204) return res.end();
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function readJson<T>(req: import('node:http').IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as T);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createDeployerServer().listen(Number(process.env.PORT ?? 8080), '0.0.0.0');
}
