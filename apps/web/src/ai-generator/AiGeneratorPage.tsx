import { AnimatePresence, motion } from 'framer-motion';
import { FileCode2, Paperclip, Play, RotateCcw, Sparkles } from 'lucide-react';
import { useReducer, useRef, useState } from 'react';
import { Banner, Button, Card, EmptyState, FileDropzone, Progress, Textarea } from '../../../../packages/ui/src';
import { AiGeneratorApi } from './api';
import { ArchitectureEditor } from './ArchitectureEditor';
import { FileStreamTree } from './FileStreamTree';
import { initialAiGeneratorState, aiGeneratorReducer } from './state';
import type { ArchitecturePlan, StackOption, StructuredSpec } from './types';
import './ai-generator.css';

const examples = [
  'Blog with Google auth, comments, moderation queue, and Cloud Run deploy',
  'Internal CRM with roles, audit log, charts, and CSV import',
  'Marketplace with Stripe billing, seller dashboard, and responsive mobile UI',
];

export interface AiGeneratorPageProps {
  api?: AiGeneratorApi;
}

export function AiGeneratorPage({ api = new AiGeneratorApi() }: AiGeneratorPageProps) {
  const [state, dispatch] = useReducer(aiGeneratorReducer, initialAiGeneratorState);
  const [description, setDescription] = useState(new URLSearchParams(location.search).get('draft') ?? '');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<EventSource | null>(null);

  async function attach(files: File[]) {
    setBusy(true);
    try {
      const keys: string[] = [];
      for (const file of files) {
        const attachment = await api.createAttachmentUpload(file);
        await api.uploadAttachment(file, attachment);
        keys.push(attachment.objectKey);
      }
      setAttachments((current) => [...current, ...keys]);
    } catch (reason) {
      dispatch({ type: 'error', message: reason instanceof Error ? reason.message : 'Attachment upload failed' });
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      const started = await api.start({ description, attachmentObjectKeys: attachments });
      dispatch({ type: 'started', generationId: started.generationId, spec: started.draftSpec });
      streamRef.current?.close();
      streamRef.current = api.connectStream(started.generationId, (event) => dispatch({ type: 'event', event }));
    } catch (reason) {
      dispatch({ type: 'error', message: reason instanceof Error ? reason.message : 'Generation failed to start' });
    } finally {
      setBusy(false);
    }
  }

  async function approve(spec: StructuredSpec, selectedStack: StackOption, architecture: ArchitecturePlan) {
    if (!state.generationId) return;
    setBusy(true);
    try {
      await api.approve(state.generationId, { spec, selectedStackId: selectedStack.id, architecture });
    } catch (reason) {
      dispatch({ type: 'error', message: reason instanceof Error ? reason.message : 'Approval failed' });
    } finally {
      setBusy(false);
    }
  }

  async function iterate() {
    if (!state.generationId || !prompt.trim()) return;
    setBusy(true);
    try {
      await api.iterate({ generationId: state.generationId, prompt });
      setPrompt('');
    } catch (reason) {
      dispatch({ type: 'error', message: reason instanceof Error ? reason.message : 'Iteration failed' });
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!state.generationId) return;
    await api.undoLastChange(state.generationId);
  }

  const selectedStack = state.stacks.find((stack) => stack.id === state.selectedStackId) ?? state.stacks.find((stack) => stack.recommended);

  return (
    <main className="ecode-ai-generator" aria-label="AI app generator">
      <section className="ecode-generator-prompt">
        <div>
          <h1>Generate app</h1>
          <p>Describe the product, validate the spec, choose a stack, then stream code into a Cloud Run-ready workspace.</p>
        </div>
        <Textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} placeholder="Describe the app, users, data, integrations, and quality bar" />
        <div className="ecode-example-row">
          {examples.map((example) => (
            <button key={example} onClick={() => setDescription(example)}>{example}</button>
          ))}
        </div>
        <FileDropzone onFiles={attach} />
        <div className="ecode-generator-actions">
          <span><Paperclip size={14} aria-hidden /> {attachments.length} attachments</span>
          <Button onClick={start} loading={busy} disabled={!description.trim()}>
            <Play size={16} aria-hidden /> Start
          </Button>
        </div>
      </section>

      {state.error && <Banner tone="danger"><strong>Generator error</strong> {state.error}</Banner>}
      <Progress value={state.progress} />

      <AnimatePresence>
        {state.spec ? (
          <motion.section className="ecode-generator-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <SpecReview spec={state.spec} />
            <StackChooser stacks={state.stacks} selectedStackId={state.selectedStackId} onSelect={(stackId) => dispatch({ type: 'select_stack', stackId })} />
            <ArchitectureEditor architecture={state.architecture} />
            <Card className="ecode-generator-card">
              <h2>Generation</h2>
              <FileStreamTree files={state.files} logs={state.logs} />
              <div className="ecode-generator-actions">
                <Button
                  onClick={() => state.spec && selectedStack && state.architecture && approve(state.spec, selectedStack, state.architecture)}
                  disabled={!selectedStack || !state.architecture}
                  loading={busy}
                >
                  <Sparkles size={16} aria-hidden /> Generate and boot
                </Button>
                <Button variant="secondary" onClick={undo} disabled={!state.commitSha}>
                  <RotateCcw size={16} aria-hidden /> Undo last AI change
                </Button>
              </div>
            </Card>
            <Card className="ecode-generator-card">
              <h2>Iterate</h2>
              {state.previewUrl ? <iframe title="Generated app preview" src={state.previewUrl} /> : <EmptyState title="Preview pending" description="Cloud Run preview URL appears when boot completes." />}
              <Textarea value={prompt} onChange={(event) => setPrompt(event.currentTarget.value)} placeholder="Ask for a change after preview is live" />
              <Button onClick={iterate} loading={busy} disabled={!state.generationId || !prompt.trim()}>Apply change</Button>
              {state.workspaceUrl && <a className="ecode-primary-link" href={state.workspaceUrl}>Open workspace</a>}
            </Card>
          </motion.section>
        ) : (
          <EmptyState title="Awaiting description" description="The generator starts from a validated template and streams every backend event into this page." />
        )}
      </AnimatePresence>
    </main>
  );
}

function SpecReview({ spec }: { spec: StructuredSpec }) {
  return (
    <Card className="ecode-generator-card">
      <h2>{spec.title}</h2>
      <p>{spec.summary}</p>
      <h3>Features</h3>
      <ul>{spec.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      <h3>Data model</h3>
      <ul>{spec.dataModel.map((entity) => <li key={entity.entity}><strong>{entity.entity}</strong>: {entity.fields.join(', ')}</li>)}</ul>
    </Card>
  );
}

function StackChooser({ stacks, selectedStackId, onSelect }: { stacks: StackOption[]; selectedStackId?: string; onSelect(stackId: string): void }) {
  return (
    <Card className="ecode-generator-card">
      <h2>Stack</h2>
      {stacks.length === 0 ? <EmptyState title="Stack pending" description="The backend model returns one recommendation and two alternatives." /> : (
        <div className="ecode-stack-list">
          {stacks.map((stack) => (
            <button key={stack.id} aria-pressed={selectedStackId === stack.id} onClick={() => onSelect(stack.id)}>
              <FileCode2 aria-hidden />
              <span>{stack.label}</span>
              <small>{stack.reason}</small>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
