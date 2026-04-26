import fs from 'fs/promises';
import path from 'path';

jest.mock('../../server/storage', () => ({
  storage: {
    getFileByPath: jest.fn().mockResolvedValue(null),
    createFile: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../server/ai/post-processing', () => ({
  postProcessGeneratedWorkspace: jest.fn().mockResolvedValue({
    prettierApplied: true,
    eslintApplied: false,
    typecheckAttempted: false,
    typecheckPassed: true,
    retriesUsed: 0,
  }),
}));

import { speculativeScaffold } from '../../server/services/speculative-scaffold.service';

describe('SpeculativeScaffoldService modern generation', () => {
  const projectId = String(Date.now());
  const workspaceRoot = path.join('/tmp/projects', projectId);

  afterAll(async () => {
    await fs.rm(workspaceRoot, { recursive: true, force: true });
  });

  it('generates a modern todo app starter with dark mode, HSL tokens, shadcn-style ui, and Framer Motion', async () => {
    const result = await speculativeScaffold.createScaffold({
      projectId,
      framework: 'react',
      language: 'typescript',
      prompt: 'Build a modern todo app with dark mode, smooth motion, and polished UI.',
      projectName: 'Modern Todo',
    });

    expect(result.success).toBe(true);

    const packageJson = JSON.parse(await fs.readFile(path.join(workspaceRoot, 'package.json'), 'utf8'));
    const homePage = await fs.readFile(path.join(workspaceRoot, 'client/src/pages/HomePage.tsx'), 'utf8');
    const button = await fs.readFile(path.join(workspaceRoot, 'client/src/components/ui/button.tsx'), 'utf8');
    const css = await fs.readFile(path.join(workspaceRoot, 'client/src/index.css'), 'utf8');

    expect(packageJson.dependencies['framer-motion']).toBeDefined();
    expect(packageJson.dependencies['@radix-ui/react-slot']).toBeDefined();
    expect(packageJson.dependencies['class-variance-authority']).toBeDefined();

    expect(homePage).toContain("from 'framer-motion'");
    expect(homePage).toContain("data-testid=\"input-new-task\"");
    expect(homePage).toContain("data-testid=\"button-add-task\"");
    expect(homePage).toContain("className={cn(dark && 'dark')}");

    expect(button).toContain('class-variance-authority');
    expect(button).toContain("@radix-ui/react-slot");

    expect(css).toContain('--background:');
    expect(css).toContain('--primary:');
    expect(css).toContain('.dark');
  });
});
