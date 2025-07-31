import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Rocket,
  GitBranch,
  Package,
  Shield,
  Globe,
  Check,
  X,
  Loader2,
  AlertCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Terminal,
  FileCode,
  Server,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  logs?: string[];
  steps: PipelineStep[];
}

interface PipelineStep {
  id: string;
  name: string;
  command?: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  output?: string;
  error?: string;
}

interface Pipeline {
  id: string;
  projectId: number;
  branch: string;
  commit: {
    id: string;
    message: string;
    author: string;
  };
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  stages: PipelineStage[];
  startTime: Date;
  endTime?: Date;
  deploymentUrl?: string;
  artifacts?: {
    name: string;
    size: number;
    url: string;
  }[];
}

interface DeploymentPipelineProps {
  projectId: number;
  className?: string;
}

export function ReplitDeploymentPipeline({ projectId, className }: DeploymentPipelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Fetch current pipeline
  const { data: currentPipeline } = useQuery<Pipeline>({
    queryKey: [`/api/projects/${projectId}/pipeline/current`],
    refetchInterval: (query) => {
      const pipeline = query.state.data;
      if (pipeline && ['running', 'pending'].includes(pipeline.status)) {
        return autoRefresh ? 5000 : false;
      }
      return false;
    }
  });

  // Fetch pipeline history
  const { data: pipelineHistory = [] } = useQuery<Pipeline[]>({
    queryKey: [`/api/projects/${projectId}/pipeline/history`]
  });

  // Trigger deployment mutation
  const deployMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/projects/${projectId}/deploy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/pipeline`] });
      toast({
        title: 'Deployment started',
        description: 'Your deployment pipeline has been triggered'
      });
    }
  });

  // Cancel deployment mutation
  const cancelMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      return apiRequest('POST', `/api/projects/${projectId}/pipeline/${pipelineId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/pipeline`] });
      toast({
        title: 'Deployment cancelled',
        description: 'The deployment has been cancelled'
      });
    }
  });

  // Retry deployment mutation
  const retryMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      return apiRequest('POST', `/api/projects/${projectId}/pipeline/${pipelineId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/pipeline`] });
      toast({
        title: 'Deployment retried',
        description: 'The deployment has been retried'
      });
    }
  });

  // Draw pipeline visualization
  useEffect(() => {
    if (!canvasRef.current || !currentPipeline) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stage dimensions
    const stageWidth = 150;
    const stageHeight = 80;
    const stageSpacing = 50;
    const startX = 50;
    const startY = canvas.height / 2 - stageHeight / 2;

    // Draw stages
    currentPipeline.stages.forEach((stage, index) => {
      const x = startX + index * (stageWidth + stageSpacing);
      const y = startY;

      // Connection line
      if (index > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.moveTo(x - stageSpacing, y + stageHeight / 2);
        ctx.lineTo(x, y + stageHeight / 2);
        ctx.stroke();
      }

      // Stage background
      let bgColor = '#1f2937'; // Default
      if (stage.status === 'success') bgColor = '#10b981';
      else if (stage.status === 'failed') bgColor = '#ef4444';
      else if (stage.status === 'running') bgColor = '#3b82f6';
      else if (stage.status === 'skipped') bgColor = '#6b7280';

      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x, y, stageWidth, stageHeight, 8);
      ctx.fill();

      // Stage icon
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      let icon = '○';
      if (stage.status === 'success') icon = '✓';
      else if (stage.status === 'failed') icon = '✗';
      else if (stage.status === 'running') icon = '◉';
      else if (stage.status === 'skipped') icon = '⊘';
      ctx.fillText(icon, x + stageWidth / 2, y + 30);

      // Stage name
      ctx.font = '14px sans-serif';
      ctx.fillText(stage.name, x + stageWidth / 2, y + 55);

      // Duration
      if (stage.duration) {
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(`${(stage.duration / 1000).toFixed(1)}s`, x + stageWidth / 2, y + 70);
      }
    });
  }, [currentPipeline]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      case 'pending':
        return 'text-gray-500';
      case 'skipped':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <TooltipProvider>
      <Card className={cn("h-full flex flex-col", className, isFullscreen && "fixed inset-0 z-50")}>
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Deployment Pipeline
            </CardTitle>
            <div className="flex items-center gap-2">
              {currentPipeline && currentPipeline.status === 'running' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelMutation.mutate(currentPipeline.id)}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              {currentPipeline && currentPipeline.status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => retryMutation.mutate(currentPipeline.id)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => deployMutation.mutate()}
                disabled={currentPipeline?.status === 'running' || deployMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Deploy
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4">
          {currentPipeline ? (
            <>
              {/* Pipeline info */}
              <div className="mb-4 p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <Badge variant={currentPipeline.status === 'success' ? 'default' : 
                                  currentPipeline.status === 'failed' ? 'destructive' : 
                                  'secondary'}>
                      {currentPipeline.status}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <GitBranch className="h-4 w-4" />
                      {currentPipeline.branch}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileCode className="h-4 w-4" />
                      {currentPipeline.commit.id.slice(0, 7)}
                    </div>
                  </div>
                  {currentPipeline.deploymentUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={currentPipeline.deploymentUrl} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-2" />
                        View Deployment
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-sm">{currentPipeline.commit.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  by {currentPipeline.commit.author} • {new Date(currentPipeline.startTime).toLocaleString()}
                  {currentPipeline.endTime && ` • ${formatDuration(new Date(currentPipeline.endTime).getTime() - new Date(currentPipeline.startTime).getTime())}`}
                </p>
              </div>

              {/* Pipeline visualization */}
              <div className="mb-4 border rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={150}
                  className="w-full bg-[#0a0a0a]"
                />
              </div>

              <Tabs defaultValue="stages" className="flex-1 flex flex-col">
                <TabsList>
                  <TabsTrigger value="stages">Stages</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                  <TabsTrigger value="artifacts">
                    Artifacts
                    {currentPipeline.artifacts && currentPipeline.artifacts.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {currentPipeline.artifacts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="stages" className="flex-1">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      {currentPipeline.stages.map((stage) => (
                        <div
                          key={stage.id}
                          className={cn(
                            "border rounded-lg p-4 cursor-pointer",
                            selectedStage?.id === stage.id && "border-primary"
                          )}
                          onClick={() => setSelectedStage(stage)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(stage.status)}
                              <h3 className="font-medium">{stage.name}</h3>
                            </div>
                            {stage.duration && (
                              <span className="text-sm text-muted-foreground">
                                {formatDuration(stage.duration)}
                              </span>
                            )}
                          </div>

                          {stage.status === 'running' && (
                            <Progress value={50} className="mb-2" />
                          )}

                          <div className="space-y-2">
                            {stage.steps.map((step) => (
                              <div
                                key={step.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(step.status)}
                                  <span className={getStatusColor(step.status)}>
                                    {step.name}
                                  </span>
                                </div>
                                {step.command && (
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {step.command}
                                  </code>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="logs" className="flex-1">
                  <ScrollArea className="h-full">
                    <div className="bg-black p-4 rounded-lg font-mono text-xs text-green-400">
                      {selectedStage ? (
                        selectedStage.logs?.map((log, index) => (
                          <div key={index}>{log}</div>
                        ))
                      ) : (
                        <p className="text-gray-500">Select a stage to view logs</p>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="artifacts" className="flex-1">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {currentPipeline.artifacts?.map((artifact, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span className="font-medium">{artifact.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {(artifact.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={artifact.url} download>
                              Download
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="history" className="flex-1">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {pipelineHistory.map((pipeline) => (
                        <div
                          key={pipeline.id}
                          className="p-3 rounded-lg border cursor-pointer hover:bg-muted"
                          onClick={() => setSelectedPipeline(pipeline)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(pipeline.status)}
                              <span className="font-medium">
                                {pipeline.commit.message}
                              </span>
                            </div>
                            <Badge variant="outline">
                              {pipeline.commit.id.slice(0, 7)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{new Date(pipeline.startTime).toLocaleString()}</span>
                            {pipeline.endTime && (
                              <span>{formatDuration(new Date(pipeline.endTime).getTime() - new Date(pipeline.startTime).getTime())}</span>
                            )}
                            <span>{pipeline.branch}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Rocket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium">No active deployment</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Click Deploy to start a new deployment
                </p>
                <Button onClick={() => deployMutation.mutate()}>
                  <Play className="h-4 w-4 mr-2" />
                  Deploy Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}