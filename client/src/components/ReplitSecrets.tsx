import { ReplitSecretsPanel } from '@/components/editor/ReplitSecretsPanel';

interface ReplitSecretsProps {
  projectId: number;
}

export function ReplitSecrets({ projectId }: ReplitSecretsProps) {
  return <ReplitSecretsPanel projectId={projectId} />;
}
