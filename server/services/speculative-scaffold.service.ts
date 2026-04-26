/**
 * Speculative Scaffold Service - Enhanced for Complete App Generation
 * 
 * Creates COMPLETE, RUNNABLE project structures with real code.
 * This is the key service for generating full apps from prompts.
 * 
 * Phase 1 (Fast - parallel with AI): Basic structure + configs
 * Phase 2 (After plan): Full code generation with working entry points
 * 
 * The scaffolding creates:
 * - Complete directory structure
 * - Full package.json with REAL dependencies
 * - Working entry point files (App.tsx, index.tsx, etc.)
 * - All config files (vite, tsconfig, tailwind, etc.)
 * - Basic UI components ready to customize
 * 
 * @author E-Code Platform
 * @version 2.0.0 - Enhanced for 100% Replit Parity
 * @since December 2025
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { getProjectWorkspacePath } from '../utils/project-fs-sync';
import { postProcessGeneratedWorkspace } from '../ai/post-processing';

const logger = createLogger('speculative-scaffold');

export interface ScaffoldOptions {
  projectId: string;
  language?: string;
  framework?: string;
  prompt?: string;
  projectName?: string;
  includeDatabase?: boolean;
  includeTailwind?: boolean;
  includeAuth?: boolean;
}

export interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  durationMs: number;
  framework: string;
  dependencies: string[];
  devDependencies: string[];
  error?: string;
}

export interface ScaffoldProgressEvent {
  type: 'start' | 'directory' | 'file' | 'complete' | 'error';
  message: string;
  progress: number;
  filePath?: string;
}

interface AppIdentity {
  title: string;
  description: string;
  packageName: string;
}

// ============================================
// COMPLETE FRAMEWORK TEMPLATES WITH REAL CODE
// These generate RUNNABLE apps, not skeletons
// ============================================

const FRAMEWORK_TEMPLATES: Record<string, {
  directories: string[];
  files: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}> = {
  'react-vite-fullstack': {
    directories: [
      'client/src',
      'client/src/components',
      'client/src/components/ui',
      'client/src/hooks',
      'client/src/lib',
      'client/src/pages',
      'client/public',
      'server',
      'server/routes',
      'shared'
    ],
    files: {
      'package.json': JSON.stringify({
        name: 'fullstack-app',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'concurrently "npm run dev:server" "npm run dev:client"',
          'dev:server': 'tsx watch server/index.ts',
          'dev:client': 'vite',
          build: 'vite build && tsc -p tsconfig.server.json',
          start: 'node dist/server/index.js',
          preview: 'vite preview'
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'express': '^4.18.2',
          'cors': '^2.8.5',
          'wouter': '^3.0.0',
          '@tanstack/react-query': '^5.0.0',
          'lucide-react': '^0.300.0',
          'clsx': '^2.0.0',
          'tailwind-merge': '^2.0.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@types/express': '^4.17.21',
          '@types/cors': '^2.8.17',
          '@types/node': '^20.0.0',
          '@vitejs/plugin-react': '^4.2.0',
          'autoprefixer': '^10.4.16',
          'concurrently': '^8.2.2',
          'postcss': '^8.4.32',
          'tailwindcss': '^3.4.0',
          'tsx': '^4.7.0',
          'typescript': '^5.3.0',
          'vite': '^5.0.0'
        }
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: 'client',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist/client'
  }
});`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          baseUrl: '.',
          paths: {
            '@/*': ['client/src/*'],
            '@shared/*': ['shared/*']
          }
        },
        include: ['client/src', 'shared']
      }, null, 2),
      'tsconfig.server.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'bundler',
          outDir: './dist/server',
          rootDir: './server',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['server/**/*']
      }, null, 2),
      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,
      'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,
      'client/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'client/src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);`,
      'client/src/App.tsx': `import { Route, Switch } from 'wouter';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
    </div>
  );
}`,
      'client/src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}`,
      'client/src/pages/HomePage.tsx': `import { useQuery } from '@tanstack/react-query';

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('/api/health').then(res => res.json())
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-title">
        Welcome to Your App
      </h1>
      <p className="text-gray-600 mb-8" data-testid="text-description">
        Your full-stack application is ready to customize.
      </p>
      <div className="bg-white rounded-lg shadow p-6" data-testid="card-status">
        <h2 className="text-[15px] font-semibold mb-2">Server Status</h2>
        {isLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <p className="text-green-600" data-testid="text-status">
            {data?.status || 'Connected'}
          </p>
        )}
      </div>
    </div>
  );
}`,
      'client/src/lib/utils.ts': `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      'server/index.ts': `import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      'server/routes/health.ts': `import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;`,
      'shared/types.ts': `export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}`,
      '.gitignore': `node_modules
dist
.env
.env.local
*.log
.DS_Store`,
      '.env.example': `PORT=3001
NODE_ENV=development`
    },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'wouter': '^3.0.0',
      '@tanstack/react-query': '^5.0.0'
    },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@vitejs/plugin-react': '^4.2.0',
      'typescript': '^5.3.0',
      'vite': '^5.0.0',
      'tailwindcss': '^3.4.0'
    }
  },
  'react': {
    directories: ['src', 'src/components', 'src/components/ui', 'src/hooks', 'src/lib', 'src/pages', 'public'],
    files: {
      'package.json': JSON.stringify({
        name: 'react-app',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'wouter': '^3.0.0',
          '@tanstack/react-query': '^5.0.0',
          'lucide-react': '^0.300.0',
          'clsx': '^2.0.0',
          'tailwind-merge': '^2.0.0'
        },
        devDependencies: {
          '@types/react': '^18.2.0',
          '@types/react-dom': '^18.2.0',
          '@vitejs/plugin-react': '^4.2.0',
          'autoprefixer': '^10.4.16',
          'postcss': '^8.4.32',
          'tailwindcss': '^3.4.0',
          'typescript': '^5.3.0',
          'vite': '^5.0.0'
        }
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5000,
    host: '0.0.0.0'
  }
});`,
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          baseUrl: '.',
          paths: { '@/*': ['src/*'] }
        },
        include: ['src']
      }, null, 2),
      'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};`,
      'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
      'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);`,
      'src/App.tsx': `import { Route, Switch } from 'wouter';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
    </div>
  );
}`,
      'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      'src/pages/HomePage.tsx': `export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="text-title">
        Welcome to Your App
      </h1>
      <p className="text-gray-600" data-testid="text-description">
        Start building your application!
      </p>
    </div>
  );
}`,
      'src/lib/utils.ts': `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      '.gitignore': 'node_modules\ndist\n.env\n.env.local\n'
    },
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'wouter': '^3.0.0',
      '@tanstack/react-query': '^5.0.0'
    },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@vitejs/plugin-react': '^4.2.0',
      'typescript': '^5.3.0',
      'vite': '^5.0.0',
      'tailwindcss': '^3.4.0'
    }
  },
  'express': {
    directories: ['src', 'src/routes', 'src/middleware', 'src/utils'],
    files: {
      'package.json': JSON.stringify({
        name: 'express-api',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'tsx watch src/index.ts',
          start: 'node dist/index.js',
          build: 'tsc'
        },
        dependencies: {
          'express': '^4.18.2',
          'cors': '^2.8.5',
          'helmet': '^7.1.0',
          'zod': '^3.22.0'
        },
        devDependencies: {
          '@types/express': '^4.17.21',
          '@types/cors': '^2.8.17',
          '@types/node': '^20.0.0',
          'tsx': '^4.7.0',
          'typescript': '^5.3.0'
        }
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'bundler',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }, null, 2),
      'src/index.ts': `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRouter from './routes/api';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
});`,
      'src/routes/api.ts': `import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Example route with validation
router.get('/items', (req, res) => {
  res.json({ items: [], total: 0 });
});

router.post('/items', (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional()
  });
  
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.errors });
  }
  
  res.status(201).json({ id: Date.now(), ...result.data });
});

export default router;`,
      'src/middleware/errorHandler.ts': `import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
}`,
      '.gitignore': 'node_modules\ndist\n.env\n',
      '.env.example': 'PORT=5000\nNODE_ENV=development'
    },
    dependencies: {
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'helmet': '^7.1.0',
      'zod': '^3.22.0'
    },
    devDependencies: {
      '@types/express': '^4.17.21',
      'tsx': '^4.7.0',
      'typescript': '^5.3.0'
    }
  },
  'default': {
    directories: ['src'],
    files: {
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          start: 'node src/index.js',
          dev: 'node --watch src/index.js'
        },
        dependencies: {},
        devDependencies: {}
      }, null, 2),
      'src/index.js': `console.log('Hello, World!');

// Your code here
`,
      '.gitignore': 'node_modules\n.env\n'
    },
    dependencies: {},
    devDependencies: {}
  }
};

export class SpeculativeScaffoldService {
  private projectsRoot: string;

  constructor(projectsRoot: string = '/tmp/projects') {
    this.projectsRoot = projectsRoot;
  }

  /**
   * Detect framework from prompt keywords
   */
  private detectFramework(prompt?: string, framework?: string): string {
    if (framework) return framework.toLowerCase();
    if (!prompt) return 'default';

    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('react') || promptLower.includes('frontend') || promptLower.includes('ui')) {
      return 'react';
    }
    if (promptLower.includes('express') || promptLower.includes('api') || promptLower.includes('backend') || promptLower.includes('server')) {
      return 'express';
    }
    if (promptLower.includes('next') || promptLower.includes('nextjs')) {
      return 'react'; // Use React template as base for Next.js
    }

    return 'default';
  }

  private buildAppIdentity(projectName?: string, prompt?: string): AppIdentity {
    const fallbackPrompt = prompt?.trim() || 'AI Generated App';
    const rawTitle = (projectName?.trim() || fallbackPrompt)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 72);

    const title = rawTitle.length > 0
      ? rawTitle
      : 'AI Generated App';

    const descriptionSource = prompt?.trim() || `${title} generated by AI`;
    const description = descriptionSource.length > 160
      ? `${descriptionSource.slice(0, 157).trim()}...`
      : descriptionSource;

    const packageName = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'ai-generated-app';

    return {
      title,
      description,
      packageName,
    };
  }

  private selectTemplate(prompt?: string, framework?: string): string {
    const requestedFramework = framework?.toLowerCase();
    const detectedAppType = this.detectAppType(prompt);

    if (requestedFramework === 'express' || requestedFramework === 'fastapi') {
      return 'express';
    }

    if (requestedFramework === 'react') {
      if (detectedAppType === 'express') {
        return 'express';
      }
      return detectedAppType;
    }

    if (requestedFramework === 'vue' || requestedFramework === 'svelte') {
      return detectedAppType === 'express' ? 'express' : 'react-vite-fullstack';
    }

    if (requestedFramework) {
      return FRAMEWORK_TEMPLATES[requestedFramework] ? requestedFramework : detectedAppType;
    }

    return detectedAppType;
  }

  private personalizeTemplateContent(content: string, filePath: string, appIdentity: { title: string; description: string; packageName: string }): string {
    let nextContent = content;
    const { title, description, packageName } = appIdentity;

    if (filePath === 'package.json') {
      try {
        const parsed = JSON.parse(content);
        parsed.name = packageName;
        if (!parsed.description) {
          parsed.description = description;
        }
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }

    if (filePath.endsWith('index.html')) {
      nextContent = nextContent.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
    }

    nextContent = nextContent
      .replace(/Welcome to Your App/g, title)
      .replace(/Your full-stack application is ready to customize\./g, description)
      .replace(/Welcome to React/g, title)
      .replace(/Start building your application with a real, runnable scaffold\./g, description)
      .replace(/React App/g, title)
      .replace(/My Website/g, title);

    return nextContent;
  }

  private buildModernPackageJson(existing: string, appIdentity: AppIdentity): string {
    const parsed = JSON.parse(existing);
    parsed.name = appIdentity.packageName;
    parsed.description = appIdentity.description;
    parsed.dependencies = {
      ...(parsed.dependencies || {}),
      'framer-motion': '^12.23.24',
      '@radix-ui/react-slot': '^1.2.4',
      'class-variance-authority': '^0.7.1',
      'clsx': '^2.1.1',
      'tailwind-merge': '^3.3.1',
    };
    return JSON.stringify(parsed, null, 2);
  }

  private buildPromptAwareHomePage(appIdentity: AppIdentity, prompt?: string): string {
    const intent = (prompt || '').toLowerCase();
    const looksLikeTodo = intent.includes('todo') || intent.includes('task') || intent.includes('kanban') || intent.includes('productivity');
    const productSummary = appIdentity.description.replace(/`/g, "'");

    const featureCards = looksLikeTodo
      ? `
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Focus</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{todos.filter((todo) => !todo.done).length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tasks still in motion</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Completed</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{todos.filter((todo) => todo.done).length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Momentum preserved with dark-mode clarity</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Theme</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{dark ? 'Dark' : 'Light'}</p>
              <p className="mt-1 text-sm text-muted-foreground">Semantic HSL palette with instant toggle</p>
            </div>
          </div>`
      : `
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Experience', 'Latest-generation UI surface with motion and HSL tokens'],
              ['Foundation', 'Shadcn-style components and production-safe app shell'],
              ['Delivery', 'Dark mode, strong hierarchy, and extensible code structure'],
            ].map(([label, copy]) => (
              <div key={label} className="rounded-2xl border border-border/60 bg-card/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
                <p className="mt-3 text-sm text-foreground">{copy}</p>
              </div>
            ))}
          </div>`;

    const primaryPanel = looksLikeTodo
      ? `
          <motion.section
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[28px] border border-border/60 bg-card/85 p-6 shadow-[0_24px_120px_hsl(var(--foreground)/0.10)] backdrop-blur"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Today</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Build flow</h2>
              </div>
              <Button variant="outline" onClick={() => setDark((value) => !value)}>
                {dark ? 'Switch to light' : 'Switch to dark'}
              </Button>
            </div>

            <form
              className="mt-6 flex flex-col gap-3 md:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                setTodos((items) => [
                  { id: Date.now().toString(), title: draft.trim(), done: false },
                  ...items,
                ]);
                setDraft('');
              }}
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a focused task"
                className="h-11 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"
                data-testid="input-new-task"
              />
              <Button type="submit" data-testid="button-add-task">
                Add task
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <AnimatePresence initial={false}>
                {todos.map((todo) => (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                  >
                    <button
                      className="flex items-center gap-3 text-left"
                      onClick={() =>
                        setTodos((items) =>
                          items.map((item) => (item.id === todo.id ? { ...item, done: !item.done } : item))
                        )
                      }
                      type="button"
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition',
                          todo.done
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background'
                        )}
                      >
                        {todo.done ? '✓' : ''}
                      </span>
                      <span className={cn('text-sm text-foreground', todo.done && 'text-muted-foreground line-through')}>
                        {todo.title}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setTodos((items) => items.filter((item) => item.id !== todo.id))}
                    >
                      Remove
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>`
      : `
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[28px] border border-border/60 bg-card/85 p-6 shadow-[0_24px_120px_hsl(var(--foreground)/0.10)] backdrop-blur"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Product surface</p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">Modern starter experience</h2>
              </div>
              <Button variant="outline" onClick={() => setDark((value) => !value)}>
                {dark ? 'Switch to light' : 'Switch to dark'}
              </Button>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">${productSummary}</p>
          </motion.section>`;

    return `import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';

export default function HomePage() {
  const [dark, setDark] = useState(true);
  const [draft, setDraft] = useState('');
  const [todos, setTodos] = useState([
    { id: '1', title: 'Review product structure', done: false },
    { id: '2', title: 'Polish dark mode interactions', done: true },
    { id: '3', title: 'Connect real data source', done: false },
  ]);

  const completion = useMemo(() => {
    if (todos.length === 0) return 0;
    return Math.round((todos.filter((todo) => todo.done).length / todos.length) * 100);
  }, [todos]);

  return (
    <main className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
          <motion.header
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-br from-primary/16 via-card to-background p-6 md:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.28em] text-primary">Generated app</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance md:text-5xl">${appIdentity.title}</h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  ${productSummary}
                </p>
              </div>
              <div className="grid min-w-[220px] gap-3 rounded-[28px] border border-border/60 bg-background/70 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Readiness</p>
                <p className="text-3xl font-semibold text-foreground">{completion}%</p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: completion + '%' }}
                    transition={{ duration: 0.45 }}
                  />
                </div>
              </div>
            </div>
          </motion.header>

          ${featureCards}

          ${primaryPanel}
        </div>
      </div>
    </main>
  );
}`;
  }

  private buildModernReactOverrides(appIdentity: AppIdentity, prompt?: string): Record<string, string> {
    return {
      'package.json': this.buildModernPackageJson(
        FRAMEWORK_TEMPLATES['react-vite-fullstack'].files['package.json'],
        appIdentity
      ),
      'client/src/App.tsx': `import HomePage from './pages/HomePage';

export default function App() {
  return <HomePage />;
}`,
      'client/src/lib/utils.ts': `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`,
      'client/src/components/ui/button.tsx': `import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };`,
      'client/src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 224 71% 4%;
    --card: 0 0% 100%;
    --card-foreground: 224 71% 4%;
    --primary: 262 83% 58%;
    --primary-foreground: 210 20% 98%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    --accent: 262 100% 97%;
    --accent-foreground: 262 83% 58%;
    --border: 220 13% 91%;
    --ring: 262 83% 58%;
  }

  .dark {
    --background: 222 47% 7%;
    --foreground: 210 20% 98%;
    --card: 222 40% 11%;
    --card-foreground: 210 20% 98%;
    --primary: 263 85% 67%;
    --primary-foreground: 224 71% 4%;
    --muted: 223 27% 18%;
    --muted-foreground: 215 20% 65%;
    --accent: 223 27% 18%;
    --accent-foreground: 210 20% 98%;
    --border: 223 21% 24%;
    --ring: 263 85% 67%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
}`,
      'client/src/pages/HomePage.tsx': this.buildPromptAwareHomePage(appIdentity, prompt),
    };
  }

  /**
   * Create speculative scaffold for a project
   * This runs in parallel with AI plan generation
   */
  async createScaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const startTime = Date.now();
    const filesCreated: string[] = [];

    try {
      const { projectId, language, framework, prompt, projectName } = options;
      const projectDir = getProjectWorkspacePath(projectId);
      
      logger.info(`[Scaffold] Starting speculative scaffolding for project ${projectId}`, { 
        framework, 
        language,
        prompt: prompt?.substring(0, 50) 
      });

      const detectedFramework = this.selectTemplate(prompt, framework);
      const template = FRAMEWORK_TEMPLATES[detectedFramework] || FRAMEWORK_TEMPLATES['default'];
      const appIdentity = this.buildAppIdentity(projectName, prompt);

      logger.info(`[Scaffold] Detected framework: ${detectedFramework}`);

      // Create project directory if it doesn't exist
      await fs.mkdir(projectDir, { recursive: true });

      // Create subdirectories
      for (const dir of template.directories) {
        const dirPath = path.join(projectDir, dir);
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug(`[Scaffold] Created directory: ${dir}`);
      }

      const writeFileToWorkspaceAndStorage = async (filePath: string, content: string, overwrite = false) => {
        const fullPath = path.join(projectDir, filePath);

        try {
          if (!overwrite) {
            await fs.access(fullPath);
            logger.debug(`[Scaffold] Skipping existing file: ${filePath}`);
            return;
          }
        } catch {
        }

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        if (!filesCreated.includes(filePath)) {
          filesCreated.push(filePath);
        }
        logger.debug(`[Scaffold] Created file: ${filePath}`);

        try {
          const existingFile = await storage.getFileByPath(projectId, filePath);
          if (!existingFile) {
            await storage.createFile({
              projectId,
              path: filePath,
              content,
            });
          }
        } catch (storageError: any) {
          logger.warn(`[Scaffold] Failed to persist ${filePath} to storage`, {
            projectId,
            error: storageError?.message || String(storageError),
          });
        }
      };

      // Create template files (only if they don't exist - don't overwrite)
      for (const [filePath, templateContent] of Object.entries(template.files)) {
        const content = this.personalizeTemplateContent(templateContent, filePath, appIdentity);
        await writeFileToWorkspaceAndStorage(filePath, content, false);
      }

      if (detectedFramework === 'react-vite-fullstack') {
        const overrides = this.buildModernReactOverrides(appIdentity, prompt);
        for (const [filePath, content] of Object.entries(overrides)) {
          await writeFileToWorkspaceAndStorage(filePath, content, true);
        }
      }

      await Promise.resolve(
        postProcessGeneratedWorkspace({
          workspacePath: projectDir,
          filePaths: filesCreated,
        })
      ).catch((error: any) => {
        logger.warn('[Scaffold] Post-processing failed (non-blocking)', {
          projectId,
          error: error?.message || String(error),
        });
      });

      const durationMs = Date.now() - startTime;
      logger.info(`[Scaffold] Scaffolding completed in ${durationMs}ms`, {
        filesCreated: filesCreated.length,
        projectId,
        framework: detectedFramework
      });

      return {
        success: true,
        filesCreated,
        durationMs,
        framework: detectedFramework,
        dependencies: Object.keys(template.dependencies || {}),
        devDependencies: Object.keys(template.devDependencies || {})
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      logger.error(`[Scaffold] Scaffolding failed:`, { error: error.message });
      
      return {
        success: false,
        filesCreated,
        durationMs,
        framework: 'unknown',
        dependencies: [],
        devDependencies: [],
        error: error.message
      };
    }
  }

  /**
   * Check if a project already has scaffold files
   */
  async hasExistingScaffold(projectId: string): Promise<boolean> {
    const projectDir = getProjectWorkspacePath(projectId);
    
    try {
      const packageJson = path.join(projectDir, 'package.json');
      await fs.access(packageJson);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get available framework templates
   */
  getAvailableFrameworks(): string[] {
    return Object.keys(FRAMEWORK_TEMPLATES);
  }

  /**
   * Enhanced detection: determines if app needs fullstack setup
   */
  detectAppType(prompt?: string): 'react-vite-fullstack' | 'react' | 'express' | 'default' {
    if (!prompt) return 'default';
    
    const promptLower = prompt.toLowerCase();
    
    // Fullstack indicators
    const hasBackend = promptLower.includes('backend') || promptLower.includes('api') || 
                       promptLower.includes('database') || promptLower.includes('server') ||
                       promptLower.includes('auth') || promptLower.includes('login') ||
                       promptLower.includes('signup') || promptLower.includes('dashboard data') ||
                       promptLower.includes('admin') || promptLower.includes('cms') ||
                       promptLower.includes('stripe') || promptLower.includes('payment');
    const hasFrontend = promptLower.includes('frontend') || promptLower.includes('ui') || 
                        promptLower.includes('react') || promptLower.includes('dashboard') ||
                        promptLower.includes('website') || promptLower.includes('app') ||
                        promptLower.includes('landing page') || promptLower.includes('mobile');
    
    // If both frontend and backend mentioned, use fullstack
    if (hasBackend && hasFrontend) {
      return 'react-vite-fullstack';
    }
    
    // Common fullstack app types
    if (promptLower.includes('full-stack') || promptLower.includes('fullstack') ||
        promptLower.includes('crud') || promptLower.includes('todo') ||
        promptLower.includes('blog') || promptLower.includes('e-commerce') ||
        promptLower.includes('ecommerce') || promptLower.includes('store') ||
        promptLower.includes('marketplace') || promptLower.includes('saas') ||
        promptLower.includes('booking') || promptLower.includes('reservation') ||
        promptLower.includes('portal')) {
      return 'react-vite-fullstack';
    }
    
    // Frontend only
    if (hasFrontend && !hasBackend) {
      return 'react';
    }
    
    // Backend only
    if (hasBackend && !hasFrontend) {
      return 'express';
    }
    
    // Default to fullstack for most prompts (most apps need both)
    return 'react-vite-fullstack';
  }
}

export const speculativeScaffold = new SpeculativeScaffoldService();
