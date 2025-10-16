import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap, TrendingUp, DollarSign, Activity, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { OpenAIModelSelector } from './OpenAIModelSelector';

interface AIUsageData {
  summary: {
    totalTokens: number;
    totalCost: number;
    usageCount: number;
    modelBreakdown: Record<string, {
      totalTokens: number;
      totalCost: number;
      usageCount: number;
    }>;
  };
  recentUsage: Array<{
    id: number;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    creditsCost: string;
    purpose: string;
    createdAt: string;
  }>;
}

interface UserCredits {
  id: number;
  userId: number;
  monthlyCredits: string;
  remainingCredits: string;
  extraCredits: string;
  resetDate: string;
  updatedAt: string;
}

export function AIUsageDashboard() {
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  
  const { data: usage, isLoading: usageLoading } = useQuery<AIUsageData>({
    queryKey: ['/api/ai/usage'],
  });

  const { data: credits, isLoading: creditsLoading } = useQuery<UserCredits>({
    queryKey: ['/api/user/credits'],
  });

  const { data: pricing } = useQuery({
    queryKey: ['/api/ai/models/pricing'],
  });

  if (usageLoading || creditsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Parse string values from database
  const monthlyCredits = credits ? parseFloat(credits.monthlyCredits) : 0;
  const remainingCredits = credits ? parseFloat(credits.remainingCredits) : 0;
  const extraCredits = credits ? parseFloat(credits.extraCredits) : 0;
  const totalCredits = monthlyCredits + extraCredits;
  const totalUsed = totalCredits - remainingCredits;
  const creditPercentage = totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0;
  
  // Prepare chart data
  const chartData = usage?.summary.modelBreakdown 
    ? Object.entries(usage.summary.modelBreakdown).map(([model, data]) => ({
        model: model.split('-').slice(0, 3).join('-'), // Shorten model names
        tokens: data.totalTokens,
        cost: data.totalCost,
        calls: data.usageCount,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* OpenAI Model Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            OpenAI Model Selection
          </CardTitle>
          <CardDescription>
            Choose your preferred OpenAI model for AI generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenAIModelSelector 
            selectedModel={selectedModel}
            onModelSelect={setSelectedModel}
          />
        </CardContent>
      </Card>
      
      {/* Credit Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Credit Balance
          </CardTitle>
          <CardDescription>
            Your current AI usage credits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold">
                {remainingCredits.toFixed(2)} / {totalCredits.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Credits remaining ({creditPercentage.toFixed(0)}%)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Plan: Free</p>
              <p className="text-sm text-muted-foreground">
                Monthly billing
              </p>
            </div>
          </div>
          <Progress value={creditPercentage} className="h-2" />
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">Used</p>
              <p className="font-semibold">{totalUsed.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="font-semibold">{remainingCredits.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-semibold">{totalCredits.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Total Tokens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(usage?.summary.totalTokens || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Across all models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${(usage?.summary.totalCost || 0).toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground">
              Credits consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              API Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(usage?.summary.usageCount || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Total requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Model Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage by Model</CardTitle>
            <CardDescription>Token usage and costs breakdown by AI model</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                <Bar dataKey="cost" fill="#82ca9d" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Usage</CardTitle>
          <CardDescription>Your recent AI model usage history</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="completion">Completion</TabsTrigger>
              <TabsTrigger value="agent">Agent Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">Provider</th>
                      <th className="text-right p-2">Input</th>
                      <th className="text-right p-2">Output</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Cost</th>
                      <th className="text-left p-2">Purpose</th>
                      <th className="text-left p-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage?.recentUsage.map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">
                          {record.model.split('-').slice(0, 3).join('-')}
                        </td>
                        <td className="p-2">{record.provider}</td>
                        <td className="p-2 text-right">{record.inputTokens.toLocaleString()}</td>
                        <td className="p-2 text-right">{record.outputTokens.toLocaleString()}</td>
                        <td className="p-2 text-right font-medium">
                          {record.totalTokens.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-medium">
                          ${parseFloat(record.creditsCost).toFixed(4)}
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-1 text-xs bg-muted rounded">
                            {record.purpose || 'general'}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {format(new Date(record.createdAt), 'MMM d, HH:mm')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!usage?.recentUsage || usage.recentUsage.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No usage records yet
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Model Pricing */}
      {pricing && (
        <Card>
          <CardHeader>
            <CardTitle>Model Pricing</CardTitle>
            <CardDescription>Current pricing for available AI models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(pricing).map(([model, price]: [string, any]) => (
                <div key={model} className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm">{model}</h4>
                  <p className="text-2xl font-bold mt-1">
                    ${price.costPer1MTokens}
                  </p>
                  <p className="text-xs text-muted-foreground">per 1M tokens</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}