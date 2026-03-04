/**
 * useRunnerWorkspace
 *
 * Manages the lifecycle of an optional external Runner workspace for a project.
 * - When Runner is not configured on the server, isRunnerEnabled = false and all
 *   operations are no-ops — the existing built-in terminal/preview are used.
 * - When Runner is configured, exposes start/stop/token helpers and tracks status.
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface RunnerStatus {
  enabled: boolean;
}

interface RunnerWorkspace {
  exists: boolean;
  id?: number;
  projectId?: number;
  workspaceId?: string;
  status?: 'starting' | 'running' | 'stopped' | 'error';
  previewUrl?: string | null;
  runnerUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RunnerToken {
  token: string;
  workspaceId: string;
  runnerUrl: string | null;
  previewUrl: string | null;
}

export function useRunnerWorkspace(projectId: string | number | undefined) {
  const qc = useQueryClient();
  const pid = projectId ? String(projectId) : null;

  const { data: statusData } = useQuery<RunnerStatus>({
    queryKey: ['/api/runner/status'],
    enabled: !!pid,
    staleTime: 60_000,
  });

  const isRunnerEnabled = statusData?.enabled ?? false;

  const { data: workspace, isLoading } = useQuery<RunnerWorkspace>({
    queryKey: ['/api/runner/workspaces', pid],
    enabled: !!pid && isRunnerEnabled,
    refetchInterval: (query) => {
      const data = query.state.data as RunnerWorkspace | undefined;
      if (data?.status === 'starting') return 3000;
      return false;
    },
  });

  const startMutation = useMutation({
    mutationFn: () =>
      apiRequest('POST', `/api/runner/workspaces/${pid}`).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/runner/workspaces', pid] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () =>
      apiRequest('DELETE', `/api/runner/workspaces/${pid}`).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/runner/workspaces', pid] });
    },
  });

  const getToken = useCallback(async (): Promise<RunnerToken | null> => {
    if (!pid || !isRunnerEnabled) return null;
    const res = await apiRequest('GET', `/api/runner/workspaces/${pid}/token`);
    if (!res.ok) return null;
    return res.json();
  }, [pid, isRunnerEnabled]);

  const isActive = workspace?.exists && workspace.status === 'running';
  const isStarting = workspace?.exists && workspace.status === 'starting';

  return {
    isRunnerEnabled,
    workspace,
    isLoading,
    isActive,
    isStarting,
    startWorkspace: startMutation.mutate,
    stopWorkspace: stopMutation.mutate,
    isStarting: startMutation.isPending || isStarting,
    isStopping: stopMutation.isPending,
    getToken,
  };
}
