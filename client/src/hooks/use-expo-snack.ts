// @ts-nocheck
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface SnackSession {
  id: string;
  url: string;
  webPreviewUrl: string;
  qrCodeUrl: string;
  expoUrl: string;
  connectedClients: number;
  state: 'online' | 'offline' | 'error';
}

export interface CreateSnackOptions {
  name?: string;
  description?: string;
  files: Record<string, string>;
  dependencies?: Record<string, string>;
  sdkVersion?: string;
}

export function useExpoSnack(projectId: string | number) {
  const queryClient = useQueryClient();
  const projectIdStr = String(projectId);

  const { data: session, isLoading, error, refetch } = useQuery<SnackSession | null>({
    queryKey: ['/api/expo-snack/session', projectIdStr],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/expo-snack/session/${projectIdStr}`, { credentials: 'include' });
        if (response.status === 404) {
          return null;
        }
        const data = await response.json();
        return data.session || null;
      } catch {
        return null;
      }
    },
    staleTime: 30000,
    refetchInterval: 10000,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (options: CreateSnackOptions) => {
      return apiRequest('POST', `/api/expo-snack/session/${projectIdStr}`, options);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expo-snack/session', projectIdStr] });
    },
  });

  const updateFilesMutation = useMutation({
    mutationFn: async (files: Record<string, string>) => {
      return apiRequest('PATCH', `/api/expo-snack/session/${projectIdStr}/files`, { files });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expo-snack/session', projectIdStr] });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/expo-snack/session/${projectIdStr}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expo-snack/session', projectIdStr] });
    },
  });

  const createSession = useCallback(async (options: CreateSnackOptions) => {
    const result = await createSessionMutation.mutateAsync(options);
    return result.session as SnackSession;
  }, [createSessionMutation]);

  const updateFiles = useCallback(async (files: Record<string, string>) => {
    await updateFilesMutation.mutateAsync(files);
  }, [updateFilesMutation]);

  const closeSession = useCallback(async () => {
    await closeSessionMutation.mutateAsync();
  }, [closeSessionMutation]);

  return {
    session,
    isLoading,
    error,
    refetch,
    createSession,
    updateFiles,
    closeSession,
    isCreating: createSessionMutation.isPending,
    isUpdating: updateFilesMutation.isPending,
    isClosing: closeSessionMutation.isPending,
  };
}

export function useExpoSnackEmbed() {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const generateEmbed = useCallback(async (options: {
    snackId?: string;
    code?: string;
    dependencies?: string;
    name?: string;
    platform?: 'web' | 'ios' | 'android';
    preview?: boolean;
    theme?: 'light' | 'dark';
    height?: number;
  }) => {
    const data = await apiRequest<any>('POST', '/api/expo-snack/embed', options);
    setEmbedHtml(data.html);
    return data.html;
  }, []);

  const generateIframeUrl = useCallback(async (options: {
    snackId?: string;
    code?: string;
    name?: string;
    platform?: 'web' | 'ios' | 'android';
    preview?: boolean;
    theme?: 'light' | 'dark';
  }) => {
    const data = await apiRequest<any>('POST', '/api/expo-snack/iframe-url', options);
    setIframeUrl(data.url);
    return data.url;
  }, []);

  return {
    embedHtml,
    iframeUrl,
    generateEmbed,
    generateIframeUrl,
  };
}

export function useExpoSnackStatus() {
  return useQuery({
    queryKey: ['/api/expo-snack/status'],
    staleTime: 60000,
  });
}
