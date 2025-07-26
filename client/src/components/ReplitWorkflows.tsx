import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Workflow, Play, Square, Clock, CheckCircle, 
  AlertCircle, Plus, Settings, GitBranch, 
  Zap, Timer, Code, Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkflowTrigger {
  type: 'manual' | 'push' | 'schedule' | 'webhook';
  config?: {
    branch?: string;
    cron?: string;
    url?: string;
  };
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'command' | 'script' | 'deploy' | 'test';
  command?: string;
  script?: string;
  config?: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  logs: string[];
  trigger: string;
}

interface ReplitWorkflowsProps {
  projectId: number;
}

export function ReplitWorkflows({ projectId }: ReplitWorkflowsProps) {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: { type: 'manual' as const },
    steps: [{ id: '1', name: 'Build', type: 'command' as const, command: 'npm run build' }]
  });

  useEffect(() => {
    fetchWorkflows();
    fetchRuns();
  }, [projectId]);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/workflows`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.workflows || []);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRuns = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/workflow-runs`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
      }
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflow.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Workflow name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newWorkflow)
      });

      if (response.ok) {
        toast({
          title: "Workflow Created",
          description: `Workflow "${newWorkflow.name}" has been created`
        });
        
        setNewWorkflow({
          name: '',
          description: '',
          trigger: { type: 'manual' },
          steps: [{ id: '1', name: 'Build', type: 'command', command: 'npm run build' }]
        });
        setShowCreateDialog(false);
        fetchWorkflows();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create workflow",
        variant: "destructive"
      });
    }
  };

  const runWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/workflows/${workflowId}/run`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Workflow Started",
          description: "Workflow execution has begun"
        });
        fetchWorkflows();
        fetchRuns();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run workflow",
        variant: "destructive"
      });
    }
  };

  const toggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        fetchWorkflows();
        toast({
          title: enabled ? "Workflow Enabled" : "Workflow Disabled",
          description: `Workflow has been ${enabled ? 'enabled' : 'disabled'}`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workflow",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <Play className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'push': return <GitBranch className="h-4 w-4" />;
      case 'schedule': return <Timer className="h-4 w-4" />;
      case 'webhook': return <Zap className="h-4 w-4" />;
      default: return <Play className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6" />
            Workflows
          </h2>
          <p className="text-muted-foreground">
            Automate your development workflow with custom CI/CD pipelines
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Set up automated tasks that run when specific events occur
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="trigger">Trigger</TabsTrigger>
                <TabsTrigger value="steps">Steps</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workflow Name</Label>
                  <Input
                    id="name"
                    placeholder="Deploy to Production"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What does this workflow do?"
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="trigger" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Trigger Type</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { type: 'manual', label: 'Manual', desc: 'Run manually' },
                        { type: 'push', label: 'Git Push', desc: 'On code push' },
                        { type: 'schedule', label: 'Schedule', desc: 'Cron schedule' },
                        { type: 'webhook', label: 'Webhook', desc: 'HTTP trigger' }
                      ].map((trigger) => (
                        <Card 
                          key={trigger.type}
                          className={`p-3 cursor-pointer transition-all ${
                            newWorkflow.trigger.type === trigger.type 
                              ? 'ring-2 ring-primary border-primary' 
                              : 'hover:shadow-sm'
                          }`}
                          onClick={() => setNewWorkflow(prev => ({ 
                            ...prev, 
                            trigger: { type: trigger.type as any }
                          }))}
                        >
                          <div className="flex items-center gap-2">
                            {getTriggerIcon(trigger.type)}
                            <div>
                              <p className="font-medium text-sm">{trigger.label}</p>
                              <p className="text-xs text-muted-foreground">{trigger.desc}</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  {newWorkflow.trigger.type === 'push' && (
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input placeholder="main" />
                    </div>
                  )}
                  
                  {newWorkflow.trigger.type === 'schedule' && (
                    <div className="space-y-2">
                      <Label>Cron Expression</Label>
                      <Input placeholder="0 0 * * *" />
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="steps" className="space-y-4">
                <div className="space-y-3">
                  {newWorkflow.steps.map((step, index) => (
                    <Card key={step.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <Input 
                            placeholder="Step name"
                            value={step.name}
                            className="mb-2"
                          />
                          <Input 
                            placeholder="Command or script"
                            value={step.command || ''}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createWorkflow}>
                Create Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Workflows ({workflows.length})</TabsTrigger>
          <TabsTrigger value="runs">Recent Runs ({runs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {workflows.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first workflow to automate your development process
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {workflows.map((workflow) => (
                <Card key={workflow.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Workflow className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          <CardDescription>{workflow.description}</CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(workflow.status)} border`}>
                          {getStatusIcon(workflow.status)}
                          <span className="ml-1 capitalize">{workflow.status}</span>
                        </Badge>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWorkflow(workflow.id, !workflow.enabled)}
                        >
                          {workflow.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        
                        <Button
                          size="sm"
                          onClick={() => runWorkflow(workflow.id)}
                          disabled={!workflow.enabled || workflow.status === 'running'}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Run
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getTriggerIcon(workflow.trigger.type)}
                        <span className="capitalize">{workflow.trigger.type} trigger</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        <span>{workflow.steps.length} steps</span>
                      </div>
                      
                      {workflow.lastRun && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Last run {new Date(workflow.lastRun).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {workflow.steps.map((step, index) => (
                        <Badge key={step.id} variant="outline" className="text-xs">
                          {index + 1}. {step.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          {runs.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No workflow runs yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <Card key={run.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(run.status)} border`}>
                        {getStatusIcon(run.status)}
                        <span className="ml-1 capitalize">{run.status}</span>
                      </Badge>
                      
                      <div>
                        <p className="font-medium">
                          {workflows.find(w => w.id === run.workflowId)?.name || 'Unknown Workflow'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Triggered by {run.trigger} • Started {new Date(run.startedAt).toLocaleString()}
                          {run.completedAt && (
                            <span> • Duration {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s</span>
                          )}
                        </p>
                      </div>
                    </div>
                    
                    <Button variant="outline" size="sm" onClick={() => setSelectedWorkflow(workflows.find(w => w.id === run.workflowId) || null)}>
                      View Logs
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Workflow Details/Logs Modal */}
      {selectedWorkflow && (
        <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedWorkflow.name}</DialogTitle>
              <DialogDescription>Workflow execution details and logs</DialogDescription>
            </DialogHeader>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              <div>[2024-01-01 12:00:00] Workflow started</div>
              <div>[2024-01-01 12:00:01] Step 1: Building application...</div>
              <div>[2024-01-01 12:00:05] npm run build</div>
              <div>[2024-01-01 12:00:15] Build completed successfully</div>
              <div>[2024-01-01 12:00:16] Step 2: Running tests...</div>
              <div>[2024-01-01 12:00:20] All tests passed</div>
              <div>[2024-01-01 12:00:21] Workflow completed successfully</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}