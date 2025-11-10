import { ReplitConsole } from '@/components/editor/ReplitConsole';

interface ConsolePanelProps {
  projectId: string;
}

export function ConsolePanel({ projectId }: ConsolePanelProps) {
  return (
    <div className="h-full">
      <ReplitConsole />
    </div>
  );
}
