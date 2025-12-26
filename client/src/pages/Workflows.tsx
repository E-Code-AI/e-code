import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft,
  Play, 
  Plus, 
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Search,
  Terminal,
  Settings,
  Trash2,
  ExternalLink,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { ECodeLoading } from "@/components/ECodeLoading";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

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
  isAgentWorkflow?: boolean;
}

interface WorkflowsProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function Workflows({ onBack, embedded = false }: WorkflowsProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [agentWorkflowsOpen, setAgentWorkflowsOpen] = useState(true);
  const [userWorkflowsOpen, setUserWorkflowsOpen] = useState(true);

  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger: 'manual' as const,
    schedule: '',
    branches: ['main'],
    steps: [{
      name: 'Run command',
      run: 'npm run dev'
    }]
  });

  const { data: workflows = [], isLoading } = useQuery<WorkflowConfig[]>({
    queryKey: ['/api/workflows'],
  });

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
      setNewWorkflow({
        name: '',
        description: '',
        trigger: 'manual',
        schedule: '',
        branches: ['main'],
        steps: [{
          name: 'Run command',
          run: 'npm run dev'
        }]
      });
    }
  });

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

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const res = await apiRequest('DELETE', `/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error('Failed to delete workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
      toast({
        title: "Workflow deleted",
        description: "The workflow has been removed",
      });
    }
  });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setLocation('/');
    }
  };

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const agentWorkflows = filteredWorkflows.filter(w => w.isAgentWorkflow);
  const userWorkflows = filteredWorkflows.filter(w => !w.isAgentWorkflow);

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full bg-background", !embedded && "min-h-screen")}>
        <div className="flex-1 flex items-center justify-center">
          <ECodeLoading size="lg" text="Loading workflows..." />
        </div>
      </div>
    );
  }

  const WorkflowItem = ({ workflow }: { workflow: WorkflowConfig }) => (
    <div 
      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-b-0"
      data-testid={`workflow-item-${workflow.id}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Terminal className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{workflow.name}</p>
          {workflow.description && (
            <p className="text-xs text-muted-foreground truncate">{workflow.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={() => runWorkflowMutation.mutate(workflow.id)}
          disabled={runWorkflowMutation.isPending}
          data-testid={`run-workflow-${workflow.id}`}
        >
          <Play className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`workflow-menu-${workflow.id}`}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => runWorkflowMutation.mutate(workflow.id)}>
              <Play className="w-4 h-4 mr-2" />
              Run
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col h-full bg-background", !embedded && "min-h-screen")}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="h-9 w-9"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          <span className="font-semibold text-base">Workflows</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="header-menu">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search & New Workflow */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for a workflow..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
            data-testid="search-workflows"
          />
        </div>
        <Button 
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white shrink-0"
          data-testid="new-workflow-button"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Workflow
        </Button>
      </div>

      {/* Learn More Link */}
      <a 
        href="https://docs.replit.com/replit-workspace/running-code/workflows"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 px-4 py-3 text-blue-500 hover:text-blue-600 text-sm font-medium border-b"
        data-testid="learn-more-link"
      >
        Learn more about configuring Workflows
        <ExternalLink className="w-3 h-3" />
      </a>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Agent Workflows Section */}
        <Collapsible open={agentWorkflowsOpen} onOpenChange={setAgentWorkflowsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">Agent Workflows</span>
            {agentWorkflowsOpen ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            {agentWorkflows.length > 0 ? (
              <div className="border-t">
                {agentWorkflows.map((workflow) => (
                  <WorkflowItem key={workflow.id} workflow={workflow} />
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No agent workflows yet</p>
                <p className="text-xs mt-1">Workflows created by AI agents will appear here</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* User Workflows Section */}
        {userWorkflows.length > 0 && (
          <Collapsible open={userWorkflowsOpen} onOpenChange={setUserWorkflowsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-t">
              <span className="text-sm font-medium">My Workflows</span>
              {userWorkflowsOpen ? (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border-t">
                {userWorkflows.map((workflow) => (
                  <WorkflowItem key={workflow.id} workflow={workflow} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Empty State */}
        {filteredWorkflows.length === 0 && searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-base font-medium mb-1">No workflows found</h3>
            <p className="text-sm text-muted-foreground">
              Try a different search term or create a new workflow
            </p>
          </div>
        )}

        {workflows.length === 0 && !searchQuery && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Play className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-base font-medium mb-1">No workflows yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workflow to automate tasks
            </p>
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              data-testid="create-first-workflow"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Workflow
            </Button>
          </div>
        )}
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md mx-4">
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
                placeholder="Start application"
                data-testid="workflow-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder="Describe what this workflow does..."
                data-testid="workflow-description-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trigger">Trigger</Label>
              <Select
                value={newWorkflow.trigger}
                onValueChange={(value: any) => setNewWorkflow({ ...newWorkflow, trigger: value })}
              >
                <SelectTrigger data-testid="workflow-trigger-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="push">On Push</SelectItem>
                  <SelectItem value="pull_request">On Pull Request</SelectItem>
                  <SelectItem value="schedule">On Schedule</SelectItem>
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
                  placeholder="0 2 * * *"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Command</Label>
              <Textarea
                value={newWorkflow.steps[0].run}
                onChange={(e) => setNewWorkflow({
                  ...newWorkflow,
                  steps: [{ ...newWorkflow.steps[0], run: e.target.value }]
                })}
                placeholder="npm run dev"
                rows={4}
                className="font-mono text-sm"
                data-testid="workflow-command-input"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createWorkflowMutation.mutate(newWorkflow)}
              disabled={!newWorkflow.name || createWorkflowMutation.isPending}
              className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white"
              data-testid="create-workflow-submit"
            >
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
