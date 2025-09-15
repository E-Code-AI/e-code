import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Zap, Info, DollarSign } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { useToast } from '@/hooks/use-toast';

interface AIModeTogglesProps {
  extendedThinking: boolean;
  highPowerMode: boolean;
  onExtendedThinkingChange: (enabled: boolean) => void;
  onHighPowerModeChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export function AIModeToggles({
  extendedThinking,
  highPowerMode,
  onExtendedThinkingChange,
  onHighPowerModeChange,
  disabled = false,
}: AIModeTogglesProps) {
  const [quotaWarning, setQuotaWarning] = useState(false);
  const { toast } = useToast();
  
  const extendedThinkingEnabled = useFeatureFlag('aiUx.extendedThinking');
  const highPowerModeEnabled = useFeatureFlag('aiUx.highPowerMode');
  
  // Check quotas when modes are enabled
  useEffect(() => {
    if (highPowerMode || extendedThinking) {
      checkQuotas();
    }
  }, [highPowerMode, extendedThinking]);
  
  const checkQuotas = async () => {
    try {
      const response = await fetch('/api/ai/quota-check');
      if (response.ok) {
        const { warning, remainingCredits } = await response.json();
        setQuotaWarning(warning);
        
        if (warning) {
          toast({
            title: "Quota Warning",
            description: `You have ${remainingCredits} AI credits remaining.`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error checking quotas:', error);
    }
  };
  
  const handleExtendedThinkingToggle = (enabled: boolean) => {
    if (enabled && quotaWarning) {
      toast({
        title: "Limited Credits",
        description: "Extended thinking uses more credits. Continue?",
        variant: "destructive",
      });
    }
    onExtendedThinkingChange(enabled);
  };
  
  const handleHighPowerModeToggle = (enabled: boolean) => {
    if (enabled && quotaWarning) {
      toast({
        title: "Limited Credits",
        description: "High power mode uses premium models. Continue?",
        variant: "destructive",
      });
    }
    onHighPowerModeChange(enabled);
  };
  
  if (!extendedThinkingEnabled && !highPowerModeEnabled) {
    return null;
  }
  
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium text-purple-900">AI Enhancement Modes</h3>
            {quotaWarning && (
              <Badge variant="destructive" className="text-xs">
                Low Credits
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Extended Thinking Toggle */}
            {extendedThinkingEnabled && (
              <div className="flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <div className="flex-1">
                    <Label 
                      htmlFor="extended-thinking" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      Extended Thinking
                    </Label>
                    <p className="text-xs text-gray-600">
                      More thorough analysis and reasoning
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium">Extended Thinking Mode</p>
                        <p className="text-sm">
                          Uses longer context windows and step-by-step reasoning.
                          Provides more detailed explanations and catches edge cases.
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs">
                          <DollarSign className="h-3 w-3" />
                          <span>~2x credits per request</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="extended-thinking"
                  checked={extendedThinking}
                  onCheckedChange={handleExtendedThinkingToggle}
                  disabled={disabled}
                />
              </div>
            )}
            
            {/* High Power Mode Toggle */}
            {highPowerModeEnabled && (
              <div className="flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <Label 
                      htmlFor="high-power-mode" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      High Power Mode
                    </Label>
                    <p className="text-xs text-gray-600">
                      Premium AI models for complex tasks
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium">High Power Mode</p>
                        <p className="text-sm">
                          Uses the most capable AI models (GPT-4, Claude-3, etc.)
                          for maximum quality and accuracy on difficult problems.
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs">
                          <DollarSign className="h-3 w-3" />
                          <span>~5x credits per request</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="high-power-mode"
                  checked={highPowerMode}
                  onCheckedChange={handleHighPowerModeToggle}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
          
          {/* Cost Estimation */}
          {(extendedThinking || highPowerMode) && (
            <div className="pt-2 border-t border-purple-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-700">Estimated cost multiplier:</span>
                <Badge variant="outline" className="text-purple-700 border-purple-300">
                  {extendedThinking && highPowerMode ? '10x' : 
                   highPowerMode ? '5x' : 
                   extendedThinking ? '2x' : '1x'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}