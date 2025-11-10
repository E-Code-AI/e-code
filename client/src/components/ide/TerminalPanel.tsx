import { ReplitTerminalPanel } from '@/components/editor/ReplitTerminalPanel';

interface TerminalPanelProps {
  projectId: string;
}

export function TerminalPanel({ projectId }: TerminalPanelProps) {
  return (
    <div className="h-full">
      <ReplitTerminalPanel projectId={projectId} />
    </div>
  );
}
