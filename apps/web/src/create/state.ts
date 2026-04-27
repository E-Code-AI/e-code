import type { BootEvent, BootStage, CreateProjectRequest, CreationMethod } from './types';

export interface CreateFlowState {
  step: 'method' | 'configure' | 'boot' | 'done';
  method: CreationMethod;
  request: CreateProjectRequest;
  bootEvents: BootEvent[];
  error?: string;
}

export type CreateFlowAction =
  | { type: 'select_method'; method: CreationMethod }
  | { type: 'configure'; patch: Partial<CreateProjectRequest> }
  | { type: 'boot_event'; event: BootEvent }
  | { type: 'fail'; message: string }
  | { type: 'reset_error' };

export function createInitialState(partial: Partial<CreateProjectRequest> = {}): CreateFlowState {
  return {
    step: 'method',
    method: partial.method ?? 'template',
    request: {
      method: partial.method ?? 'template',
      name: partial.name ?? '',
      visibility: partial.visibility ?? 'private',
      region: partial.region ?? 'us-central1',
      secrets: partial.secrets ?? [],
      ...partial,
    },
    bootEvents: [],
  };
}

export function createFlowReducer(state: CreateFlowState, action: CreateFlowAction): CreateFlowState {
  switch (action.type) {
    case 'select_method':
      return {
        ...state,
        step: 'configure',
        method: action.method,
        request: { ...state.request, method: action.method },
        error: undefined,
      };
    case 'configure':
      return {
        ...state,
        request: { ...state.request, ...action.patch },
        error: undefined,
      };
    case 'boot_event': {
      const nextEvents = [...state.bootEvents, action.event];
      return {
        ...state,
        step: action.event.stage === 'ready' ? 'done' : 'boot',
        bootEvents: nextEvents,
        error: action.event.stage === 'failed' ? action.event.message : undefined,
      };
    }
    case 'fail':
      return { ...state, error: action.message };
    case 'reset_error':
      return { ...state, error: undefined };
    default:
      return state;
  }
}

export function latestBootStage(events: BootEvent[]): BootStage {
  return events.at(-1)?.stage ?? 'queued';
}

export function bootProgress(events: BootEvent[]): number {
  return events.reduce((progress, event) => Math.max(progress, event.progress), 0);
}
