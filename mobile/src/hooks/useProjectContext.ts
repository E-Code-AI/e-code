import { useCallback, useEffect, useRef, useState } from 'react';
import { File } from '../../../shared/mobile-types';
import { ProjectContextService, ProjectContext, ContextSummary } from '../services/project-context';

export interface UseProjectContextOptions {
  projectId: number;
  token: string;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UseProjectContextResult {
  context: ProjectContext | null;
  summary: ContextSummary | null;
  isLoading: boolean;
  error: Error | null;
  getContextBlock: () => string;
  setActiveFile: (file: File | null, cursorPosition?: { line: number; column: number }) => void;
  recordChange: (fileId: number, filePath: string, changeType: 'created' | 'modified' | 'deleted') => void;
  refresh: () => Promise<void>;
}

const DEFAULT_REFRESH_INTERVAL = 30000;

export function useProjectContext(options: UseProjectContextOptions): UseProjectContextResult {
  const { projectId, token, autoRefresh = true, refreshIntervalMs = DEFAULT_REFRESH_INTERVAL } = options;

  const [context, setContext] = useState<ProjectContext | null>(null);
  const [summary, setSummary] = useState<ContextSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<ProjectContextService | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    serviceRef.current = new ProjectContextService(projectId, token);

    const initialize = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const ctx = await serviceRef.current!.initialize();
        setContext(ctx);
        setSummary(serviceRef.current!.getSummary());
      } catch (err) {
        console.error('[useProjectContext] Initialization failed:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      serviceRef.current = null;
    };
  }, [projectId, token]);

  useEffect(() => {
    if (!autoRefresh || !serviceRef.current) return;

    refreshIntervalRef.current = setInterval(async () => {
      if (!serviceRef.current) return;

      try {
        const ctx = await serviceRef.current.syncFromBackend();
        setContext(ctx);
        setSummary(serviceRef.current.getSummary());
      } catch (err) {
        console.warn('[useProjectContext] Auto-refresh failed:', err);
      }
    }, refreshIntervalMs);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshIntervalMs]);

  const getContextBlock = useCallback((): string => {
    if (!serviceRef.current) return '';
    return serviceRef.current.getContextBlock();
  }, []);

  const setActiveFile = useCallback((file: File | null, cursorPosition?: { line: number; column: number }) => {
    if (!serviceRef.current) return;

    serviceRef.current.setActiveFile(file, cursorPosition);
    setContext(serviceRef.current.getContext());
    setSummary(serviceRef.current.getSummary());
  }, []);

  const recordChange = useCallback((fileId: number, filePath: string, changeType: 'created' | 'modified' | 'deleted') => {
    if (!serviceRef.current) return;

    serviceRef.current.recordChange(fileId, filePath, changeType);
    setContext(serviceRef.current.getContext());
    setSummary(serviceRef.current.getSummary());
  }, []);

  const refresh = useCallback(async () => {
    if (!serviceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const ctx = await serviceRef.current.syncFromBackend();
      setContext(ctx);
      setSummary(serviceRef.current.getSummary());
    } catch (err) {
      console.error('[useProjectContext] Refresh failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    context,
    summary,
    isLoading,
    error,
    getContextBlock,
    setActiveFile,
    recordChange,
    refresh,
  };
}

export default useProjectContext;
