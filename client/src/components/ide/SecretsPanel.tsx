import { ReplitSecretsPanel } from '@/components/editor/ReplitSecretsPanel';

interface SecretsPanelProps {
  projectId: string;
}

export function SecretsPanel({ projectId }: SecretsPanelProps) {
  return (
    <div className="h-full">
      <ReplitSecretsPanel projectId={projectId} />
    </div>
  );
}
