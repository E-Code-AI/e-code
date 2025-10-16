// @ts-nocheck
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, Clock, Code, Server, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface EffortPricingDisplayProps {
  projectId: number;
}

interface EffortMetrics {
  tokensUsed: number;
  apiCalls: number;
  computeTime: number;
  filesProcessed: number;
  codeGenerated: number;
  testsRun: number;
  deploymentsCreated: number;
  errorsRecovered: number;
  checkpointsCreated: number;
  totalEffortScore: number;
}

interface EffortUsageReport {
  userId: number;
  projectId: number;
  period: {
    start: Date;
    end: Date;
  };
  totalEffort: EffortMetrics;
  totalCost: number;
  dailyBreakdown: Array<{
    date: string;
    effort: EffortMetrics;
    cost: number;
  }>;
}

export function EffortPricingDisplay({ projectId }: EffortPricingDisplayProps) {
  // Fetch usage report
  const { data: usageReport, isLoading } = useQuery({
    queryKey: ['/api/effort/usage', projectId],
    queryFn: () => apiRequest('GET', `/api/effort/usage/${projectId}`).then(res => res.json()),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const formatCost = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cents / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const report = usageReport?.report as EffortUsageReport | undefined;

  if (!report) {
    return null;
  }

  const todaysCost = report.dailyBreakdown[report.dailyBreakdown.length - 1]?.cost || 0;
  const averageDailyCost = report.totalCost / Math.max(1, report.dailyBreakdown.length);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(report.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Period: {format(new Date(report.period.start), 'MMM d')} - {format(new Date(report.period.end), 'MMM d')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(todaysCost)}</div>
            <Progress 
              value={(todaysCost / averageDailyCost) * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(report.totalEffort.tokensUsed)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCost(Math.round(report.totalEffort.tokensUsed / 1000 * 50))} cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compute Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(report.totalEffort.computeTime / 60)}m</div>
            <p className="text-xs text-muted-foreground">
              {formatCost(Math.round(report.totalEffort.computeTime / 60 * 200))} cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Effort Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Code Generated</span>
              </div>
              <div className="text-sm font-medium">{formatNumber(report.totalEffort.codeGenerated)} lines</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">API Calls</span>
              </div>
              <div className="text-sm font-medium">{formatNumber(report.totalEffort.apiCalls)}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Errors Recovered</span>
              </div>
              <div className="text-sm font-medium">{report.totalEffort.errorsRecovered}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.dailyBreakdown.slice(-7).map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {format(new Date(day.date), 'EEE, MMM d')}
                </span>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <Progress 
                      value={(day.cost / Math.max(...report.dailyBreakdown.map(d => d.cost))) * 100}
                      className="h-2"
                    />
                  </div>
                  <Badge variant="secondary" className="min-w-[80px] justify-center">
                    {formatCost(day.cost)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}