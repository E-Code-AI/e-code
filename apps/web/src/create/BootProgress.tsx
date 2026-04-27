import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { Banner, Button, Progress } from '../../../../packages/ui/src';
import { bootProgress, latestBootStage } from './state';
import type { BootEvent } from './types';

export interface BootProgressProps {
  events: BootEvent[];
  previewUrl?: string;
  workspaceUrl?: string;
  onRetry(): void;
}

export function BootProgress({ events, previewUrl, workspaceUrl, onRetry }: BootProgressProps) {
  const stage = latestBootStage(events);
  const progress = bootProgress(events);
  const failed = stage === 'failed';
  const ready = stage === 'ready';

  return (
    <section className="ecode-boot-progress" aria-live="polite">
      <div className="ecode-boot-header">
        {ready ? <CheckCircle2 aria-hidden /> : failed ? <CircleAlert aria-hidden /> : <Loader2 aria-hidden className="ecode-spin" />}
        <div>
          <h2>{ready ? 'Workspace ready' : failed ? 'Boot failed' : 'Booting workspace'}</h2>
          <p>Cloud Run, GCS copy, dependency resolution and preview are tracked from backend events.</p>
        </div>
      </div>
      <Progress value={progress} />
      <ol className="ecode-boot-log">
        {events.map((event, index) => (
          <li key={`${event.at}-${index}`} data-stage={event.stage}>
            <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>
            <span>{event.message}</span>
          </li>
        ))}
      </ol>
      {failed && (
        <Banner tone="danger">
          <strong>Creation interrupted</strong>
          <Button variant="secondary" onClick={onRetry}>Retry boot</Button>
          {workspaceUrl && <a className="ecode-link-button" href={workspaceUrl}>Open anyway</a>}
        </Banner>
      )}
      {ready && (
        <div className="ecode-boot-actions">
          {workspaceUrl && <a className="ecode-primary-link" href={workspaceUrl}>Open editor</a>}
          {previewUrl && <a className="ecode-secondary-link" href={previewUrl}>Open preview</a>}
        </div>
      )}
    </section>
  );
}
