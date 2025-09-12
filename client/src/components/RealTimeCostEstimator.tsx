import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface RealTimeCostEstimatorProps {
  projectId: number;
  isActive: boolean;
  currentTask?: string;
  estimatedComplexity?: 'simple' | 'moderate' | 'complex' | 'expert';
  tokensUsed?: number;
  className?: string;
}

export const RealTimeCostEstimator: React.FC<RealTimeCostEstimatorProps> = ({
  projectId,
  isActive,
  currentTask,
  estimatedComplexity = 'moderate',
  tokensUsed = 0,
  className
}) => {
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [costBreakdown, setCostBreakdown] = useState<any>(null);

  useEffect(() => {
    if (!isActive) {
      setTimeElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !projectId) return;

    // Fetch real-time cost estimation from API
    const fetchCostEstimate = async () => {
      try {
        const response = await apiRequest(
          `/api/agent/usage/cost-estimate/${projectId}?tokensUsed=${tokensUsed}&timeElapsed=${timeElapsed}&complexity=${estimatedComplexity}`
        );
        
        if (response.success) {
          setEstimatedCost(response.estimate.totalCostCents);
          setCostBreakdown(response.estimate.breakdown);
        }
      } catch (error) {
        console.error('Failed to fetch cost estimate:', error);
        // Fallback to local calculation
        const complexityMultiplier = {
          simple: 1.0,
          moderate: 1.5,
          complex: 2.0,
          expert: 3.0
        };

        const baseRates = {
          perThousandTokens: 50,
          perComputeMinute: 200
        };

        const tokenCost = (tokensUsed / 1000) * baseRates.perThousandTokens;
        const computeCost = (timeElapsed / 60) * baseRates.perComputeMinute;
        const multiplier = complexityMultiplier[estimatedComplexity];
        
        const total = (tokenCost + computeCost) * multiplier;
        setEstimatedCost(Math.round(total));
      }
    };

    const debounceTimer = setTimeout(fetchCostEstimate, 500);
    return () => clearTimeout(debounceTimer);
  }, [projectId, tokensUsed, timeElapsed, estimatedComplexity, isActive]);

  if (!isActive) return null;

  const getComplexityColor = () => {
    switch (estimatedComplexity) {
      case 'simple': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'complex': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expert': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const complexityMultiplier = costBreakdown?.complexityMultiplier || {
    simple: 1.0,
    moderate: 1.5,
    complex: 2.0,
    expert: 3.0
  }[estimatedComplexity];

  return (
    <Card className={cn("w-full max-w-sm border-l-4 border-l-blue-500", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Live Cost</span>
          </div>
          <Badge variant="outline" className={getComplexityColor()}>
            {estimatedComplexity}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-green-600">
              ${(estimatedCost / 100).toFixed(3)}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          {currentTask && (
            <p className="text-xs text-gray-600 truncate" title={currentTask}>
              {currentTask}
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span>{tokensUsed.toLocaleString()} tokens</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span>{complexityMultiplier}x rate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};