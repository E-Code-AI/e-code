import { ReplitDatabasePanel } from '@/components/editor/ReplitDatabasePanel';

interface DatabasePanelProps {
  projectId: string;
}

export function DatabasePanel({ projectId }: DatabasePanelProps) {
  return (
    <div className="h-full">
      <ReplitDatabasePanel projectId={projectId} />
    </div>
  );
}
