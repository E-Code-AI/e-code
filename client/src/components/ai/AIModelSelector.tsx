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
}

interface AIModelSelectorProps {
  variant?: 'inline' | 'card';
  className?: string;
  onModelChange?: (modelId: string) => void;
}

const getProviderIcon = (provider: string) => {
  const icons: Record<string, React.ElementType> = {
    openai: Brain,
    anthropic: Lightbulb,
    gemini: Sparkles,
    xai: Zap,
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

  // Fetch user's preferred model
  const { data: preferredData, isLoading: preferredLoading } = useQuery<{ preferredModel: string | null; availableModels: number }>({
    queryKey: ['/api/models/preferred'],
    staleTime: 30000, // Cache for 30s
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
            No AI providers configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY.
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
                  return (
                    <SelectItem key={model.id} value={model.id} data-testid={`select-model-${model.id}`}>
                      <div className="flex items-center gap-3 py-1">
                        <div className={`w-2 h-2 rounded-full ${providerColor}`} />
                        <div className="flex-1">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                        {model.supportsStreaming && (
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
            return (
              <SelectItem key={model.id} value={model.id} data-testid={`select-model-${model.id}`}>
                <div className="flex items-center gap-3 py-1">
                  <div className={`w-2 h-2 rounded-full ${providerColor}`} />
                  <div className="flex-1">
                    <div className="font-medium">{model.name}</div>
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
