import { GitBranch } from 'lucide-react';
import { useState } from 'react';
import { Banner, Button, Card, Input, Select } from '../../../../packages/ui/src';
import { CreateFlowApi } from './api';
import type { GitStackDetection } from './types';

export interface GitImportPanelProps {
  api?: CreateFlowApi;
  onDetected(detection: GitStackDetection, gitUrl: string, provider: 'github' | 'gitlab' | 'bitbucket'): void;
}

export function GitImportPanel({ api = new CreateFlowApi(), onDetected }: GitImportPanelProps) {
  const [gitUrl, setGitUrl] = useState('');
  const [provider, setProvider] = useState<'github' | 'gitlab' | 'bitbucket'>('github');
  const [detection, setDetection] = useState<GitStackDetection>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function detect() {
    setBusy(true);
    setError(undefined);
    try {
      const result = await api.detectGitStack(gitUrl);
      setDetection(result);
      onDetected(result, gitUrl, provider);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Git detection failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="ecode-git-import">
      <div className="ecode-git-import-title">
        <GitBranch aria-hidden />
        <h3>Import Git repository</h3>
      </div>
      <div className="ecode-git-import-grid">
        <Select
          value={provider}
          onValueChange={(value) => setProvider(value as 'github' | 'gitlab' | 'bitbucket')}
          items={[
            { value: 'github', label: 'GitHub' },
            { value: 'gitlab', label: 'GitLab' },
            { value: 'bitbucket', label: 'Bitbucket' },
          ]}
        />
        <Input aria-label="Git repository URL" value={gitUrl} onChange={(event) => setGitUrl(event.currentTarget.value)} placeholder="https://github.com/org/repo" />
        <Button onClick={detect} loading={busy} disabled={!gitUrl}>Detect stack</Button>
      </div>
      {error && <Banner tone="danger"><strong>Import unavailable</strong> {error}</Banner>}
      {detection && (
        <dl className="ecode-stack-detection">
          <div><dt>Framework</dt><dd>{detection.framework}</dd></div>
          <div><dt>Language</dt><dd>{detection.language}</dd></div>
          <div><dt>Runtime</dt><dd>{detection.runtime}</dd></div>
          <div><dt>Environment</dt><dd>{detection.envKeys.join(', ') || 'No keys detected'}</dd></div>
        </dl>
      )}
    </Card>
  );
}
