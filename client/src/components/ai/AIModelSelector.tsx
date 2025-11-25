import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Cpu, Brain, Lightbulb, Zap, CheckCircle2 } from 'lucide-react';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1kTokens?: number;
  available?: boolean; // Flag to indicate if provider is configured/initialized
}

interface AIModelSelectorProps {
  variant?: 'inline' | 'card' | 'hero';
  className?: string;
  onModelChange?: (modelId: string) => void;
}

const getProviderIcon = (provider: string) => {
  const icons: Record<string, React.ElementType> = {
    openai: Brain,
    anthropic: Lightbulb,
    gemini: Sparkles,
    xai: Zap,
    moonshot: Sparkles,  // Kimi-K2 (Moonshot AI)
    default: Cpu
  };
  return icons[provider] || icons.default;
};

const getProviderColor = (provider: string) => {
  const colors: Record<string, string> = {
    openai: 'bg-green-500',
    anthropic: 'bg-orange-500',
    gemini: 'bg-blue-500',
    xai: 'bg-purple-500',
    moonshot: 'bg-cyan-500',  // Kimi-K2 (Moonshot AI) - Cyan for cost savings theme
    default: 'bg-gray-500'
  };
  return colors[provider] || colors.default;
};

export function AIModelSelector({ variant = 'inline', className = '', onModelChange }: AIModelSelectorProps) {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Fetch available models
  const { data: modelsData, isLoading: modelsLoading } = useQuery<{ models: AIModel[] }>({
    queryKey: ['/api/models'],
  });

  // Fetch user's preferred model (may fail on public pages - that's OK)
  const { data: preferredData, isLoading: preferredLoading } = useQuery<{ preferredModel: string | null; availableModels: number }>({
    queryKey: ['/api/models/preferred'],
    staleTime: 30000, // Cache for 30s
    retry: false, // Don't retry on auth failures (public pages)
  });

  // Mutation to save preferred model
  const savePreferredModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      return apiRequest('POST', '/api/models/preferred', { modelId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models/preferred'] });
      toast({
        title: 'Success',
        description: 'AI model preference saved successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save model preference',
        variant: 'destructive',
      });
    }
  });

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    savePreferredModelMutation.mutate(modelId);
    onModelChange?.(modelId);
  };

  const currentModel = selectedModel || preferredData?.preferredModel || null;
  const availableModels = modelsData?.models || [];

  if (modelsLoading || preferredLoading) {
    return <Skeleton className="h-12 w-full max-w-md" />;
  }

  if (availableModels.length === 0) {
    return (
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-600 dark:text-yellow-500">
            No AI providers configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, XAI_API_KEY, or MOONSHOT_API_KEY.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold">AI Model Selection</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose your preferred AI model for code generation ({availableModels.length} available)
            </p>
            <Select value={currentModel || undefined} onValueChange={handleModelChange}>
              <SelectTrigger className="w-full" data-testid="select-ai-model">
                <SelectValue placeholder="Select AI model..." />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => {
                  const ProviderIcon = getProviderIcon(model.provider);
                  const providerColor = getProviderColor(model.provider);
                  const isAvailable = model.available !== false; // Default to true if not specified
                  return (
                    <SelectItem 
                      key={model.id} 
                      value={model.id} 
                      data-testid={`select-model-${model.id}`}
                      disabled={!isAvailable}
                      className={!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      <div className="flex items-center gap-3 py-1">
                        <div className={`w-2 h-2 rounded-full ${providerColor}`} />
                        <div className="flex-1">
                          <div className="font-medium">
                            {model.name}
                            {!isAvailable && <span className="text-xs text-red-500 ml-2">(Not configured)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                        {model.supportsStreaming && isAvailable && (
                          <Badge variant="secondary" className="text-xs">Streaming</Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {currentModel && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>Model preference saved</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hero variant - Large, prominent display for homepage
  // ✅ MOBILE-RESPONSIVE (Nov 24, 2025): Stack header on mobile, adjust sizes, hide descriptions on xs screens
  if (variant === 'hero') {
    const currentModelData = availableModels.find(m => m.id === currentModel);
    const ProviderIcon = currentModelData ? getProviderIcon(currentModelData.provider) : Sparkles;
    const providerColor = currentModelData ? getProviderColor(currentModelData.provider) : 'bg-orange-500';

    return (
      <div className={`space-y-2 sm:space-y-3 ${className}`} data-testid="ai-model-selector-hero-container">
        {/* Header: Stack on mobile, side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" data-testid="ai-model-selector-hero-header">
          <div className="flex items-center gap-2 text-white/90">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base font-semibold">Choose Your AI Model</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 w-fit">
            {availableModels.length} models available
          </Badge>
        </div>
        
        <Select value={currentModel || undefined} onValueChange={handleModelChange}>
          <SelectTrigger 
            className="w-full h-12 sm:h-14 bg-white dark:bg-gray-900 text-foreground border-2 border-white/40 hover:border-white/60 transition-all shadow-lg"
            data-testid="select-ai-model-hero"
          >
            {currentModelData ? (
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${providerColor} shrink-0`} />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm sm:text-base truncate">{currentModelData.name}</div>
                  {/* Hide description on mobile, show on sm+ */}
                  <div className="hidden sm:block text-xs text-muted-foreground truncate">{currentModelData.description}</div>
                </div>
                {currentModelData.supportsStreaming && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Zap className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline">Streaming</span>
                  </Badge>
                )}
              </div>
            ) : (
              <SelectValue placeholder="Select your preferred AI model..." />
            )}
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {availableModels.map((model) => {
              const ModelIcon = getProviderIcon(model.provider);
              const modelColor = getProviderColor(model.provider);
              const isAvailable = model.available !== false;
              return (
                <SelectItem 
                  key={model.id} 
                  value={model.id} 
                  data-testid={`select-model-${model.id}`}
                  disabled={!isAvailable}
                  className={!isAvailable ? 'opacity-50 cursor-not-allowed' : 'py-2 sm:py-3'}
                >
                  <div className="flex items-center gap-2 sm:gap-3 py-1 w-full">
                    <div 
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${modelColor} flex items-center justify-center shrink-0`}
                      data-testid={`provider-icon-${model.provider}`}
                    >
                      <ModelIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-2 flex-wrap">
                        <span className="truncate">{model.name}</span>
                        {!isAvailable && (
                          <Badge variant="destructive" className="text-xs shrink-0">Not configured</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{model.description}</div>
                      {model.costPer1kTokens && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ${model.costPer1kTokens.toFixed(4)} / 1K tokens
                        </div>
                      )}
                    </div>
                    {model.supportsStreaming && isAvailable && (
                      <Badge variant="secondary" className="text-xs shrink-0" data-testid={`streaming-badge-${model.id}`}>
                        <Zap className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Streaming</span>
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {currentModelData && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80 bg-white/10 rounded-md px-2 sm:px-3 py-1.5 sm:py-2">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-400 shrink-0" />
            <span className="truncate">Using {currentModelData.name} for code generation</span>
          </div>
        )}
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-white/90">
        <Cpu className="h-4 w-4" />
        <span className="text-sm font-medium">AI Model:</span>
      </div>
      <Select value={currentModel || undefined} onValueChange={handleModelChange}>
        <SelectTrigger className="w-64 bg-white/20 backdrop-blur-md text-white border-white/30 focus:border-white/50" data-testid="select-ai-model-inline">
          <SelectValue placeholder="Select AI model..." />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => {
            const providerColor = getProviderColor(model.provider);
            const isAvailable = model.available !== false; // Default to true if not specified
            return (
              <SelectItem 
                key={model.id} 
                value={model.id} 
                data-testid={`select-model-${model.id}`}
                disabled={!isAvailable}
                className={!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
              >
                <div className="flex items-center gap-3 py-1">
                  <div className={`w-2 h-2 rounded-full ${providerColor}`} />
                  <div className="flex-1">
                    <div className="font-medium">
                      {model.name}
                      {!isAvailable && <span className="text-xs text-red-500 ml-2">(Not configured)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{model.description}</div>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Badge variant="secondary" className="text-xs">
        {availableModels.length} available
      </Badge>
    </div>
  );
}
