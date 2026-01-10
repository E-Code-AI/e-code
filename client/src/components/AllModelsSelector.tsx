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
  const [selectedModel, setSelectedModel] = useState<string>('gpt-5.2');
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
    
    // OpenAI - January 2026 CONSOLIDATED (gpt-5/gpt-5.1 → gpt-5.2)
    {
      id: 'gpt-5.2',
      name: 'GPT-5.2',
      description: 'Current flagship - advanced reasoning with 400K context (Jan 2026)',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Tools'],
      pricing: { input: 1.75, output: 14, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-5.2-codex',
      name: 'GPT-5.2 Codex',
      description: 'Coding optimized - enhanced code generation & debugging (Jan 2026)',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code', 'Debugging', 'Tools'],
      pricing: { input: 1.75, output: 14, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      description: 'Cost-optimized reasoning - balances speed, cost, capability',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code', 'Reasoning'],
      pricing: { input: 0.5, output: 2, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-5-nano',
      name: 'GPT-5 Nano',
      description: 'High-throughput for simple tasks - most affordable',
      provider: 'OpenAI',
      contextWindow: 400000,
      capabilities: ['Chat', 'Code'],
      pricing: { input: 0.25, output: 1, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      description: 'Excellent for coding, instruction-following, web development (April 2025)',
      provider: 'OpenAI',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Vision', 'Tools'],
      pricing: { input: 2, output: 8, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      description: '83% cost reduction vs GPT-4o - significant upgrade',
      provider: 'OpenAI',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Vision'],
      pricing: { input: 0.4, output: 1.6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gpt-4.1-nano',
      name: 'GPT-4.1 Nano',
      description: 'Ultra-fast, 1M context, 80.1% MMLU - cheapest option',
      provider: 'OpenAI',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code'],
      pricing: { input: 0.1, output: 0.4, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'o3',
      name: 'O3',
      description: 'Advanced reasoning for complex problem solving',
      provider: 'OpenAI',
      contextWindow: 128000,
      capabilities: ['Reasoning', 'Code', 'Math'],
      pricing: { input: 15, output: 60, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'o4-mini',
      name: 'O4 Mini',
      description: 'Budget-friendly reasoning for math, coding, visual tasks',
      provider: 'OpenAI',
      contextWindow: 128000,
      capabilities: ['Reasoning', 'Code', 'Math', 'Vision'],
      pricing: { input: 2, output: 6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Anthropic - UPDATED JANUARY 2026
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude Opus 4.5',
      description: 'Most intelligent - 80.9% SWE-bench, 66% cheaper than Opus 4 (Nov 1, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Vision', 'Agents'],
      pricing: { input: 5, output: 25, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-opus-4-1-20250805',
      name: 'Claude Opus 4.1',
      description: 'Advanced reasoning - software engineering workflows (Aug 5, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Vision', 'Reasoning'],
      pricing: { input: 15, output: 75, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-sonnet-4-5-20250929',
      name: 'Claude Sonnet 4.5',
      description: 'Production agents - coding, balanced performance, 1M context beta (Sept 29, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Agents', 'Computer Use'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      description: 'Agentic workflows - high-quality reasoning (May 14, 2025)',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Agents'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-haiku-4-5',
      name: 'Claude Haiku 4.5',
      description: 'Fast, lightweight tasks - $0.80/$4 per MTok',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 0.8, output: 4, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Google Gemini - UPDATED JANUARY 2026 with Gemini 3
    {
      id: 'gemini-3-flash',
      name: 'Gemini 3 Flash',
      description: 'Latest flagship - frontier-class, agentic coding, 90.4% GPQA Diamond (Jan 2026)',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Agentic', 'Multimodal'],
      pricing: { input: 0.075, output: 0.3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-3-pro',
      name: 'Gemini 3 Pro',
      description: 'State-of-the-art reasoning - best multimodal, vibe coding (Dec 2025)',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Multimodal'],
      pricing: { input: 1.25, output: 5, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Stable with adaptive thinking - LMArena leader 6+ months',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Adaptive Thinking', 'Multimodal'],
      pricing: { input: 1.25, output: 5, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Hybrid reasoning - thinks before it speaks with low latency',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Fast Reasoning', 'Audio'],
      pricing: { input: 0.075, output: 0.3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Stable - 1M context, native tool use, superior speed',
      provider: 'Google',
      contextWindow: 1000000,
      capabilities: ['Chat', 'Code', 'Tools', 'Fast Response'],
      pricing: { input: 0.075, output: 0.3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // xAI - UPDATED JANUARY 2026
    {
      id: 'grok-4-1-fast-reasoning',
      name: 'Grok 4.1 Fast (Reasoning)',
      description: '#1 LMArena - 1483 Elo, 2M context, thinking capabilities (Jan 2026)',
      provider: 'xAI',
      contextWindow: 2000000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Tools'],
      pricing: { input: 6, output: 30, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'grok-4-1-fast-non-reasoning',
      name: 'Grok 4.1 Fast (Non-Reasoning)',
      description: '#2 LMArena - 1465 Elo, faster without thinking tokens (Jan 2026)',
      provider: 'xAI',
      contextWindow: 2000000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'grok-4',
      name: 'Grok 4',
      description: 'Flagship reasoning model - post-graduate level reasoning',
      provider: 'xAI',
      contextWindow: 256000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Live Search'],
      pricing: { input: 2, output: 6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'grok-3',
      name: 'Grok 3',
      description: 'Previous flagship - cost-effective for most workloads',
      provider: 'xAI',
      contextWindow: 131072,
      capabilities: ['Chat', 'Code', 'Reasoning'],
      pricing: { input: 1, output: 3, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Groq Models - UPDATED JANUARY 2026
    // Source: https://console.groq.com/docs/models
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      description: 'Latest Llama with 128K context, tool use, JSON mode',
      provider: 'Groq',
      contextWindow: 128000,
      capabilities: ['Chat', 'Code', 'Tools'],
      pricing: { input: 0.6, output: 0.6, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      description: 'Fast inference for simple tasks - 8K context',
      provider: 'Groq',
      contextWindow: 8192,
      capabilities: ['Chat', 'Fast Response'],
      pricing: { input: 0.2, output: 0.2, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B',
      description: 'Google open-source model - 8K context, efficient',
      provider: 'Groq',
      contextWindow: 8192,
      capabilities: ['Chat', 'Code'],
      pricing: { input: 0.2, output: 0.2, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    
    // Moonshot AI - UPDATED JANUARY 2026
    {
      id: 'kimi-k2-thinking',
      name: 'Kimi K2 Thinking',
      description: 'Multi-step reasoning + tool use - 256K context, 200-300 sequential tool calls',
      provider: 'Moonshot AI',
      contextWindow: 256000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Tools'],
      pricing: { input: 0.15, output: 2.50, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'kimi-k2-thinking-turbo',
      name: 'Kimi K2 Thinking Turbo',
      description: 'Fast reasoning + tool use - 256K context, faster inference',
      provider: 'Moonshot AI',
      contextWindow: 256000,
      capabilities: ['Chat', 'Code', 'Reasoning', 'Fast Response'],
      pricing: { input: 0.15, output: 2.50, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'kimi-k2-turbo-preview',
      name: 'Kimi K2 Turbo Preview',
      description: 'General purpose, high-speed - 60-100 tokens/sec, 256K context',
      provider: 'Moonshot AI',
      contextWindow: 256000,
      capabilities: ['Chat', 'Code', 'Fast Response'],
      pricing: { input: 0.15, output: 2.50, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'kimi-k2-0905-preview',
      name: 'Kimi K2 (Sept 2025)',
      description: 'Stable version - 1T param MoE, 256K context, 10-100× cheaper than GPT-4',
      provider: 'Moonshot AI',
      contextWindow: 256000,
      capabilities: ['Chat', 'Code', 'Agents'],
      pricing: { input: 0.15, output: 2.50, currency: 'USD', unit: '1M tokens' },
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
      
      if (selectedModel.includes('gpt') || selectedModel.includes('o3') || selectedModel.includes('o4')) {
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
        const isThinkingModel = selectedModel.includes('thinking') || selectedModel.includes('kimi-k2-0905') || selectedModel.includes('kimi-k2');
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

      const data = await apiRequest('POST', endpoint, payload);

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
              <span className="text-sm">OpenAI Models: GPT-5.1, GPT-5, GPT-5 Mini/Nano, GPT-4o, o3, o4-mini</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Anthropic Models: Claude Opus 4.5, Claude Sonnet 4.5, Claude Haiku 4.5</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Other Providers: Gemini 2.5 Pro/Flash, Grok 4, Moonshot Kimi K2, Groq</span>
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