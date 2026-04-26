import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Tabs,TabsContent,TabsList,TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from "@tanstack/react-query";
import { Brain,CheckCircle,Code,Cpu,DollarSign,Sparkles,Star,TrendingUp,XCircle,Zap } from "lucide-react";
import { useState } from 'react';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  provider: string;
  tier?: string;
  contextWindow: number;
  capabilities: string[];
  pricing: {
    input: number;
    output: number;
    currency: string;
    unit: string;
  };
  available: boolean;
}

export function AllModelsSelector() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4.1');
  const [testPrompt, setTestPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch OpenAI models
  const { data: openaiModels } = useQuery({
    queryKey: ['/api/openai/models'],
    retry: false
  });

  // Fetch open-source models
  const { data: opensourceData } = useQuery({
    queryKey: ['/api/opensource/models'],
    retry: false
  });

  // Combine all models
  const allModels = [
    ...(openaiModels?.models || []),
    ...(opensourceData?.models || []),

    // ── OpenAI (April 2026) ─────────────────────────────────────────────────────
    {
      id: 'gpt-5-codex',
      name: 'GPT-5 Codex',
      description: 'Code-first flagship — strongest OpenAI model for agentic engineering and deep implementation work',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Tools', 'Agentic Workflows'],
      pricing: { input: 15, output: 60, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      description: 'OpenAI legacy flagship — best coding, instruction following, 1M context',
      provider: 'OpenAI',
      contextWindow: 1047576,
      capabilities: ['Chat', 'Code', 'Vision', 'Tools', 'Long Context'],
      pricing: { input: 2, output: 8, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      description: 'Fast and efficient — best price-to-performance, 1M context',
      provider: 'OpenAI',
      contextWindow: 1047576,
      capabilities: ['Chat', 'Code', 'Vision', 'Tools'],
      pricing: { input: 0.4, output: 1.6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1-nano',
      name: 'GPT-4.1 Nano',
      description: 'Smallest and fastest OpenAI model — high-volume, latency-sensitive tasks',
      provider: 'OpenAI',
      contextWindow: 1047576,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 0.1, output: 0.4, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'o4-mini',
      name: 'o4-mini',
      description: 'Latest efficient reasoning — fast STEM and coding at low cost',
      provider: 'OpenAI',
      contextWindow: 200000,
      capabilities: ['Reasoning', 'Code', 'Math', 'Science'],
      pricing: { input: 1.1, output: 4.4, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'o3',
      name: 'o3',
      description: 'Most powerful reasoning — frontier performance on hard benchmarks',
      provider: 'OpenAI',
      contextWindow: 200000,
      capabilities: ['Reasoning', 'Code', 'Math', 'Science'],
      pricing: { input: 10, output: 40, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'o3-mini',
      name: 'o3-mini',
      description: 'Efficient reasoning — strong on math, science, and code at lower cost',
      provider: 'OpenAI',
      contextWindow: 200000,
      capabilities: ['Reasoning', 'Code', 'Math'],
      pricing: { input: 1.1, output: 4.4, currency: 'USD', unit: '1M tokens' },
      available: true
    },

    // ── Anthropic — Claude 4.x (April 2026) ────────────────────────────────────
    {
      id: 'claude-opus-4-7',
      name: 'Claude Opus 4.7',
      description: 'Most powerful Claude — frontier intelligence, complex tasks, 200K context',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Vision', 'Agents', 'Analysis', 'Computer Use'],
      pricing: { input: 15, output: 75, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-sonnet-4-6',
      name: 'Claude Sonnet 4.6',
      description: 'Best overall Claude — top intelligence for coding, reasoning & agentic tasks',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Vision', 'Agents', 'Computer Use'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-haiku-4-5-20251001',
      name: 'Claude Haiku 4.5',
      description: 'Fastest Claude — near-instant responses for everyday tasks at lowest cost',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 1, output: 5, currency: 'USD', unit: '1M tokens' },
      available: true
    },

    // ── Google Gemini ───────────────────────────────────────────────────────────
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Most powerful Gemini — state-of-the-art reasoning, 1M context',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Multimodal', 'Long Context'],
      pricing: { input: 1.25, output: 10, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Best price-performance — adaptive thinking with 1M context (LIVE ✓)',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Multimodal'],
      pricing: { input: 0.075, output: 0.3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Next-gen speed — native tool use, 1M context, multimodal',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Tools', 'Multimodal'],
      pricing: { input: 0.075, output: 0.3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.0-flash-lite',
      name: 'Gemini 2.0 Flash Lite',
      description: 'Most cost-efficient Gemini — fastest for high-volume tasks',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 0.019, output: 0.075, currency: 'USD', unit: '1M tokens' },
      available: true
    },

    // ── xAI / Grok (grok-3 family confirmed real — live API test March 2026) ────
    {
      id: 'grok-3',
      name: 'Grok 3',
      description: "xAI flagship — real-time knowledge, strong reasoning, 131K context",
      provider: 'xAI',
      contextWindow: 131072,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Tools', 'Real-time'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'grok-3-mini',
      name: 'Grok 3 Mini',
      description: 'Efficient Grok — fast reasoning at lower cost, ideal for dev tasks',
      provider: 'xAI',
      contextWindow: 131072,
      capabilities: ['Chat', 'Code', 'Reasoning'],
      pricing: { input: 0.3, output: 0.5, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'grok-3-fast',
      name: 'Grok 3 Fast',
      description: 'Fastest Grok variant — speed-optimized for low-latency workloads',
      provider: 'xAI',
      contextWindow: 131072,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 5, output: 25, currency: 'USD', unit: '1M tokens' },
      available: true
    },

    // Moonshot AI — official moonshot-v1 series
    {
      id: 'moonshot-v1-8k',
      name: 'Moonshot v1 8K',
      description: 'Fast and cost-effective — 8K context for short tasks',
      provider: 'Moonshot AI',
      contextWindow: 8192,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 0.12, output: 0.12, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'moonshot-v1-32k',
      name: 'Moonshot v1 32K',
      description: 'Balanced — 32K context for most coding and analysis tasks',
      provider: 'Moonshot AI',
      contextWindow: 32768,
      capabilities: ['Chat', 'Code', 'Analysis'],
      pricing: { input: 0.24, output: 0.24, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'moonshot-v1-128k',
      name: 'Moonshot v1 128K',
      description: 'Long context — 128K for large codebases and documents',
      provider: 'Moonshot AI',
      contextWindow: 131072,
      capabilities: ['Chat', 'Code', 'Long Context'],
      pricing: { input: 0.96, output: 0.96, currency: 'USD', unit: '1M tokens' },
      available: true
    }
  ].filter((model, index, self) => self.findIndex(m => m.id === model.id) === index);

  // Test model generation
  const testModel = async () => {
    if (!selectedModel || !testPrompt) {
      toast({
        title: "Input Required",
        description: "Please select a model and enter a test prompt",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Determine which API to use based on the model
      let endpoint = '';
      let payload = {};
      
      if (selectedModel.includes('gpt') || selectedModel === 'o1' || selectedModel === 'o1-mini' || selectedModel === 'o3') {
        endpoint = '/api/openai/generate';
        payload = {
          model: selectedModel,
          messages: [{ role: 'user', content: testPrompt }],
          temperature: 0.7,
          max_tokens: 500
        };
      } else if (selectedModel.includes('claude')) {
        endpoint = '/api/ai/generate';
        payload = {
          model: selectedModel,
          prompt: testPrompt,
          temperature: 0.7,
          max_tokens: 500
        };
      } else if (selectedModel.includes('kimi')) {
        // Moonshot AI Kimi models
        // ✅ KIMI K2 REQUIREMENTS: temperature=1.0, max_tokens>=16384 for thinking models
        const isThinkingModel = selectedModel.includes('thinking') || selectedModel.includes('moonshot-v1-128k');
        endpoint = '/api/ai/generate';
        payload = {
          model: selectedModel,
          prompt: testPrompt,
          temperature: isThinkingModel ? 1.0 : 0.7,  // KIMI REQUIREMENT 1
          max_tokens: isThinkingModel ? 16384 : 4096  // KIMI REQUIREMENT 4
        };
      } else if (selectedModel.includes('gemini')) {
        // Google Gemini models
        endpoint = '/api/ai/generate';
        payload = {
          model: selectedModel,
          prompt: testPrompt,
          temperature: 0.7,
          max_tokens: 500
        };
      } else if (selectedModel.includes('grok')) {
        // xAI Grok models
        endpoint = '/api/ai/generate';
        payload = {
          model: selectedModel,
          prompt: testPrompt,
          temperature: 0.7,
          max_tokens: 500
        };
      } else {
        // Open-source model
        endpoint = '/api/opensource/generate';
        payload = {
          model: selectedModel,
          messages: [{ role: 'user', content: testPrompt }],
          temperature: 0.7,
          max_tokens: 500
        };
      }

      const _data = await apiRequest('POST', endpoint, payload);

      toast({
        title: "Model Test Successful",
        description: `${selectedModel} generated response successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return <Brain className="h-4 w-4" />;
      case 'anthropic': return <Sparkles className="h-4 w-4" />;
      case 'together': return <Zap className="h-4 w-4" />;
      case 'replicate': return <Star className="h-4 w-4" />;
      case 'huggingface': return <Code className="h-4 w-4" />;
      case 'groq': return <TrendingUp className="h-4 w-4" />;
      default: return <Cpu className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'flagship': return 'bg-purple-500';
      case 'specialized': return 'bg-blue-500';
      case 'efficient': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const groupedModels = allModels.reduce((acc, model) => {
    const provider = model.provider || 'Other';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Hub - Complete Integration
          </CardTitle>
          <CardDescription>
            All available AI models: OpenAI, Anthropic, Google, xAI, and Moonshot AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Models</TabsTrigger>
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
              <TabsTrigger value="opensource">Open Source</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid gap-4">
                {(Object.entries(groupedModels) as [string, ModelInfo[]][]).map(([provider, models]) => (
                  <div key={provider} className="space-y-2">
                    <h3 className="text-[13px] font-semibold flex items-center gap-2">
                      {getProviderIcon(provider)}
                      {provider}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {models.map((model) => (
                        <Card key={model.id} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-[13px]">{model.name}</CardTitle>
                                <CardDescription className="text-[11px]">
                                  {model.description}
                                </CardDescription>
                              </div>
                              {model.available ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {model.capabilities?.slice(0, 3).map((cap: string) => (
                                <Badge key={cap} variant="secondary" className="text-[11px]">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                            {model.tier && (
                              <Badge className={`${getTierColor(model.tier)} text-white text-[11px]`}>
                                {model.tier}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>
                                ${model.pricing.input}/{model.pricing.output} per {model.pricing.unit}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              Context: {model.contextWindow.toLocaleString()} tokens
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="openai" className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {allModels
                  .filter(m => m.provider === 'OpenAI')
                  .map((model) => (
                    <Card key={model.id}>
                      <CardHeader>
                        <CardTitle className="text-[13px]">{model.name}</CardTitle>
                        <CardDescription className="text-[11px]">{model.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={model.available ? "default" : "destructive"}>
                          {model.available ? "Available" : "Configure API Key"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="anthropic" className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2">
                {allModels
                  .filter(m => m.provider === 'Anthropic')
                  .map((model) => (
                    <Card key={model.id}>
                      <CardHeader>
                        <CardTitle className="text-[13px]">{model.name}</CardTitle>
                        <CardDescription className="text-[11px]">{model.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Badge variant={model.available ? "default" : "destructive"}>
                          {model.available ? "Available" : "Configure API Key"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="opensource" className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {allModels
                  .filter(m => !['OpenAI', 'Anthropic'].includes(m.provider))
                  .map((model) => (
                    <Card key={model.id}>
                      <CardHeader>
                        <CardTitle className="text-[13px]">{model.name}</CardTitle>
                        <CardDescription className="text-[11px]">
                          Provider: {model.provider}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Badge className={getTierColor(model.tier)}>
                          {model.tier}
                        </Badge>
                        <Badge variant={model.available ? "default" : "destructive"}>
                          {model.available ? "Available" : "Configure API Key"}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test Model Generation</CardTitle>
                  <CardDescription>
                    Test any model with a sample prompt
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {allModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name} ({model.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <textarea
                    className="w-full min-h-[100px] p-3 border rounded-md"
                    placeholder="Enter a test prompt..."
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                  />

                  <Button 
                    onClick={testModel}
                    disabled={isGenerating || !selectedModel || !testPrompt}
                    className="w-full"
                  >
                    {isGenerating ? "Generating..." : "Test Model"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-[13px]">OpenAI: GPT-4.1, GPT-4.1 Mini, GPT-4.1 Nano, GPT-4o, o4-mini, o3, o3-mini, o1</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-[13px]">Anthropic: Claude Opus 4.7, Claude Sonnet 4.6, Claude Haiku 4.5</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-[13px]">Google: Gemini 2.5 Pro/Flash, Gemini 2.0 Flash · xAI: Grok 3, Grok 3 Mini, Grok 3 Fast · Moonshot AI: moonshot-v1-8k/32k/128k</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-[13px]">MCP Integration: All models available through MCP tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-[13px]">Billing System: Token tracking for all models</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
