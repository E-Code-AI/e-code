export interface AiGeneratorCommand {
  id: string;
  title: string;
  run(): void;
}

export function createAiGeneratorCommands(navigate: (path: string) => void): AiGeneratorCommand[] {
  return [
    {
      id: 'project.generate.with-ai',
      title: 'Generate app with AI',
      run: () => navigate('/new/ai'),
    },
  ];
}
