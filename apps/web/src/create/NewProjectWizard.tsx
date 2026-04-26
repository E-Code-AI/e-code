import { AnimatePresence, motion } from 'framer-motion';
import { Bot, FileArchive, GitBranch, LayoutTemplate, Plus } from 'lucide-react';
import { useReducer, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Textarea,
} from '../../../../packages/ui/src';
import { TemplateGallery } from '../templates/TemplateGallery';
import { CreateFlowApi } from './api';
import { BootProgress } from './BootProgress';
import { GitImportPanel } from './GitImportPanel';
import { createFlowReducer, createInitialState } from './state';
import type { CloudRunRegion, CreateProjectResponse, CreationMethod, ProjectVisibility, TemplateSummary } from './types';

const methods: Array<{ id: CreationMethod; label: string; icon: typeof LayoutTemplate }> = [
  { id: 'template', label: 'Template', icon: LayoutTemplate },
  { id: 'git', label: 'Git repo', icon: GitBranch },
  { id: 'zip', label: 'Upload zip', icon: FileArchive },
  { id: 'empty', label: 'Empty', icon: Plus },
  { id: 'ai', label: 'AI', icon: Bot },
];

const regions: CloudRunRegion[] = ['us-central1', 'europe-west1', 'asia-northeast1'];
const visibilities: ProjectVisibility[] = ['private', 'unlisted', 'public'];

export interface NewProjectWizardProps {
  api?: CreateFlowApi;
  onHandoffToAi?: (draftName: string) => void;
}

export function NewProjectWizard({ api = new CreateFlowApi(), onHandoffToAi }: NewProjectWizardProps) {
  const [state, dispatch] = useReducer(createFlowReducer, createInitialState());
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary>();
  const [response, setResponse] = useState<CreateProjectResponse>();
  const [submitting, setSubmitting] = useState(false);

  function selectTemplate(template: TemplateSummary) {
    setSelectedTemplate(template);
    dispatch({
      type: 'configure',
      patch: {
        templateId: template.id,
        secrets: Object.keys(template.envExample).map((name) => ({ name, value: '', source: '.env.example' })),
      },
    });
  }

  async function createProject() {
    if (state.request.method === 'ai') {
      onHandoffToAi?.(state.request.name);
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createProject(state.request);
      setResponse(result);
      const stream = api.connectBootStream(result.bootSessionId, (event) => dispatch({ type: 'boot_event', event }));
      stream.addEventListener('error', () => {
        dispatch({ type: 'fail', message: 'Boot event stream disconnected' });
        stream.close();
      });
    } catch (reason) {
      dispatch({ type: 'fail', message: reason instanceof Error ? reason.message : 'Project creation failed' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="ecode-new-project" aria-label="Create project">
      <AnimatePresence mode="wait">
        {state.step === 'method' && (
          <motion.section key="method" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <h1>New project</h1>
            <div className="ecode-method-grid">
              {methods.map((method) => {
                const Icon = method.icon;
                return (
                  <button key={method.id} className="ecode-method-card" onClick={() => dispatch({ type: 'select_method', method: method.id })}>
                    <Icon aria-hidden />
                    <span>{method.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.section>
        )}

        {state.step === 'configure' && (
          <motion.section key="configure" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <div className="ecode-create-layout">
              <Card className="ecode-create-config">
                <h2>Configure</h2>
                <Input aria-label="Project name" value={state.request.name} onChange={(event) => dispatch({ type: 'configure', patch: { name: event.currentTarget.value } })} placeholder="acme-dashboard" />
                <label className="ecode-field">
                  <span>Visibility</span>
                  <Select value={state.request.visibility} onValueChange={(value) => dispatch({ type: 'configure', patch: { visibility: value as ProjectVisibility } })} items={visibilities.map((value) => ({ value, label: value }))} />
                </label>
                <label className="ecode-field">
                  <span>Cloud Run region</span>
                  <Select value={state.request.region} onValueChange={(value) => dispatch({ type: 'configure', patch: { region: value as CloudRunRegion } })} items={regions.map((value) => ({ value, label: value }))} />
                </label>
                {state.request.secrets.length > 0 && (
                  <div className="ecode-secret-list">
                    <h3>Initial secrets</h3>
                    {state.request.secrets.map((secret, index) => (
                      <Input
                        key={secret.name}
                        aria-label={`Secret ${secret.name}`}
                        type="password"
                        placeholder={secret.name}
                        value={secret.value}
                        onChange={(event) => {
                          const next = [...state.request.secrets];
                          next[index] = { ...secret, value: event.currentTarget.value };
                          dispatch({ type: 'configure', patch: { secrets: next } });
                        }}
                      />
                    ))}
                  </div>
                )}
                {state.method === 'ai' && (
                  <Textarea
                    aria-label="AI app description"
                    value={state.request.name}
                    onChange={(event) => dispatch({ type: 'configure', patch: { name: event.currentTarget.value } })}
                    placeholder="Describe the app to generate"
                  />
                )}
                <Button onClick={createProject} loading={submitting} disabled={!state.request.name || (state.method === 'template' && !state.request.templateId)}>
                  {state.method === 'ai' ? 'Continue in AI generator' : 'Create project'}
                </Button>
                {state.error && <p role="alert" className="ecode-error">{state.error}</p>}
              </Card>

              <div className="ecode-create-source">
                <div className="ecode-create-tabs" role="tablist" aria-label="Creation method">
                  {methods.map((method) => (
                    <button
                      key={method.id}
                      role="tab"
                      aria-selected={state.method === method.id}
                      onClick={() => dispatch({ type: 'select_method', method: method.id })}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
                {state.method === 'template' && <TemplateGallery api={api} onSelect={selectTemplate} />}
                {state.method === 'git' && (
                  <GitImportPanel
                    api={api}
                    onDetected={(detection, gitUrl, gitProvider) =>
                      dispatch({ type: 'configure', patch: { gitUrl, gitProvider, ecodeManifest: detection.manifest } })
                    }
                  />
                )}
                {state.method === 'zip' && <EmptyState title="Upload zip" description="Upload uses the backend resumable upload contract, then boots the same Cloud Run pipeline." />}
                {state.method === 'empty' && <EmptyState title="Empty project" description="Creates a project record, empty GCS prefix and default Cloud Run dev service." />}
                {state.method === 'ai' && <EmptyState title="AI handoff" description="The next step opens the greenfield AI generator with this draft." />}
                {selectedTemplate && <p className="ecode-selected-template">Selected: {selectedTemplate.name}</p>}
              </div>
            </div>
          </motion.section>
        )}

        {(state.step === 'boot' || state.step === 'done') && (
          <motion.section key="boot" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            <BootProgress events={state.bootEvents} previewUrl={response?.previewUrl} workspaceUrl={response?.workspaceUrl} onRetry={createProject} />
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
