import { Card, EmptyState, Textarea } from '../../../../packages/ui/src';
import type { ArchitecturePlan } from './types';

export function ArchitectureEditor({ architecture }: { architecture?: ArchitecturePlan }) {
  if (!architecture) {
    return (
      <Card className="ecode-generator-card">
        <h2>Architecture</h2>
        <EmptyState title="Architecture pending" description="Routes, API, schema and Mermaid diagram arrive from the generation stream." />
      </Card>
    );
  }

  return (
    <Card className="ecode-generator-card">
      <h2>Architecture</h2>
      <dl className="ecode-architecture-list">
        <div><dt>Routes</dt><dd>{architecture.routes.join(', ')}</dd></div>
        <div><dt>API</dt><dd>{architecture.apiEndpoints.join(', ')}</dd></div>
      </dl>
      <Textarea aria-label="Database schema" value={architecture.databaseSchema} readOnly />
      <pre className="ecode-mermaid">{architecture.mermaid}</pre>
    </Card>
  );
}
