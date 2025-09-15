import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  FileText, 
  Search, 
  Code, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Play,
  Loader2 
} from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { cn } from '@/lib/utils';

interface AgentStep {
  id: string;
  type: 'thinking' | 'file_read' | 'file_write' | 'search' | 'code_execution' | 'planning';
  status: 'pending' | 'running' | 'completed' | 'error';
  title: string;
  description?: string;
  filePath?: string;
  duration?: number;
  startTime: Date;
  endTime?: Date;
  details?: string;
  progress?: number;
}

interface AgentProgressTabProps {
  isVisible: boolean;
  sessionId?: string;
}

const stepIcons = {
  thinking: Brain,
  file_read: FileText,
  file_write: FileText,
  search: Search,
  code_execution: Code,
  planning: Brain,
};

const stepColors = {
  pending: 'text-gray-400',
  running: 'text-blue-600',
  completed: 'text-green-600',
  error: 'text-red-600',
};

export function AgentProgressTab({ isVisible, sessionId }: AgentProgressTabProps) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const isEnabled = useFeatureFlag('aiUx.progressTab');
  
  useEffect(() => {
    if (!isEnabled || !isVisible || !sessionId) return;
    
    // Set up WebSocket connection for real-time updates
    const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/ai/progress/${sessionId}`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      switch (update.type) {
        case 'step_started':
          handleStepStarted(update.step);
          break;
        case 'step_updated':
          handleStepUpdated(update.step);
          break;
        case 'step_completed':
          handleStepCompleted(update.step);
          break;
        case 'progress_update':
          setOverallProgress(update.progress);
          break;
        case 'session_complete':
          handleSessionComplete();
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
    };
  }, [isEnabled, isVisible, sessionId]);
  
  // Auto-scroll to bottom when new steps are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [steps]);
  
  const handleStepStarted = (step: AgentStep) => {
    setSteps(prev => [...prev, { ...step, status: 'running' }]);
    setCurrentStep(step.id);
  };
  
  const handleStepUpdated = (updatedStep: Partial<AgentStep> & { id: string }) => {
    setSteps(prev => prev.map(step => 
      step.id === updatedStep.id 
        ? { ...step, ...updatedStep }
        : step
    ));
  };
  
  const handleStepCompleted = (completedStep: Partial<AgentStep> & { id: string }) => {
    setSteps(prev => prev.map(step => 
      step.id === completedStep.id 
        ? { ...step, ...completedStep, status: 'completed', endTime: new Date() }
        : step
    ));
    
    if (currentStep === completedStep.id) {
      setCurrentStep(null);
    }
  };
  
  const handleSessionComplete = () => {
    setCurrentStep(null);
    setOverallProgress(100);
  };
  
  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const diff = endTime.getTime() - start.getTime();
    return `${Math.round(diff / 1000)}s`;
  };
  
  const getStepIcon = (step: AgentStep) => {
    const IconComponent = stepIcons[step.type] || Brain;
    
    if (step.status === 'running') {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
    }
    
    if (step.status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    
    if (step.status === 'error') {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    
    return <IconComponent className={cn('h-4 w-4', stepColors[step.status])} />;
  };
  
  if (!isEnabled || !isVisible) {
    return null;
  }
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5" />
          Agent Progress
          {currentStep && (
            <Badge variant="outline" className="ml-auto">
              Running
            </Badge>
          )}
        </CardTitle>
        
        {overallProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6 pb-6" ref={scrollAreaRef}>
          {steps.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for AI agent to start...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    step.status === 'running' && 'bg-blue-50 border-blue-200',
                    step.status === 'completed' && 'bg-green-50 border-green-200',
                    step.status === 'error' && 'bg-red-50 border-red-200',
                    step.status === 'pending' && 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getStepIcon(step)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDuration(step.startTime, step.endTime)}
                      </div>
                    </div>
                    
                    {step.description && (
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    )}
                    
                    {step.filePath && (
                      <div className="flex items-center gap-1 mt-1">
                        <FileText className="h-3 w-3 text-gray-400" />
                        <code className="text-xs text-gray-600 bg-gray-100 px-1 rounded">
                          {step.filePath}
                        </code>
                      </div>
                    )}
                    
                    {step.progress !== undefined && step.status === 'running' && (
                      <Progress value={step.progress} className="h-1 mt-2" />
                    )}
                    
                    {step.details && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">
                          Show details
                        </summary>
                        <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap bg-gray-100 p-2 rounded">
                          {step.details}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}