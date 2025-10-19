import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import * as t from '@babel/types';

const traverse: typeof import('@babel/traverse').default =
  (traverseModule as any).default ?? (traverseModule as any);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const appFilePath = path.resolve(repoRoot, 'client/src/App.tsx');

const baseUrl = process.env.CRAWL_BASE_URL || 'http://localhost:5000';
const concurrency = Number(process.env.CRAWL_CONCURRENCY || 4);
const requestTimeoutMs = Number(process.env.CRAWL_TIMEOUT_MS || 30000);
const maxAttempts = Number(process.env.CRAWL_RETRIES || 2);

const paramSamples: Record<string, string> = {
  username: 'demo-user',
  projectname: 'demo-project',
  projectSlug: 'demo-project',
  projectId: 'project-123',
  project: 'demo-project',
  id: '123',
  teamId: 'team-123',
  slug: 'sample-slug',
  shareId: 'share-123',
  feature: 'feature',
  repoId: 'repo-123',
  memberId: 'member-456',
  incidentId: 'incident-123',
  databaseId: 'db-123',
  fileId: 'file-123',
  secretId: 'secret-123',
  runId: 'run-123',
  sessionId: 'session-123',
  deploymentId: 'deploy-123',
  buildId: 'build-123',
  taskId: 'task-123',
  postId: 'post-123',
  bountyId: 'bounty-123',
  templateId: 'template-123',
  environmentId: 'env-123',
  workspaceId: 'workspace-123',
  pipelineId: 'pipeline-123',
  capabilityId: 'capability-123',
  invitationId: 'invite-123',
  webhookId: 'webhook-123',
  databaseInstanceId: 'dbi-123',
  planId: 'plan-123',
  connectionId: 'conn-123',
  cronId: 'cron-123',
  messageId: 'message-123',
  commentId: 'comment-123',
  resourceId: 'resource-123',
  requestId: 'request-123',
  logId: 'log-123',
  tokenId: 'token-123',
  promptId: 'prompt-123',
  featureFlag: 'flag-123',
  modelId: 'model-123',
  botId: 'bot-123',
  planSlug: 'enterprise',
  usernameOrId: 'demo-user',
  userId: 'user-123',
  campaignId: 'campaign-123',
  analyticsView: 'usage',
  teamSlug: 'demo-team',
  workspaceSlug: 'demo-workspace',
  projectnameOrId: 'demo-project',
  datasetId: 'dataset-123',
  environmentSlug: 'prod',
  classroomId: 'classroom-123',
  assignmentId: 'assignment-123',
  submissionId: 'submission-123',
  aiAgentId: 'agent-123',
  ticketId: 'ticket-123',
  requestSlug: 'request-123',
  repoSlug: 'sample-repo',
  repoName: 'sample-repo',
  deploymentSlug: 'deploy-sample',
  previewId: 'preview-123',
  templateSlug: 'template-sample',
  secretKey: 'secret-key',
  snippetId: 'snippet-123',
  default: 'sample'
};

function recordPath(value: string | null | undefined, paths: Set<string>) {
  if (!value) return;
  paths.add(value);
}

async function extractRoutes(): Promise<Set<string>> {
  const source = await readFile(appFilePath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
  });

  const paths = new Set<string>();

  traverse(ast, {
    JSXOpeningElement(path) {
      const nameNode = path.node.name;
      if (nameNode.type !== 'JSXIdentifier') return;
      if (nameNode.name !== 'Route' && nameNode.name !== 'ProtectedRoute') return;

      const pathAttribute = path.node.attributes.find(
        (attr): attr is t.JSXAttribute => attr.type === 'JSXAttribute' && attr.name.name === 'path'
      );

      if (!pathAttribute) return;
      const attrValue = pathAttribute.value;
      if (!attrValue) return;

      if (attrValue.type === 'StringLiteral') {
        recordPath(attrValue.value, paths);
        return;
      }

      if (
        attrValue.type === 'JSXExpressionContainer' &&
        attrValue.expression.type === 'StringLiteral'
      ) {
        recordPath(attrValue.expression.value, paths);
      }
    },
    VariableDeclarator(path) {
      if (path.node.id.type !== 'Identifier') return;
      if (path.node.id.name !== 'placeholderRoutes') return;
      const init = path.node.init;
      if (!init || init.type !== 'ArrayExpression') return;
      for (const element of init.elements) {
        if (!element || element.type !== 'ObjectExpression') continue;
        for (const property of element.properties) {
          if (property.type !== 'ObjectProperty') continue;
          if (property.key.type !== 'Identifier') continue;
          if (property.key.name !== 'path') continue;
          if (property.value.type === 'StringLiteral') {
            recordPath(property.value.value, paths);
          }
        }
      }
    },
  });

  return paths;
}

function normalizePath(route: string): string {
  if (!route.startsWith('/')) {
    return `/${route}`;
  }
  return route === '' ? '/' : route;
}

function expandRoute(route: string): string[] {
  const normalized = normalizePath(route);
  const trimmedWildcard = normalized.replace(/\*+$/, '');

  const withSamples = trimmedWildcard.replace(/:([A-Za-z0-9_]+)\??/g, (_, key: string) => {
    return paramSamples[key] ?? paramSamples.default;
  });

  const optionalRemoved = trimmedWildcard.replace(/\/:[^\/]+\?/g, '');

  const candidates = new Set<string>();
  const cleanedWithSamples = cleanPath(withSamples);
  if (cleanedWithSamples) candidates.add(cleanedWithSamples);
  const cleanedOptional = cleanPath(optionalRemoved);
  if (cleanedOptional) candidates.add(cleanedOptional);

  return Array.from(candidates);
}

function cleanPath(route: string): string {
  let result = route.replace(/\/+/g, '/');
  if (result !== '/' && result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  if (result === '') {
    return '/';
  }
  return result;
}

interface CrawlResult {
  path: string;
  url: string;
  status?: number;
  ok: boolean;
  redirected?: boolean;
  finalUrl?: string;
  error?: string;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'e-code-crawler/1.0',
        Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function crawl(paths: string[]): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const queue = [...paths];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.max(1, concurrency); i += 1) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) break;
          const result = await crawlPath(next);
          results.push(result);
        }
      })()
    );
  }

  await Promise.all(workers);
  return results.sort((a, b) => a.path.localeCompare(b.path));
}

async function crawlPath(pathname: string): Promise<CrawlResult> {
  const url = new URL(pathname, baseUrl).toString();
  let attempt = 0;
  while (attempt < Math.max(1, maxAttempts)) {
    attempt += 1;
    try {
      const response = await fetchWithTimeout(url, requestTimeoutMs);
      return {
        path: pathname,
        url,
        status: response.status,
        ok: response.ok,
        redirected: response.redirected,
        finalUrl: response.url,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt < Math.max(1, maxAttempts)) {
        console.warn(`Retrying ${pathname} after error: ${message}`);
        continue;
      }
      return {
        path: pathname,
        url,
        ok: false,
        error: message,
      };
    }
  }

  return {
    path: pathname,
    url,
    ok: false,
    error: 'Unknown crawler error',
  };
}

async function main() {
  console.log(`🔍 Starting crawl of routes from ${baseUrl}`);
  const routeSet = await extractRoutes();
  if (routeSet.size === 0) {
    throw new Error('No routes found in client/src/App.tsx');
  }

  const expanded = new Set<string>();
  for (const route of routeSet) {
    for (const candidate of expandRoute(route)) {
      expanded.add(candidate);
    }
  }

  const sortedPaths = Array.from(expanded).sort((a, b) => a.localeCompare(b));
  console.log(`📄 Discovered ${sortedPaths.length} unique paths to crawl`);

  const results = await crawl(sortedPaths);
  const broken = results.filter((item) => !item.ok || (item.status && item.status >= 400));

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    totalPaths: sortedPaths.length,
    brokenCount: broken.length,
    broken,
    results,
  };

  const reportDir = path.resolve(repoRoot, 'reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'crawl-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`📝 Crawl complete. Report saved to ${path.relative(repoRoot, reportPath)}`);
  if (broken.length > 0) {
    console.log('❌ Broken or unreachable routes found:');
    for (const item of broken) {
      if (item.status) {
        console.log(`  ${item.path} -> ${item.status} (${item.finalUrl ?? item.url})`);
      } else {
        console.log(`  ${item.path} -> ${item.error}`);
      }
    }
  } else {
    console.log('✅ No broken routes detected.');
  }
}

main().catch((error) => {
  console.error('Crawl failed:', error);
  process.exitCode = 1;
});
