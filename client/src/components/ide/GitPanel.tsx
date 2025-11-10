import { ReplitGitPanel } from '@/components/editor/ReplitGitPanel';

interface GitPanelProps {
  projectId: string;
  onBranchChange?: (branch: string) => void;
}

export function GitPanel({ projectId, onBranchChange }: GitPanelProps) {
  return (
    <div className="h-full">
      <ReplitGitPanel projectId={projectId} />
    </div>
  );
}
