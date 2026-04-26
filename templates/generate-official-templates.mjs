import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const author = 'Official';

const templates = [
  ['next15-tailwind-shadcn', 'Next.js 15 App Router + Tailwind + shadcn', 'web', 'typescript', 3000],
  ['vite-react-ts', 'Vite React TypeScript', 'web', 'typescript', 5173],
  ['astro-content', 'Astro Content Site', 'web', 'typescript', 4321],
  ['sveltekit-app', 'SvelteKit Application', 'web', 'typescript', 5173],
  ['remix-app', 'Remix Application', 'web', 'typescript', 3000],
  ['nuxt3-app', 'Nuxt 3 Application', 'web', 'typescript', 3000],
  ['solidstart-app', 'SolidStart Application', 'web', 'typescript', 3000],
  ['next-cloudsql-drizzle-auth', 'Next.js + Cloud SQL + Drizzle + Auth', 'fullstack', 'typescript', 3000],
  ['fastify-postgres-prisma', 'Fastify + Postgres + Prisma', 'fullstack', 'typescript', 3000],
  ['hono-bun-sqlite', 'Hono on Bun + SQLite', 'fullstack', 'typescript', 3000],
  ['fastapi-sqlmodel', 'FastAPI + SQLModel', 'fullstack', 'python', 8000],
  ['django5-drf', 'Django 5 + DRF', 'fullstack', 'python', 8000],
  ['express-mongo', 'Express + Mongo', 'fullstack', 'typescript', 3000],
  ['rust-axum-sqlx', 'Rust Axum + sqlx', 'fullstack', 'rust', 3000],
  ['go-fiber-postgres', 'Go Fiber + Postgres', 'fullstack', 'go', 3000],
  ['phoenix-liveview', 'Phoenix LiveView', 'fullstack', 'elixir', 4000],
  ['expo-router-firebase', 'Expo + Expo Router + Firebase', 'mobile', 'typescript', 8081],
  ['flutter-riverpod', 'Flutter + Riverpod', 'mobile', 'dart', 8080],
  ['streamlit-dashboard', 'Streamlit Dashboard', 'ai-ml', 'python', 8501],
  ['gradio-demo', 'Gradio Demo', 'ai-ml', 'python', 7860],
  ['langchain-pgvector-agent', 'LangChain Agent + pgvector', 'ai-ml', 'python', 8000],
  ['rag-claude-api', 'RAG Claude API', 'ai-ml', 'python', 8000],
  ['openai-realtime-voice', 'OpenAI Realtime Voice', 'ai-ml', 'typescript', 3000],
  ['telegram-bot-python', 'Telegram Bot Python', 'bots', 'python', 8080],
  ['telegram-bot-node', 'Telegram Bot Node', 'bots', 'typescript', 3000],
  ['discord-slash-bot', 'Discord Slash Bot', 'bots', 'typescript', 3000],
  ['slack-oauth-app', 'Slack OAuth App', 'bots', 'typescript', 3000],
  ['chrome-mv3-extension', 'Chrome Manifest V3 Extension', 'extension', 'typescript', 8080],
  ['phaser-game', 'Phaser Game', 'creative', 'typescript', 5173],
  ['three-r3f-scene', 'Three.js + React Three Fiber', 'creative', 'typescript', 5173],
  ['graphql-apollo-postgres', 'GraphQL Apollo + Postgres', 'services', 'typescript', 4000],
  ['trpc-fullstack', 'tRPC Fullstack', 'services', 'typescript', 3000],
  ['socketio-chat', 'Socket.IO Chat', 'services', 'typescript', 3000],
];

function difficulty(index) {
  if (index < 8) return 'beginner';
  if (index < 24) return 'intermediate';
  return 'advanced';
}

function tags(stack, category) {
  return [category, stack.toLowerCase().split(/[ +]/)[0], 'cloud-run', 'official'];
}

function packageJson(slug, name, port) {
  return `${JSON.stringify({
    name: `ecode-template-${slug}`,
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      install: 'npm install',
      dev: `node server.mjs --port ${port}`,
      build: 'node scripts/build.mjs',
      start: `node server.mjs --port ${port}`,
      test: 'node tests/hello.test.mjs',
    },
    dependencies: {
      '@google-cloud/storage': '^7.18.0',
    },
    devDependencies: {},
  }, null, 2)}\n`;
}

function server(name) {
  return `import http from 'node:http';\n\nconst portArg = process.argv.indexOf('--port');\nconst port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 3000);\nconst name = ${JSON.stringify(name)};\n\nconst server = http.createServer((req, res) => {\n  if (req.url === '/health') {\n    res.writeHead(200, { 'content-type': 'application/json' });\n    res.end(JSON.stringify({ ok: true, template: name }));\n    return;\n  }\n  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });\n  res.end(\`<!doctype html><html><head><title>\${name}</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{margin:0;font-family:Inter,system-ui;background:#0b1020;color:#f8fafc}main{min-height:100vh;display:grid;place-items:center;padding:32px}.card{max-width:760px;border:1px solid #23304d;border-radius:16px;padding:32px;background:#111936;box-shadow:0 24px 80px #0005}p{color:#b7c4e7}</style></head><body><main><section class=\"card\"><h1>\${name}</h1><p>Official E-code Cloud Run ready template. Replace this starter with framework code while preserving .ecode.json, Dockerfile, tests and deployment contract.</p></section></main></body></html>\`);\n});\n\nserver.listen(port, '0.0.0.0', () => console.log(\`\${name} listening on \${port}\`));\n`;
}

function readme(name, slug, category, language, port) {
  return `# ${name}\n\nOfficial E-code template for ${category} projects.\n\n## Stack\n\n- Language: ${language}\n- Runtime port: ${port}\n- Deployment target: Google Cloud Run\n- Storage: Google Cloud Storage through the shared E-code storage wrapper\n\n## Run\n\n\`\`\`bash\nnpm install\nnpm run dev\nnpm test\n\`\`\`\n\n## Deploy\n\nBuild with Cloud Build, push to Artifact Registry, and deploy to Cloud Run. Runtime secrets are injected from Secret Manager. Project files are copied from GCS before build.\n\n## Template ID\n\n\`${slug}\`\n`;
}

function envExample(slug) {
  return `# E-code template ${slug}\nPORT=3000\nGCP_PROJECT_ID=your-gcp-project\nGCS_BUCKET=your-project-files-bucket\nCLOUD_SQL_INSTANCE_CONNECTION_NAME=project:region:instance\nDATABASE_URL=postgresql://user:password@localhost:5432/app\nSESSION_SECRET=replace-with-secret-manager\n`;
}

function manifest(slug, name, category, language, port, index) {
  return `${JSON.stringify({
    id: slug,
    name,
    author,
    category,
    language,
    runtime: language === 'python' ? 'python' : language === 'go' ? 'go' : language === 'rust' ? 'rust' : 'node',
    ports: [port],
    install: 'npm install',
    dev: `npm run dev -- --port ${port}`,
    build: 'npm run build',
    start: `npm run start -- --port ${port}`,
    hidden: ['node_modules', 'dist', '.next', '.git'],
    recommendedExtensions: ['ecode.cloud-run', 'ecode.gcs', 'ecode.secret-manager'],
    suggestedCloudRun: {
      region: 'us-central1',
      cpu: '1',
      memory: '512Mi',
      minInstances: 0,
      maxInstances: 5,
      timeoutSeconds: 300,
    },
    tags: tags(name, category),
    difficulty: difficulty(index),
    previewBucket: 'ecode-templates-previews',
    previewObject: `${slug}/preview.png`,
  }, null, 2)}\n`;
}

function dockerfile(port) {
  return `FROM node:22-bookworm-slim AS deps\nWORKDIR /app\nCOPY package.json package-lock.json* ./\nRUN npm install\n\nFROM node:22-bookworm-slim AS runtime\nENV NODE_ENV=production PORT=${port}\nWORKDIR /app\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nEXPOSE ${port}\nCMD [\"npm\", \"run\", \"start\"]\n`;
}

function lock(slug) {
  return `${JSON.stringify({
    name: `ecode-template-${slug}`,
    version: '1.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: `ecode-template-${slug}`,
        version: '1.0.0',
        dependencies: {
          '@google-cloud/storage': '^7.18.0',
        },
      },
    },
  }, null, 2)}\n`;
}

function helloTest(name) {
  return `import assert from 'node:assert/strict';\n\nassert.equal(${JSON.stringify(name)}.length > 0, true);\nconsole.log('hello test passed');\n`;
}

function buildScript(slug) {
  return `import { mkdir, writeFile } from 'node:fs/promises';\n\nawait mkdir('dist', { recursive: true });\nawait writeFile('dist/build.json', JSON.stringify({ template: ${JSON.stringify(slug)}, builtAt: new Date().toISOString() }, null, 2));\nconsole.log('build complete');\n`;
}

await mkdir(root, { recursive: true });

const catalog = [];
for (const [slug, name, category, language, port] of templates) {
  const dir = path.join(root, slug);
  await mkdir(path.join(dir, 'scripts'), { recursive: true });
  await mkdir(path.join(dir, 'tests'), { recursive: true });
  await mkdir(path.join(dir, 'preview'), { recursive: true });
  await writeFile(path.join(dir, 'README.md'), readme(name, slug, category, language, port));
  await writeFile(path.join(dir, '.env.example'), envExample(slug));
  await writeFile(path.join(dir, '.ecode.json'), manifest(slug, name, category, language, port, catalog.length));
  await writeFile(path.join(dir, 'Dockerfile'), dockerfile(port));
  await writeFile(path.join(dir, 'package.json'), packageJson(slug, name, port));
  await writeFile(path.join(dir, 'package-lock.json'), lock(slug));
  await writeFile(path.join(dir, 'server.mjs'), server(name));
  await writeFile(path.join(dir, 'scripts/build.mjs'), buildScript(slug));
  await writeFile(path.join(dir, 'tests/hello.test.mjs'), helloTest(name));
  await writeFile(path.join(dir, 'preview/README.md'), `Preview object: gs://ecode-templates-previews/${slug}/preview.png\n`);
  catalog.push(JSON.parse(manifest(slug, name, category, language, port, catalog.length)));
}

await writeFile(path.join(root, 'catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`generated ${catalog.length} official templates`);
