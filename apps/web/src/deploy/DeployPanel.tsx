import { Cloud, Globe2, RotateCcw, Rocket, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Banner, Button, Card, DataTable, EmptyState, Input, Select } from '../../../../packages/ui/src';
import { DeployApi } from './api';
import type { DeploymentProject, Release } from './types';
import './deploy.css';

const regions = ['us-central1', 'europe-west1', 'asia-northeast1'];

export function DeployPanel({ projectId, api = new DeployApi() }: { projectId: string; api?: DeployApi }) {
  const [project, setProject] = useState<DeploymentProject>();
  const [release, setRelease] = useState<Release>();
  const [region, setRegion] = useState('us-central1');
  const [domain, setDomain] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const streamRef = useRef<EventSource | null>(null);

  useEffect(() => {
    api.getProject(projectId).then((data) => {
      setProject(data);
      setRegion(data.region);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Deployment data unavailable'));
  }, [api, projectId]);

  async function startDeploy(environment: 'preview' | 'production') {
    if (!project) return;
    setBusy(true);
    setError(undefined);
    try {
      const next = await api.deploy({
        projectId,
        serviceName: project.serviceName,
        region,
        environment,
        envSecretNames: project.secrets.filter((secret) => secret.environment === environment).map((secret) => secret.secretManagerName),
        domain: environment === 'production' ? domain || project.freeDomain : undefined,
      });
      setRelease(next);
      streamRef.current?.close();
      streamRef.current = api.connectLogs(next.id, (line) => setLogs((current) => [...current, line]));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Deploy failed');
    } finally {
      setBusy(false);
    }
  }

  if (!project) {
    return <EmptyState title="Deployment loading" description="Project release data is loaded from the deployment API." />;
  }

  return (
    <section className="ecode-deploy-panel" aria-label="Deploy">
      <Card className="ecode-deploy-card">
        <div className="ecode-deploy-header">
          <div><h1>Deploy</h1><p>Cloud Build to Artifact Registry, then Cloud Run traffic control.</p></div>
          <Button onClick={() => startDeploy('production')} loading={busy}><Rocket size={16} aria-hidden /> Deploy</Button>
        </div>
        {error && <Banner tone="danger"><strong>Deploy error</strong> {error}</Banner>}
        <div className="ecode-deploy-grid">
          <label><span>Region</span><Select value={region} onValueChange={setRegion} items={regions.map((value) => ({ value, label: value }))} /></label>
          <label><span>Production domain</span><Input value={domain} onChange={(event) => setDomain(event.currentTarget.value)} placeholder={project.freeDomain} /></label>
          <Button variant="secondary" onClick={() => startDeploy('preview')} loading={busy}><Cloud size={16} aria-hidden /> Preview deploy</Button>
        </div>
      </Card>

      <Card className="ecode-deploy-card">
        <h2>Releases</h2>
        <DataTable
          data={project.releases}
          columns={[
            { id: 'sha', header: 'Commit', accessor: (item) => item.commitSha.slice(0, 8) },
            { id: 'status', header: 'Status', accessor: (item) => item.status },
            { id: 'region', header: 'Region', accessor: (item) => item.region },
            { id: 'duration', header: 'Duration', accessor: (item) => `${item.durationSec ?? 0}s` },
            { id: 'actions', header: 'Actions', accessor: (item) => (
              <span className="ecode-release-actions">
                <Button size="xs" onClick={() => api.promote(projectId, item.id)}><ShieldCheck size={14} aria-hidden /> Promote</Button>
                <Button size="xs" variant="secondary" onClick={() => api.rollback(projectId, item.id)}><RotateCcw size={14} aria-hidden /> Rollback</Button>
              </span>
            ) },
          ]}
        />
      </Card>

      <Card className="ecode-deploy-card">
        <h2><Globe2 size={18} aria-hidden /> Domains</h2>
        <ul>{[project.freeDomain, ...project.customDomains].map((item) => <li key={item}>{item}</li>)}</ul>
      </Card>

      <Card className="ecode-deploy-card">
        <h2>Build logs</h2>
        <pre>{logs.join('\n') || (release ? `Waiting for Cloud Logging stream for ${release.id}` : 'No release selected')}</pre>
      </Card>
    </section>
  );
}
