import { download } from '../../../packages/storage/src/index.js';
import type { AppDetection, ProjectSource } from './types.js';

export async function detectApplication(source: ProjectSource): Promise<AppDetection> {
  const manifest = await tryJson(source, '.ecode.json');
  if (manifest) return fromManifest(manifest);

  const packageJson = await tryJson(source, 'package.json');
  if (packageJson) {
    const scripts = objectValue(packageJson.scripts);
    const dependencies = objectValue(packageJson.dependencies);
    const hasServer = Boolean(scripts.start || dependencies.fastify || dependencies.express || dependencies.next);
    return {
      kind: hasServer ? 'cloud-run' : 'static',
      runtime: 'node',
      buildCommand: typeof scripts.build === 'string' ? scripts.build : 'npm run build',
      startCommand: typeof scripts.start === 'string' ? scripts.start : 'npm run start',
      outputDir: dependencies.next ? '.next' : 'dist',
      ports: [3000],
      dockerfilePath: 'Dockerfile',
    };
  }

  const pyproject = await exists(source, 'pyproject.toml');
  const requirements = await exists(source, 'requirements.txt');
  if (pyproject || requirements) {
    return {
      kind: 'cloud-run',
      runtime: 'python',
      buildCommand: 'pip install -r requirements.txt',
      startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8080',
      ports: [8080],
      dockerfilePath: 'Dockerfile',
    };
  }

  return {
    kind: 'static',
    runtime: 'static',
    buildCommand: 'true',
    startCommand: 'true',
    outputDir: '.',
    ports: [8080],
    dockerfilePath: 'Dockerfile',
  };
}

function fromManifest(manifest: Record<string, unknown>): AppDetection {
  const deploy = (manifest.deploy ?? {}) as Record<string, unknown>;
  return {
    kind: (deploy.kind as AppDetection['kind']) ?? 'cloud-run',
    runtime: String(manifest.runtime ?? 'node'),
    buildCommand: String(manifest.build ?? deploy.buildCommand ?? 'npm run build'),
    startCommand: String(manifest.start ?? deploy.startCommand ?? 'npm run start'),
    outputDir: typeof deploy.outputDir === 'string' ? deploy.outputDir : undefined,
    ports: Array.isArray(manifest.ports) ? manifest.ports.map(Number) : [3000],
    dockerfilePath: String(deploy.dockerfilePath ?? 'Dockerfile'),
  };
}

async function tryJson(source: ProjectSource, file: string): Promise<Record<string, unknown> | null> {
  try {
    const bytes = await download(source.gcsBucket, `${source.gcsPrefix}/${file}`);
    return JSON.parse(bytes.toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function exists(source: ProjectSource, file: string): Promise<boolean> {
  try {
    await download(source.gcsBucket, `${source.gcsPrefix}/${file}`);
    return true;
  } catch {
    return false;
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
