import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Workflow, 
  Plus, 
  Play, 
  Pause, 
  RotateCcw, 
  Settings,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Code2,
  Terminal,
  FileCode,
  Timer,
  Calendar,
  Zap,
  ChevronRight,
  Copy,
  Trash2,
  Edit
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ECodeLoading } from "@/components/ECodeLoading";

interface WorkflowRun {
  id: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  triggeredBy: string;
  commitHash?: string;
}

interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  trigger: 'push' | 'pull_request' | 'schedule' | 'manual';
  schedule?: string;
  branches?: string[];
  enabled: boolean;
  steps: {
    name: string;
    run: string;
    env?: Record<string, string>;
  }[];
  lastRun?: WorkflowRun;
  runs: number;
  successRate: number;
}

export default function Workflows() {
  const { toast } = useToast();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowConfig | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form state for new workflow
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: 'push' as const,
    schedule: '',
    branches: ['main'],
    steps: [{
      name: 'Build and Test',
      run: 'npm install\nnpm test\nnpm run build'
    }]
  });

  // Fetch workflows
  const { data: workflows = [], isLoading } = useQuery<WorkflowConfig[]>({
    queryKey: ['/api/workflows'],
    queryFn: async () => {
      // Mock data for demonstration
      return [
        {
          id: '1',
          name: 'CI/CD Pipeline',
          description: 'Build, test, and deploy on push to main',
          trigger: 'push',
          branches: ['main'],
          enabled: true,
          steps: [
            { name: 'Checkout', run: 'git checkout $GITHUB_SHA' },
            { name: 'Install Dependencies', run: 'npm ci' },
            { name: 'Run Tests', run: 'npm test' },
            { name: 'Build', run: 'npm run build' },
            { name: 'Deploy', run: 'npm run deploy', env: { NODE_ENV: 'production' } }
          ],
          lastRun: {
            id: 'run-1',
            status: 'success',
            startedAt: '2 hours ago',
            completedAt: '1 hour ago',
            duration: 3600,
            triggeredBy: 'Push to main',
            commitHash: 'abc123'
          },
          runs: 156,
          successRate: 92
        },
        {
          id: '2',
          name: 'Nightly Tests',
          description: 'Run comprehensive test suite every night',
          trigger: 'schedule',
          schedule: '0 2 * * *',
          enabled: true,
          steps: [
            { name: 'Setup Environment', run: 'npm ci' },
            { name: 'Run Unit Tests', run: 'npm run test:unit' },
            { name: 'Run Integration Tests', run: 'npm run test:integration' },
            { name: 'Run E2E Tests', run: 'npm run test:e2e' },
            { name: 'Generate Report', run: 'npm run test:report' }
          ],
          lastRun: {
            id: 'run-2',
            status: 'running',
            startedAt: '10 minutes ago',
            triggeredBy: 'Schedule'
          },
          runs: 45,
          successRate: 88
        },
        {
          id: '3',
          name: 'Security Scan',
          description: 'Scan for vulnerabilities on pull requests',
          trigger: 'pull_request',
          enabled: false,
          steps: [
            { name: 'Checkout', run: 'git checkout $GITHUB_SHA' },
            { name: 'Install Dependencies', run: 'npm ci' },
            { name: 'Run Security Audit', run: 'npm audit' },
            { name: 'Run SAST Scan', run: 'npm run security:scan' }
          ],
          runs: 89,
          successRate: 95
        }
      ];
    }
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflow: typeof newWorkflow) => {
      const res = await apiRequest('POST', '/api/workflows', workflow);
      if (!res.ok) throw new Error('Failed to create workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      setCreateDialogOpen(false);
      toast({
        title: "Workflow created",
        description: "Your workflow has been created successfully",
      });
      // Reset form
      setNewWorkflow({
        name: '',
        description: '',
        trigger: 'push',
        schedule: '',
        branches: ['main'],
        steps: [{
          name: 'Build and Test',
          run: 'npm install\nnpm test\nnpm run build'
        }]
      });
    }
  });

  // Run workflow mutation
  const runWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const res = await apiRequest('POST', `/api/workflows/${workflowId}/run`);
      if (!res.ok) throw new Error('Failed to run workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({
        title: "Workflow started",
        description: "The workflow run has been triggered",
      });
    }
  });

  // Toggle workflow mutation
  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await apiRequest('PATCH', `/api/workflows/${id}`, { enabled });
      if (!res.ok) throw new Error('Failed to update workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    }
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running': return <div className="animate-spin"><RotateCcw className="h-4 w-4 text-blue-500" /></div>;
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTriggerIcon = (trigger: string) => {
    switch (trigger) {
      case 'push': return <GitBranch className="h-4 w-4" />;
      case 'pull_request': return <Code2 className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      case 'manual': return <Play className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ECodeLoading size="lg" text="Loading workflows..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workflows</h1>
          <p className="text-muted-foreground">
            Automate your development process with custom workflows
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Set up automated tasks for your project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="CI/CD Pipeline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  placeholder="Describe what this workflow does..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger</Label>
                <Select
                  value={newWorkflow.trigger}
                  onValueChange={(value: any) => setNewWorkflow({ ...newWorkflow, trigger: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">On Push</SelectItem>
                    <SelectItem value="pull_request">On Pull Request</SelectItem>
                    <SelectItem value="schedule">On Schedule</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newWorkflow.trigger === 'schedule' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule">Cron Schedule</Label>
                  <Input
                    id="schedule"
                    value={newWorkflow.schedule}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, schedule: e.target.value })}
                    placeholder="0 2 * * * (every day at 2 AM)"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Workflow Steps</Label>
                <Textarea
                  value={newWorkflow.steps[0].run}
                  onChange={(e) => setNewWorkflow({
                    ...newWorkflow,
                    steps: [{ ...newWorkflow.steps[0], run: e.target.value }]
                  })}
                  placeholder="npm install&#10;npm test&#10;npm run build"
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createWorkflowMutation.mutate(newWorkflow)}
                disabled={!newWorkflow.name || createWorkflowMutation.isPending}
              >
                Create Workflow
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workflows Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getTriggerIcon(workflow.trigger)}
                    {workflow.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {workflow.description}
                  </CardDescription>
                </div>
                <Switch
                  checked={workflow.enabled}
                  onCheckedChange={(enabled) => 
                    toggleWorkflowMutation.mutate({ id: workflow.id, enabled })
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trigger Info */}
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {workflow.trigger === 'push' && `On push to ${workflow.branches?.join(', ')}`}
                  {workflow.trigger === 'pull_request' && 'On pull request'}
                  {workflow.trigger === 'schedule' && workflow.schedule}
                  {workflow.trigger === 'manual' && 'Manual trigger'}
                </Badge>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Runs</p>
                  <p className="text-xl font-semibold">{workflow.runs}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="text-xl font-semibold">{workflow.successRate}%</p>
                </div>
              </div>

              {/* Last Run */}
              {workflow.lastRun && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-2">Last Run</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(workflow.lastRun.status)}
                      <span className="text-sm capitalize">{workflow.lastRun.status}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {workflow.lastRun.startedAt}
                    </span>
                  </div>
                  {workflow.lastRun.triggeredBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {workflow.lastRun.triggeredBy}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => runWorkflowMutation.mutate(workflow.id)}
                  disabled={!workflow.enabled || runWorkflowMutation.isPending}
                  className="flex-1"
                >
                  <Play className="mr-1 h-3 w-3" />
                  Run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedWorkflow(workflow)}
                  className="flex-1"
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {workflows.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first workflow to automate your development process
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTriggerIcon(selectedWorkflow.trigger)}
                {selectedWorkflow.name}
              </DialogTitle>
              <DialogDescription>
                {selectedWorkflow.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Configuration */}
              <div>
                <h3 className="font-semibold mb-3">Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trigger</span>
                    <Badge variant="outline">{selectedWorkflow.trigger}</Badge>
                  </div>
                  {selectedWorkflow.branches && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Branches</span>
                      <span>{selectedWorkflow.branches.join(', ')}</span>
                    </div>
                  )}
                  {selectedWorkflow.schedule && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Schedule</span>
                      <span className="font-mono">{selectedWorkflow.schedule}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={selectedWorkflow.enabled ? "default" : "secondary"}>
                      {selectedWorkflow.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Workflow Steps */}
              <div>
                <h3 className="font-semibold mb-3">Workflow Steps</h3>
                <div className="space-y-3">
                  {selectedWorkflow.steps.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{step.name}</span>
                      </div>
                      <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                        <code>{step.run}</code>
                      </pre>
                      {step.env && Object.keys(step.env).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Environment Variables:</p>
                          <div className="text-xs font-mono">
                            {Object.entries(step.env).map(([key, value]) => (
                              <div key={key}>
                                {key}={value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Runs */}
              <div>
                <h3 className="font-semibold mb-3">Recent Runs</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Run history will appear here once workflows are executed
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedWorkflow(null)}>
                Close
              </Button>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Workflow
              </Button>
              <Button
                onClick={() => {
                  runWorkflowMutation.mutate(selectedWorkflow.id);
                  setSelectedWorkflow(null);
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                Run Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}