export interface CreateFlowCommand {
  id: string;
  title: string;
  shortcut?: string;
  run(): void;
}

export function createProjectCommands(navigate: (path: string) => void): CreateFlowCommand[] {
  return [
    {
      id: 'project.new',
      title: 'New project',
      shortcut: 'Mod+N',
      run: () => navigate('/new'),
    },
    {
      id: 'project.new.from-template',
      title: 'New project from template',
      run: () => navigate('/new?method=template'),
    },
    {
      id: 'project.new.from-git',
      title: 'Import Git repository',
      run: () => navigate('/new?method=git'),
    },
    {
      id: 'project.new.with-ai',
      title: 'Generate app with AI',
      run: () => navigate('/new/ai'),
    },
  ];
}
