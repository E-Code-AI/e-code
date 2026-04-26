import { Check, Cloud, Code2 } from 'lucide-react';
import { Button, Card } from '../../../../packages/ui/src';

export interface PostCreateTourProps {
  projectName: string;
  templateName?: string;
  onFinish(): void;
}

export function PostCreateTour({ projectName, templateName, onFinish }: PostCreateTourProps) {
  return (
    <Card className="ecode-post-create-tour" role="dialog" aria-labelledby="ecode-tour-title">
      <h2 id="ecode-tour-title">{projectName}</h2>
      <ol>
        <li><Check aria-hidden /> Files copied to Cloud Storage with versioning enabled.</li>
        <li><Cloud aria-hidden /> Cloud Run preview is attached to the workspace session.</li>
        <li><Code2 aria-hidden /> {templateName ? `${templateName} extensions and commands are registered.` : 'Editor commands are registered.'}</li>
      </ol>
      <Button onClick={onFinish}>Start editing</Button>
    </Card>
  );
}
