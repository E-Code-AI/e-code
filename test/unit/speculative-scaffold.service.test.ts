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

  it('generates a Salesforce-style CRM surface with real interactive pipeline state', async () => {
    const crmProjectId = `${projectId}-crm`;
    const crmRoot = path.join('/tmp/projects', crmProjectId);

    const result = await speculativeScaffold.createScaffold({
      projectId: crmProjectId,
      framework: 'react',
      language: 'typescript',
      prompt: 'Create a Salesforce clone CRM website with account pipeline, opportunity forecast, executive UI, and no mock panels.',
      projectName: 'Enterprise CRM',
    });

    expect(result.success).toBe(true);

    const homePage = await fs.readFile(path.join(crmRoot, 'client/src/pages/HomePage.tsx'), 'utf8');

    expect(homePage).toContain('CRM command center');
    expect(homePage).toContain('Salesforce-style operating rhythm');
    expect(homePage).toContain("data-testid=\"input-crm-account\"");
    expect(homePage).toContain("data-testid=\"button-crm-add-account\"");
    expect(homePage).toContain('advanceAccount');
    expect(homePage).not.toContain('Connect real data source');

    await fs.rm(crmRoot, { recursive: true, force: true });
  });
});
