import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from '@/lib/queryClient';
import { Cpu, Zap, Star, Code, Brain, Sparkles, TrendingUp, DollarSign, CheckCircle, XCircle } from "lucide-react";

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
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5');
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

  // Combine all models - LATEST NOVEMBER 2025
  const allModels = [
    ...(openaiModels?.models || []),
    ...(opensourceData?.models || []),
    
    // OpenAI - Latest Models (Nov 12-14, 2025)
    {
      id: 'gpt-5.1',
      name: 'GPT-5.1 Instant',
      description: 'Latest flagship - warmer, more intelligent with adaptive reasoning (Nov 12, 2025)',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Tools'],
      pricing: { input: 8, output: 24, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-5.1-thinking',
      name: 'GPT-5.1 Thinking',
      description: 'Extended reasoning - 50% faster than GPT-5 with fewer tokens (Nov 12, 2025)',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code', 'Deep Reasoning', 'Math'],
      pricing: { input: 12, output: 36, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      description: 'Smartest non-reasoning multimodal LLM - Swiss Army knife',
      provider: 'OpenAI',
      contextWindow: 128000,
      capabilities: ['Chat', 'Code', 'Vision', 'Tools'],
      pricing: { input: 6, output: 18, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'o4-mini',
      name: 'o4 Mini',
      description: 'Budget-friendly reasoning for math, coding, visual tasks',
      provider: 'OpenAI',
      contextWindow: 128000,
      capabilities: ['Reasoning', 'Code', 'Math', 'Vision'],
      pricing: { input: 2, output: 6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Anthropic - Latest Models (Sept-Oct 2025)
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      description: 'Best coding model in the world - strongest at agents & computer use (Sept 29, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Agents', 'Computer Use'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-opus-4-1-20250805',
      name: 'Claude Opus 4.1',
      description: 'Upgraded for agentic tasks - 74.5% on SWE-bench (Aug 5, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Debugging', 'Agents'],
      pricing: { input: 15, output: 75, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-haiku-4-5-20251015',
      name: 'Claude Haiku 4.5',
      description: 'Fastest - matches Sonnet 4 on coding at 1/3 cost (Oct 15, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 1, output: 5, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Google Gemini - Latest Models (Nov 2025)
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Stable with adaptive thinking - 2M token context coming soon (Nov 2025)',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Adaptive Thinking', 'Multimodal'],
      pricing: { input: 1.25, output: 5, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Hybrid reasoning - thinks before it speaks with low latency (Nov 2025)',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Fast Reasoning', 'Audio'],
      pricing: { input: 0.075, output: 0.3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // xAI - Latest Models (July-Sept 2025)
    {
      id: 'grok-4',
      name: 'Grok 4',
      description: 'Current flagship - post-graduate reasoning with 256K context (July 2025)',
      provider: 'xAI',
      contextWindow: 256000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Live Search'],
      pricing: { input: 2, output: 6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'grok-4-fast',
      name: 'Grok 4 Fast',
      description: 'Enterprise - 40% fewer tokens, 2M context, 64× cheaper than o3 (Sept 2025)',
      provider: 'xAI',
      contextWindow: 2000000,
      capabilities: ['Chat', 'Code', 'Fast Response', 'Enterprise'],
      pricing: { input: 0.5, output: 1.5, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Moonshot AI Kimi-K2 models (10-100× cheaper than GPT-4)
    {
      id: 'kimi-k2',
      name: 'Kimi K2',
      description: 'Cost-effective model with excellent agentic capabilities - 10× cheaper than GPT-4',
      provider: 'Moonshot AI',
      contextWindow: 128000,
      capabilities: ['Chat', 'Code', 'Analysis', 'Agents'],
      pricing: { input: 0.60, output: 2.50, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'kimi-k2-thinking',
      name: 'Kimi K2 Thinking',
      description: 'Enhanced reasoning and complex problem-solving capabilities',
      provider: 'Moonshot AI',
      contextWindow: 128000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Analysis'],
      pricing: { input: 0.80, output: 3.00, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'kimi-k2-turbo',
      name: 'Kimi K2 Turbo',
      description: 'Fastest Kimi model for low-latency applications - 100× cheaper than GPT-4',
      provider: 'Moonshot AI',
      contextWindow: 128000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 0.30, output: 1.00, currency: 'USD', unit: '1M tokens' },
      available: true
    }
  ];

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
      
      if (selectedModel.includes('gpt') || selectedModel.includes('o1') || selectedModel.includes('o4')) {
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
        endpoint = '/api/ai/generate';
        payload = {
          model: selectedModel,
          prompt: testPrompt,
          temperature: 0.7,
          max_tokens: 500
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

      const response = await apiRequest('POST', endpoint, payload);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

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
            All available AI models: OpenAI, Anthropic, and 9 Open-Source Models
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
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      {getProviderIcon(provider)}
                      {provider}
                    </h3>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {models.map((model) => (
                        <Card key={model.id} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-sm">{model.name}</CardTitle>
                                <CardDescription className="text-xs">
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
                                <Badge key={cap} variant="secondary" className="text-xs">
                                  {cap}
                                </Badge>
                              ))}
                            </div>
                            {model.tier && (
                              <Badge className={`${getTierColor(model.tier)} text-white text-xs`}>
                                {model.tier}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>
                                ${model.pricing.input}/{model.pricing.output} per {model.pricing.unit}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
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
                        <CardTitle className="text-sm">{model.name}</CardTitle>
                        <CardDescription className="text-xs">{model.description}</CardDescription>
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
                        <CardTitle className="text-sm">{model.name}</CardTitle>
                        <CardDescription className="text-xs">{model.description}</CardDescription>
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
                        <CardTitle className="text-sm">{model.name}</CardTitle>
                        <CardDescription className="text-xs">
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
              <span className="text-sm">OpenAI Models: GPT-4o, GPT-4o-mini, o1-preview, o1-mini</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Anthropic Models: Claude 3.5 Sonnet, Claude 3 Opus</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Open-Source Models: 9 models integrated</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">MCP Integration: All models available through MCP tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Billing System: Token tracking for all models</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}