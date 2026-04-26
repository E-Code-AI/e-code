import { access, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { createLogger } from '../utils/logger';

const logger = createLogger('ai-post-processing');

export interface PostProcessingResult {
  prettierApplied: boolean;
  eslintApplied: boolean;
  typecheckAttempted: boolean;
  typecheckPassed: boolean;
  typecheckErrors?: string;
  retriesUsed: number;
}

interface PostProcessingOptions {
  workspacePath: string;
  filePaths?: string[];
  retryFix?: (typecheckErrors: string, attempt: number) => Promise<boolean>;
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

const DESIGN_TOKEN_CLASS_PATTERN =
  /\b(?:bg-background|text-foreground|border-border|bg-card|text-card-foreground|bg-muted|text-muted-foreground|bg-accent|text-accent-foreground|bg-primary|text-primary-foreground|ring-ring)\b/;

const SHADCN_TAILWIND_THEME = `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './client/index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: '1rem',
        md: 'calc(1rem - 2px)',
        sm: 'calc(1rem - 4px)',
      },
    },
  },
  plugins: [],
};
`;

const SHADCN_BASE_CSS = `@tailwind base;
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
}
`;

async function workspaceUsesDesignTokens(workspacePath: string): Promise<boolean> {
  const candidateFiles = [
    'src/App.tsx',
    'src/App.jsx',
    'src/pages/HomePage.tsx',
    'src/pages/HomePage.jsx',
    'client/src/App.tsx',
    'client/src/App.jsx',
    'client/src/pages/HomePage.tsx',
    'client/src/pages/HomePage.jsx',
  ];

  for (const relativePath of candidateFiles) {
    const fullPath = path.join(workspacePath, relativePath);
    if (!(await fileExists(fullPath))) {
      continue;
    }

    const contents = await readFile(fullPath, 'utf8');
    if (DESIGN_TOKEN_CLASS_PATTERN.test(contents)) {
      return true;
    }
  }

  return false;
}

async function ensureTailwindDesignTokens(workspacePath: string): Promise<void> {
  if (!(await workspaceUsesDesignTokens(workspacePath))) {
    return;
  }

  const tailwindConfigCandidates = [
    'tailwind.config.js',
    'tailwind.config.ts',
    'client/tailwind.config.js',
    'client/tailwind.config.ts',
  ];
  const cssCandidates = [
    'src/index.css',
    'client/src/index.css',
  ];

  for (const relativePath of tailwindConfigCandidates) {
    const fullPath = path.join(workspacePath, relativePath);
    if (!(await fileExists(fullPath))) {
      continue;
    }

    const contents = await readFile(fullPath, 'utf8');
    if (
      contents.includes('hsl(var(--border))') &&
      contents.includes('hsl(var(--background))')
    ) {
      continue;
    }

    await writeFile(fullPath, SHADCN_TAILWIND_THEME, 'utf8');
  }

  for (const relativePath of cssCandidates) {
    const fullPath = path.join(workspacePath, relativePath);
    if (!(await fileExists(fullPath))) {
      continue;
    }

    const contents = await readFile(fullPath, 'utf8');
    if (
      contents.includes('--background:') &&
      contents.includes('@apply border-border;')
    ) {
      continue;
    }

    await writeFile(fullPath, SHADCN_BASE_CSS, 'utf8');
  }
}

async function runSafe(
  command: string,
  args: string[],
  cwd: string
): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const result = await execa(command, args, { cwd, reject: false });
    return {
      ok: result.exitCode === 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error: any) {
    return {
      ok: false,
      stdout: '',
      stderr: error?.message || String(error),
    };
  }
}

export async function postProcessGeneratedWorkspace(
  options: PostProcessingOptions
): Promise<PostProcessingResult> {
  const { workspacePath, filePaths = [], retryFix } = options;
  const normalizedFiles = filePaths
    .filter(Boolean)
    .map((filePath) => filePath.replace(/\\/g, '/'));

  let prettierApplied = false;
  let eslintApplied = false;
  let typecheckAttempted = false;
  let typecheckPassed = true;
  let typecheckErrors = '';
  let retriesUsed = 0;

  await ensureTailwindDesignTokens(workspacePath);

  const prettierTargetArgs = normalizedFiles.length > 0 ? normalizedFiles : ['.'];
  const hasLocalPrettier = await fileExists(path.join(process.cwd(), 'node_modules/.bin/prettier'));
  if (hasLocalPrettier) {
    const prettierResult = await runSafe('npx', ['prettier', '--write', ...prettierTargetArgs], workspacePath);
    prettierApplied = prettierResult.ok;
    if (!prettierResult.ok) {
      logger.warn('Prettier pass failed', { workspacePath, stderr: prettierResult.stderr });
    }
  }

  const hasEslintConfig =
    (await fileExists(path.join(workspacePath, 'eslint.config.js'))) ||
    (await fileExists(path.join(workspacePath, '.eslintrc'))) ||
    (await fileExists(path.join(workspacePath, '.eslintrc.js'))) ||
    (await fileExists(path.join(workspacePath, '.eslintrc.json')));
  if (hasEslintConfig) {
    const eslintTargets = normalizedFiles.length > 0 ? normalizedFiles : ['.'];
    const eslintResult = await runSafe('npx', ['eslint', '--fix', ...eslintTargets], workspacePath);
    eslintApplied = eslintResult.ok;
    if (!eslintResult.ok) {
      logger.warn('ESLint fix pass failed (non-blocking)', { workspacePath, stderr: eslintResult.stderr });
    }
  }

  const hasTsConfig =
    (await fileExists(path.join(workspacePath, 'tsconfig.json'))) ||
    (await fileExists(path.join(workspacePath, 'tsconfig.app.json')));
  const hasNodeModules = await fileExists(path.join(workspacePath, 'node_modules'));

  if (hasTsConfig && hasNodeModules) {
    typecheckAttempted = true;

    for (let attempt = 0; attempt < 3; attempt++) {
      const typecheckResult = await runSafe('npx', ['tsc', '--noEmit', '--pretty', 'false'], workspacePath);
      if (typecheckResult.ok) {
        typecheckPassed = true;
        typecheckErrors = '';
        break;
      }

      typecheckPassed = false;
      typecheckErrors = [typecheckResult.stdout, typecheckResult.stderr].filter(Boolean).join('\n').trim();

      if (!retryFix || attempt === 2) {
        break;
      }

      const fixed = await retryFix(typecheckErrors, attempt + 1);
      retriesUsed += 1;
      if (!fixed) {
        break;
      }
    }
  }

  return {
    prettierApplied,
    eslintApplied,
    typecheckAttempted,
    typecheckPassed,
    typecheckErrors,
    retriesUsed,
  };
}
