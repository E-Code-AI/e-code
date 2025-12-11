/**
 * Autonomous Build State Store
 * 
 * Shared state for autonomous workspace creation that can be consumed by:
 * - PreviewPanel (splash screens during builds)
 * - ReplitAgentPanelV3 (inline chat messages)
 * - UnifiedIDELayout (coordination)
 */

import { create } from 'zustand';

export type AutonomousBuildPhase = 'planning' | 'scaffolding' | 'building' | 'styling' | 'finalizing' | 'complete' | 'error' | null;
export type AutonomousBuildMode = 'design-first' | 'full-app' | null;

export interface AutonomousBuildTask {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress?: number;
}

interface AutonomousBuildState {
  isActive: boolean;
  phase: AutonomousBuildPhase;
  progress: number;
  currentTask: string | null;
  tasks: AutonomousBuildTask[];
  buildMode: AutonomousBuildMode;
  planTitle: string | null;
  featureList: string[];
  planText: string | null;
  errorMessage: string | null;
  projectUrl: string | null;
  projectId: number | null;
  sessionId: string | null;
  conversationId: number | null;
  inlineMode: boolean;
}

interface AutonomousBuildActions {
  startBuild: (params: { projectId: number; sessionId?: string; conversationId?: number }) => void;
  setPhase: (phase: AutonomousBuildPhase) => void;
  setProgress: (progress: number) => void;
  setCurrentTask: (task: string | null) => void;
  setTasks: (tasks: AutonomousBuildTask[]) => void;
  updateTask: (taskId: string, updates: Partial<AutonomousBuildTask>) => void;
  setBuildMode: (mode: AutonomousBuildMode) => void;
  setPlan: (params: { planTitle?: string; featureList?: string[]; planText?: string }) => void;
  setError: (message: string | null) => void;
  setComplete: (projectUrl?: string) => void;
  setInlineMode: (enabled: boolean) => void;
  reset: () => void;
}

const initialState: AutonomousBuildState = {
  isActive: false,
  phase: null,
  progress: 0,
  currentTask: null,
  tasks: [],
  buildMode: null,
  planTitle: null,
  featureList: [],
  planText: null,
  errorMessage: null,
  projectUrl: null,
  projectId: null,
  sessionId: null,
  conversationId: null,
  inlineMode: true,
};

export const useAutonomousBuildStore = create<AutonomousBuildState & AutonomousBuildActions>((set) => ({
  ...initialState,

  startBuild: ({ projectId, sessionId, conversationId }) => {
    set({
      isActive: true,
      phase: 'planning',
      progress: 0,
      currentTask: 'Initializing workspace...',
      tasks: [],
      buildMode: null,
      planTitle: null,
      featureList: [],
      planText: null,
      errorMessage: null,
      projectUrl: null,
      projectId,
      sessionId: sessionId || null,
      conversationId: conversationId || null,
    });
  },

  setPhase: (phase) => {
    set((state) => {
      let progress = state.progress;
      if (phase === 'planning') progress = Math.max(progress, 10);
      if (phase === 'scaffolding') progress = Math.max(progress, 30);
      if (phase === 'building') progress = Math.max(progress, 50);
      if (phase === 'styling') progress = Math.max(progress, 70);
      if (phase === 'finalizing') progress = Math.max(progress, 90);
      if (phase === 'complete') progress = 100;
      return { phase, progress };
    });
  },

  setProgress: (progress) => set({ progress: Math.min(100, Math.max(0, progress)) }),

  setCurrentTask: (currentTask) => set({ currentTask }),

  setTasks: (tasks) => set({ tasks }),

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  },

  setBuildMode: (buildMode) => set({ buildMode }),

  setPlan: ({ planTitle, featureList, planText }) => {
    set((state) => ({
      planTitle: planTitle ?? state.planTitle,
      featureList: featureList ?? state.featureList,
      planText: planText ?? state.planText,
    }));
  },

  setError: (errorMessage) => set({ phase: 'error', errorMessage }),

  setComplete: (projectUrl) => set({ phase: 'complete', progress: 100, isActive: false, projectUrl: projectUrl || null }),

  setInlineMode: (inlineMode) => set({ inlineMode }),

  reset: () => set(initialState),
}));

export default useAutonomousBuildStore;
