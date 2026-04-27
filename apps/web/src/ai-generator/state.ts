import type { ArchitecturePlan, GeneratorEvent, GeneratedFileDelta, StackOption, StructuredSpec } from './types';

export interface AiGeneratorState {
  generationId?: string;
  spec?: StructuredSpec;
  stacks: StackOption[];
  selectedStackId?: string;
  architecture?: ArchitecturePlan;
  files: GeneratedFileDelta[];
  logs: string[];
  progress: number;
  previewUrl?: string;
  workspaceUrl?: string;
  commitSha?: string;
  error?: string;
}

export type AiGeneratorAction =
  | { type: 'started'; generationId: string; spec: StructuredSpec }
  | { type: 'select_stack'; stackId: string }
  | { type: 'event'; event: GeneratorEvent }
  | { type: 'error'; message: string }
  | { type: 'reset_error' };

export const initialAiGeneratorState: AiGeneratorState = {
  stacks: [],
  files: [],
  logs: [],
  progress: 0,
};

export function aiGeneratorReducer(state: AiGeneratorState, action: AiGeneratorAction): AiGeneratorState {
  switch (action.type) {
    case 'started':
      return { ...state, generationId: action.generationId, spec: action.spec, progress: 5, error: undefined };
    case 'select_stack':
      return { ...state, selectedStackId: action.stackId };
    case 'event':
      return applyGeneratorEvent(state, action.event);
    case 'error':
      return { ...state, error: action.message };
    case 'reset_error':
      return { ...state, error: undefined };
    default:
      return state;
  }
}

export function applyGeneratorEvent(state: AiGeneratorState, event: GeneratorEvent): AiGeneratorState {
  return {
    ...state,
    spec: event.spec ?? state.spec,
    stacks: event.stacks ?? state.stacks,
    selectedStackId: state.selectedStackId ?? event.stacks?.find((stack) => stack.recommended)?.id,
    architecture: event.architecture ?? state.architecture,
    files: event.file ? upsertFileDelta(state.files, event.file) : state.files,
    logs: event.type === 'build_log' || event.type === 'correction_attempt' ? [...state.logs, event.message] : state.logs,
    progress: Math.max(state.progress, event.progress),
    previewUrl: event.previewUrl ?? state.previewUrl,
    workspaceUrl: event.workspaceUrl ?? state.workspaceUrl,
    commitSha: event.commitSha ?? state.commitSha,
    error: event.type === 'failed' ? event.message : state.error,
  };
}

function upsertFileDelta(files: GeneratedFileDelta[], file: GeneratedFileDelta): GeneratedFileDelta[] {
  const index = files.findIndex((item) => item.path === file.path);
  if (index === -1) return [...files, file];
  const next = [...files];
  next[index] = file;
  return next;
}
