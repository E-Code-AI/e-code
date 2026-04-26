import { access } from 'fs/promises';
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
