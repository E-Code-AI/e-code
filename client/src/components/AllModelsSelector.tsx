// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');
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
    // Add Claude models
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      description: 'Most intelligent model with advanced reasoning and coding',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Analysis', 'Vision'],
      pricing: { input: 3, output: 15, currency: 'USD', unit: '1M tokens' },
      available: true
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Powerful model for complex tasks',
      provider: 'Anthropic',
      contextWindow: 200000,
      capabilities: ['Chat', 'Code', 'Analysis'],
      pricing: { input: 15, output: 75, currency: 'USD', unit: '1M tokens' },
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
      
      if (selectedModel.includes('gpt') || selectedModel.includes('o1')) {
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      toast({
        title: "Model Test Successful",
        description: `${selectedModel} generated response successfully`,
      });

      console.log('Response:', data);
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
                {Object.entries(groupedModels).map(([provider, models]) => (
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
                              {model.capabilities?.slice(0, 3).map((cap) => (
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