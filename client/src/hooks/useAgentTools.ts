import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useMemo } from "react";
import type { AiModel } from "@shared/schema";

export interface AgentToolsSettings {
  maxAutonomy: boolean;
  appTesting: boolean;
  extendedThinking: boolean;
  highPowerModels: boolean;
  webSearch: boolean;
}

export interface AgentPreferences {
  extendedThinking: boolean;
  highPowerMode: boolean;
  autoWebSearch: boolean;
  preferredModel: AiModel;
  customInstructions: string | null;
  improvePromptEnabled: boolean;
  progressTabEnabled: boolean;
  pauseResumeEnabled: boolean;
  autoCheckpoints: boolean;
}

export interface ModelInfo {
  id: AiModel;
  name: string;
  description: string;
  category: 'openai' | 'anthropic' | 'google' | 'xai' | 'moonshot';
  tier: 'standard' | 'high-power';
  capabilities: {
    extendedThinking: boolean;
    codeGeneration: boolean;
    maxTokens: number;
    speed: 'fast' | 'medium' | 'slow';
    cost: 'low' | 'medium' | 'high';
  };
}

interface ModelsResponse {
  models: ModelInfo[];
  highPowerModels: AiModel[];
  extendedThinkingModels: AiModel[];
}

interface EffectiveModelResponse {
  effectiveModel: AiModel;
  modelInfo: ModelInfo | null;
  settings: {
    extendedThinking: boolean;
    highPowerMode: boolean;
    autoWebSearch: boolean;
  };
}

interface VideoReplay {
  id: string;
  testSessionId: string;
  projectId: number;
  filename: string;
  url: string;
  duration: number;
  status: 'recording' | 'processing' | 'ready' | 'failed';
  createdAt: string;
  thumbnailUrl?: string;
}

interface VideoReplaysResponse {
  replays: VideoReplay[];
  count: number;
}

const DEFAULT_SETTINGS: AgentToolsSettings = {
  maxAutonomy: false,
  appTesting: true,
  extendedThinking: false,
  highPowerModels: false,
  webSearch: true,
};

/**
 * Hook to manage Agent Tools settings with real API integration
 * Connects to backend preferences and model selection
 */
export function useAgentTools(projectId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user preferences from backend
  const preferencesQuery = useQuery<AgentPreferences>({
    queryKey: ['/api/agent/preferences'],
    staleTime: 30000,
  });

  // Fetch available models
  const modelsQuery = useQuery<ModelsResponse>({
    queryKey: ['/api/agent/models'],
    staleTime: 60000,
  });

  // Fetch effective model based on current settings
  const effectiveModelQuery = useQuery<EffectiveModelResponse>({
    queryKey: ['/api/agent/effective-model', { complexity: 'medium' }],
    enabled: !!preferencesQuery.data,
    staleTime: 10000,
  });

  // Fetch video replays for project
  const videoReplaysQuery = useQuery<VideoReplaysResponse>({
    queryKey: ['/api/agent/testing/replays', projectId],
    queryFn: async () => {
      if (!projectId) return { replays: [], count: 0 };
      return apiRequest<VideoReplaysResponse>("GET", `/api/agent/testing/replays?projectId=${projectId}`);
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  // Convert backend preferences to AgentToolsSettings
  const settings = useMemo((): AgentToolsSettings => {
    const prefs = preferencesQuery.data;
    if (!prefs) return DEFAULT_SETTINGS;

    return {
      maxAutonomy: false, // Max autonomy is session-based, not a preference
      appTesting: true, // App testing is always enabled by default
      extendedThinking: prefs.extendedThinking || false,
      highPowerModels: prefs.highPowerMode || false,
      webSearch: prefs.autoWebSearch ?? true,
    };
  }, [preferencesQuery.data]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<AgentPreferences>) => {
      return apiRequest<AgentPreferences>("PUT", "/api/agent/preferences", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/effective-model'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle settings changes
  const updateSettings = useCallback((newSettings: AgentToolsSettings) => {
    const updates: Partial<AgentPreferences> = {};

    if (newSettings.extendedThinking !== settings.extendedThinking) {
      updates.extendedThinking = newSettings.extendedThinking;
    }
    if (newSettings.highPowerModels !== settings.highPowerModels) {
      updates.highPowerMode = newSettings.highPowerModels;
    }
    if (newSettings.webSearch !== settings.webSearch) {
      updates.autoWebSearch = newSettings.webSearch;
    }

    if (Object.keys(updates).length > 0) {
      updatePreferencesMutation.mutate(updates);
    }
  }, [settings, updatePreferencesMutation]);

  // Toggle individual setting
  const toggleSetting = useCallback((key: keyof AgentToolsSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    
    // Max autonomy and app testing are special - they don't persist as preferences
    if (key === 'maxAutonomy' || key === 'appTesting') {
      // These are handled separately via session management
      return newSettings;
    }
    
    updateSettings(newSettings);
    return newSettings;
  }, [settings, updateSettings]);

  // Set preferred model
  const setPreferredModel = useCallback((model: AiModel) => {
    updatePreferencesMutation.mutate({ preferredModel: model });
  }, [updatePreferencesMutation]);

  // Get model by id
  const getModelInfo = useCallback((modelId: AiModel): ModelInfo | undefined => {
    return modelsQuery.data?.models.find(m => m.id === modelId);
  }, [modelsQuery.data]);

  // Get models by tier
  const getModelsByTier = useCallback((tier: 'standard' | 'high-power'): ModelInfo[] => {
    return modelsQuery.data?.models.filter(m => m.tier === tier) || [];
  }, [modelsQuery.data]);

  // Get models by category
  const getModelsByCategory = useCallback((category: ModelInfo['category']): ModelInfo[] => {
    return modelsQuery.data?.models.filter(m => m.category === category) || [];
  }, [modelsQuery.data]);

  return {
    // Settings
    settings,
    updateSettings,
    toggleSetting,
    isUpdating: updatePreferencesMutation.isPending,
    
    // Preferences
    preferences: preferencesQuery.data,
    isLoadingPreferences: preferencesQuery.isLoading,
    preferencesError: preferencesQuery.error,
    
    // Models
    models: modelsQuery.data?.models || [],
    highPowerModels: modelsQuery.data?.highPowerModels || [],
    extendedThinkingModels: modelsQuery.data?.extendedThinkingModels || [],
    isLoadingModels: modelsQuery.isLoading,
    
    // Effective model
    effectiveModel: effectiveModelQuery.data?.effectiveModel,
    effectiveModelInfo: effectiveModelQuery.data?.modelInfo,
    
    // Model helpers
    setPreferredModel,
    getModelInfo,
    getModelsByTier,
    getModelsByCategory,
    
    // Video replays
    videoReplays: videoReplaysQuery.data?.replays || [],
    videoReplayCount: videoReplaysQuery.data?.count || 0,
    isLoadingVideoReplays: videoReplaysQuery.isLoading,
    
    // Refetch
    refetchPreferences: preferencesQuery.refetch,
    refetchModels: modelsQuery.refetch,
    refetchVideoReplays: videoReplaysQuery.refetch,
  };
}

/**
 * Hook for extended thinking streaming
 */
export function useExtendedThinking(sessionId?: string) {
  const queryClient = useQueryClient();
  
  // Fetch thinking steps for a session
  const thinkingQuery = useQuery({
    queryKey: ['/api/agent/thinking', sessionId],
    queryFn: async () => {
      if (!sessionId) return { steps: [], isThinking: false };
      return apiRequest<{
        steps: Array<{
          id: string;
          type: 'reasoning' | 'analysis' | 'planning';
          title: string;
          content: string;
          status: 'active' | 'completed' | 'error';
          timestamp: string;
          duration?: number;
        }>;
        isThinking: boolean;
      }>("GET", `/api/agent/thinking/${sessionId}`);
    },
    enabled: !!sessionId,
    refetchInterval: (query) => {
      return query.state.data?.isThinking ? 1000 : false;
    },
    staleTime: 500,
  });

  return {
    steps: thinkingQuery.data?.steps || [],
    isThinking: thinkingQuery.data?.isThinking || false,
    isLoading: thinkingQuery.isLoading,
    error: thinkingQuery.error,
    refetch: thinkingQuery.refetch,
  };
}

/**
 * Hook for web search functionality
 */
export function useWebSearch() {
  const { toast } = useToast();
  
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      return apiRequest<{
        query: string;
        results: Array<{
          title: string;
          url: string;
          snippet: string;
          source: string;
          publishedDate?: string;
        }>;
        totalResults: number;
        searchTime: number;
      }>("POST", "/api/agent/web-search", { query });
    },
    onError: (error: Error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    search: searchMutation.mutate,
    searchAsync: searchMutation.mutateAsync,
    results: searchMutation.data?.results || [],
    isSearching: searchMutation.isPending,
    error: searchMutation.error,
  };
}

/**
 * Hook for app testing functionality
 */
export function useAppTesting(projectId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch test sessions for project
  const testSessionsQuery = useQuery({
    queryKey: ['/api/agent/testing/sessions', projectId],
    queryFn: async () => {
      if (!projectId) return { sessions: [], count: 0 };
      return apiRequest<{
        sessions: Array<{
          id: string;
          projectId: number;
          status: 'pending' | 'running' | 'passed' | 'failed';
          testPlan: string;
          results?: any;
          duration?: number;
          videoUrl?: string;
          createdAt: string;
          completedAt?: string;
        }>;
        count: number;
      }>("GET", `/api/agent/testing/sessions?projectId=${projectId}`);
    },
    enabled: !!projectId,
    staleTime: 10000,
  });

  // Start a new test
  const startTestMutation = useMutation({
    mutationFn: async (params: { projectId: number; testPlan: string; recordVideo?: boolean }) => {
      return apiRequest<{
        sessionId: string;
        status: string;
        message: string;
      }>("POST", "/api/agent/testing/start", params);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/testing/sessions', projectId] });
      toast({
        title: "Test started",
        description: `Test session ${response.sessionId} is running`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    sessions: testSessionsQuery.data?.sessions || [],
    sessionCount: testSessionsQuery.data?.count || 0,
    isLoading: testSessionsQuery.isLoading,
    
    startTest: startTestMutation.mutate,
    startTestAsync: startTestMutation.mutateAsync,
    isStartingTest: startTestMutation.isPending,
    
    refetch: testSessionsQuery.refetch,
  };
}
