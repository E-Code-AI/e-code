import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  Cpu,
  DollarSign,
  Send,
  Settings
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useState } from 'react';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  avgProcessingTime: number;
}

interface CircuitBreakerStatus {
  provider: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailure: string | null;
  successCount: number;
  failureRate: number;
}

interface TokenUsageStats {
  totalTokens: number;
  totalCost: number;
  mcpExecutions: number;
  aiExecutions: number;
  tokensSaved: number;
  costSaved: number;
  savingsPercentage: number;
}

interface TaskClassificationStats {
  category: string;
  count: number;
  mcpExecutions: number;
  aiExecutions: number;
  avgTokensUsed: number;
  successRate: number;
}

interface DashboardData {
  queueStats: QueueStats;
  circuitBreakers: CircuitBreakerStatus[];
  tokenUsage: TokenUsageStats;
  taskClassifications: TaskClassificationStats[];
}

interface SlackConfig {
  configured: boolean;
  enabled: boolean;
  webhookUrl: string | null;
}

export default function AIOptimizationDashboard() {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/ai-optimization/dashboard'],
    refetchInterval: 30000
  });

  const { data: slackConfig, isLoading: isSlackLoading } = useQuery<SlackConfig>({
    queryKey: ['/api/slack-config'],
    refetchInterval: 60000
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async (url: string | null) => {
      return apiRequest('/api/slack-config', {
        method: 'PUT',
        body: JSON.stringify({ webhookUrl: url })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slack-config'] });
      toast({
        title: 'Success',
        description: 'Slack webhook URL updated successfully',
      });
      setWebhookUrl('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update webhook URL',
        variant: 'destructive',
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/slack-config/test', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Test alert sent to Slack successfully!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test alert',
        variant: 'destructive',
      });
    },
  });

  const handleUpdateWebhook = () => {
    if (!webhookUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a webhook URL',
        variant: 'destructive',
      });
      return;
    }
    updateWebhookMutation.mutate(webhookUrl);
  };

  const handleRemoveWebhook = () => {
    updateWebhookMutation.mutate(null);
  };

  const handleTestWebhook = () => {
    testWebhookMutation.mutate();
  };

  const queueStatCards = [
    {
      title: 'Pending',
      value: data?.queueStats.pending || 0,
      icon: Clock,
      color: 'text-yellow-500',
      description: 'Awaiting processing'
    },
    {
      title: 'Processing',
      value: data?.queueStats.processing || 0,
      icon: Activity,
      color: 'text-blue-500',
      description: 'Currently running'
    },
    {
      title: 'Completed',
      value: data?.queueStats.completed || 0,
      icon: CheckCircle,
      color: 'text-green-500',
      description: 'Successfully processed'
    },
    {
      title: 'Failed',
      value: data?.queueStats.failed || 0,
      icon: XCircle,
      color: 'text-red-500',
      description: 'Processing errors'
    }
  ];

  const tokenStatCards = [
    {
      title: 'Total Tokens Used',
      value: data?.tokenUsage.totalTokens?.toLocaleString() || '0',
      icon: Cpu,
      color: 'text-purple-500',
      description: `$${data?.tokenUsage.totalCost?.toFixed(2) || '0.00'} cost`
    },
    {
      title: 'MCP Executions',
      value: data?.tokenUsage.mcpExecutions || 0,
      icon: Zap,
      color: 'text-cyan-500',
      description: 'Deterministic tasks'
    },
    {
      title: 'AI Executions',
      value: data?.tokenUsage.aiExecutions || 0,
      icon: Activity,
      color: 'text-orange-500',
      description: 'Creative tasks'
    },
    {
      title: 'Tokens Saved',
      value: data?.tokenUsage.tokensSaved?.toLocaleString() || '0',
      icon: TrendingDown,
      color: 'text-green-500',
      description: `$${data?.tokenUsage.costSaved?.toFixed(2) || '0.00'} (${data?.tokenUsage.savingsPercentage?.toFixed(1) || '0'}%)`
    }
  ];

  const getCircuitBreakerStateColor = (state: string) => {
    switch (state) {
      case 'closed': return 'text-green-500';
      case 'open': return 'text-red-500';
      case 'half-open': return 'text-yellow-500';
      default: return 'text-zinc-500';
    }
  };

  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'closed': return CheckCircle;
      case 'open': return XCircle;
      case 'half-open': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="heading-page-title">AI Optimization Dashboard</h1>
          <p className="text-zinc-400" data-testid="text-page-description">Monitor queue, circuit breakers, and token usage</p>
        </div>

        {/* Queue Stats Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" data-testid="heading-queue-stats">
            <Activity className="h-5 w-5" />
            Queue Statistics
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-zinc-800 border-zinc-700">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-zinc-700 rounded w-20 animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-zinc-700 rounded w-12 mb-1 animate-pulse" />
                    <div className="h-3 bg-zinc-700 rounded w-24 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {queueStatCards.map((stat) => {
                const Icon = stat.icon;
                const testId = `card-queue-${stat.title.toLowerCase()}`;
                return (
                  <Card key={stat.title} className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors" data-testid={testId}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-zinc-300">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white" data-testid={`text-queue-${stat.title.toLowerCase()}`}>{stat.value}</div>
                      <p className="text-xs text-zinc-400 mt-1">{stat.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Token Usage Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" data-testid="heading-token-usage">
            <DollarSign className="h-5 w-5" />
            Token Usage & Savings
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-zinc-800 border-zinc-700">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-zinc-700 rounded w-24 animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-zinc-700 rounded w-16 mb-1 animate-pulse" />
                    <div className="h-3 bg-zinc-700 rounded w-32 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tokenStatCards.map((stat) => {
                const Icon = stat.icon;
                const testIdKey = stat.title === 'Total Tokens Used' ? 'total' : 
                                  stat.title === 'MCP Executions' ? 'mcp' :
                                  stat.title === 'AI Executions' ? 'ai' : 'saved';
                const testId = `card-token-${testIdKey}`;
                return (
                  <Card key={stat.title} className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors" data-testid={testId}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-zinc-300">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white" data-testid={`text-token-${testIdKey}`}>{stat.value}</div>
                      <p className="text-xs text-zinc-400 mt-1">{stat.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Circuit Breaker Status Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" data-testid="heading-circuit-breaker">
            <Zap className="h-5 w-5" />
            Circuit Breaker Status
          </h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-zinc-800 border-zinc-700">
                  <CardHeader className="pb-2">
                    <div className="h-4 bg-zinc-700 rounded w-20 animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-6 bg-zinc-700 rounded w-16 mb-2 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-3 bg-zinc-700 rounded w-full animate-pulse" />
                      <div className="h-3 bg-zinc-700 rounded w-full animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.circuitBreakers.map((breaker) => {
                const Icon = getCircuitBreakerIcon(breaker.state);
                const stateColor = getCircuitBreakerStateColor(breaker.state);
                const providerKey = breaker.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <Card key={breaker.provider} className="bg-zinc-800 border-zinc-700 hover:border-zinc-600 transition-colors" data-testid={`card-circuit-${providerKey}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-zinc-300">
                        {breaker.provider.toUpperCase()}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stateColor}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-lg font-bold ${stateColor} mb-2 uppercase`} data-testid={`text-circuit-${providerKey}-state`}>
                        {breaker.state}
                      </div>
                      <div className="space-y-1 text-xs text-zinc-400">
                        <div className="flex justify-between">
                          <span>Failures:</span>
                          <span className="text-white" data-testid={`text-circuit-${providerKey}-failures`}>{breaker.failureCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Successes:</span>
                          <span className="text-white" data-testid={`text-circuit-${providerKey}-successes`}>{breaker.successCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Failure Rate:</span>
                          <span className="text-white" data-testid={`text-circuit-${providerKey}-failure-rate`}>{(breaker.failureRate * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Classification Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" data-testid="heading-task-classification">
            <TrendingUp className="h-5 w-5" />
            Task Classification Stats
          </h2>
          {isLoading ? (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="h-4 bg-zinc-700 rounded w-32 animate-pulse" />
                      <div className="h-4 bg-zinc-700 rounded w-24 animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-task-classification">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-zinc-300">Category</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-300">Total</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-300">MCP</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-300">AI</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-300">Avg Tokens</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-zinc-300">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.taskClassifications.map((task, index) => {
                        const categoryKey = task.category.toLowerCase().replace(/\s+/g, '-');
                        return (
                          <tr key={index} className="border-b border-zinc-700/50 hover:bg-zinc-700/20 transition-colors" data-testid={`row-task-${categoryKey}`}>
                            <td className="py-3 px-4 text-sm text-white font-medium">{task.category}</td>
                            <td className="text-right py-3 px-4 text-sm text-zinc-300" data-testid={`text-task-${categoryKey}-count`}>{task.count}</td>
                            <td className="text-right py-3 px-4 text-sm text-cyan-400" data-testid={`text-task-${categoryKey}-mcp`}>{task.mcpExecutions}</td>
                            <td className="text-right py-3 px-4 text-sm text-orange-400" data-testid={`text-task-${categoryKey}-ai`}>{task.aiExecutions}</td>
                            <td className="text-right py-3 px-4 text-sm text-zinc-300" data-testid={`text-task-${categoryKey}-tokens`}>{task.avgTokensUsed.toFixed(0)}</td>
                            <td className="text-right py-3 px-4 text-sm text-green-400" data-testid={`text-task-${categoryKey}-success`}>{(task.successRate * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Slack Alert Configuration */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2" data-testid="heading-slack-config">
            <Settings className="h-5 w-5" />
            Slack Alert Configuration
          </h2>
          <Card className="bg-zinc-800 border-zinc-700">
            <CardHeader>
              <CardTitle className="text-zinc-300 text-base">Real-time External Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSlackLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-zinc-700 rounded w-48 animate-pulse" />
                  <div className="h-10 bg-zinc-700 rounded animate-pulse" />
                  <div className="h-10 bg-zinc-700 rounded w-32 animate-pulse" />
                </div>
              ) : (
                <>
                  {/* Status Indicator */}
                  <div className="flex items-center gap-3 p-3 bg-zinc-900 rounded-lg" data-testid="container-slack-status">
                    {slackConfig?.enabled ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-white" data-testid="text-slack-status">Slack alerts enabled</p>
                          <p className="text-xs text-zinc-400">Webhook URL: {slackConfig.webhookUrl || 'Not set'}</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-zinc-500" />
                        <div>
                          <p className="text-sm font-medium text-white" data-testid="text-slack-status">Slack alerts disabled</p>
                          <p className="text-xs text-zinc-400">Configure a webhook URL to enable alerts</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Webhook URL Input */}
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-300 font-medium">
                      Webhook URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="flex-1 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                        data-testid="input-slack-webhook"
                      />
                      <Button
                        onClick={handleUpdateWebhook}
                        disabled={updateWebhookMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="button-update-webhook"
                      >
                        {updateWebhookMutation.isPending ? 'Updating...' : 'Update'}
                      </Button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Get your webhook URL from{' '}
                      <a
                        href="https://api.slack.com/messaging/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Slack Incoming Webhooks
                      </a>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestWebhook}
                      disabled={!slackConfig?.enabled || testWebhookMutation.isPending}
                      variant="outline"
                      className="bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800"
                      data-testid="button-test-webhook"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {testWebhookMutation.isPending ? 'Testing...' : 'Send Test Alert'}
                    </Button>
                    {slackConfig?.configured && (
                      <Button
                        onClick={handleRemoveWebhook}
                        disabled={updateWebhookMutation.isPending}
                        variant="outline"
                        className="bg-zinc-900 border-zinc-700 text-red-400 hover:bg-zinc-800 hover:text-red-300"
                        data-testid="button-remove-webhook"
                      >
                        {updateWebhookMutation.isPending ? 'Removing...' : 'Remove Webhook'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
