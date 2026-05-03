import { ReplitGitPanel } from '@/components/editor/ReplitGitPanel';

interface MobileGitPanelProps {
  projectId: string;
  className?: string;
}

export function MobileGitPanel({ projectId, className }: MobileGitPanelProps) {
  return (
    <ReplitGitPanel projectId={projectId} className={className} mode="mobile" />
  );
}
