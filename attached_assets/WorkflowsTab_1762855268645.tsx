import { useState } from "react";
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Settings,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GitBranch,
  Terminal,
  Mail,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { toast } from "sonner@2.0.3";

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: "active" | "paused" | "error";
  lastRun: string;
  runs: number;
  success: number;
}

export function WorkflowsTab() {
  const [workflows] = useState<WorkflowItem[]>([
    {
      id: "1",
      name: "CI/CD Pipeline",
      description: "Build, test, and deploy on push to main",
      trigger: "On push to main branch",
      status: "active",
      lastRun: "5 min ago",
      runs: 234,
      success: 98,
    },
    {
      id: "2",
      name: "Daily Backup",
      description: "Backup database and storage daily",
      trigger: "Daily at 2:00 AM UTC",
      status: "active",
      lastRun: "6 hours ago",
      runs: 45,
      success: 100,
    },
    {
      id: "3",
      name: "Send Welcome Email",
      description: "Send email to new users on signup",
      trigger: "On user registration",
      status: "paused",
      lastRun: "2 days ago",
      runs: 1203,
      success: 99,
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary">
            <Pause className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const runWorkflow = (id: string, name: string) => {
    toast.success(`Running workflow: ${name}`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="flex items-center gap-2">
          <Workflow className="w-5 h-5" />
          Workflows
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Automate tasks and processes with custom workflows
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Create Workflow */}
          <Button className="w-full" onClick={() => toast.info("Create workflow", { description: "Workflow builder would open here" })}>
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>

          {/* Workflow Templates */}
          <div className="space-y-3">
            <h3 className="text-sm">Popular Templates</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => toast.success("Template loaded: Deploy on Push")}>
                <GitBranch className="w-5 h-5 mb-2 text-blue-500" />
                <p className="text-sm">Deploy on Push</p>
                <p className="text-xs text-muted-foreground">Auto-deploy to production</p>
              </div>
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => toast.success("Template loaded: Run Tests")}>
                <Terminal className="w-5 h-5 mb-2 text-green-500" />
                <p className="text-sm">Run Tests</p>
                <p className="text-xs text-muted-foreground">Test on every commit</p>
              </div>
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => toast.success("Template loaded: Scheduled Task")}>
                <Clock className="w-5 h-5 mb-2 text-purple-500" />
                <p className="text-sm">Scheduled Task</p>
                <p className="text-xs text-muted-foreground">Run on a schedule</p>
              </div>
              <div className="p-3 border rounded-lg cursor-pointer hover:bg-accent" onClick={() => toast.success("Template loaded: Send Notifications")}>
                <Mail className="w-5 h-5 mb-2 text-orange-500" />
                <p className="text-sm">Send Notifications</p>
                <p className="text-xs text-muted-foreground">Email/Slack alerts</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Active Workflows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm">Your Workflows</h3>
              <span className="text-xs text-muted-foreground">
                {workflows.length} workflows
              </span>
            </div>

            <div className="space-y-3">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4>{workflow.name}</h4>
                        {getStatusBadge(workflow.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {workflow.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {workflow.trigger}
                    </span>
                    <span>Last run {workflow.lastRun}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total Runs</p>
                      <p className="text-sm">{workflow.runs}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
                      <p className="text-sm text-green-500">{workflow.success}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Duration</p>
                      <p className="text-sm">2.3s</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runWorkflow(workflow.id, workflow.name)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Run
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Configure workflow", { description: "Workflow settings would open here" })}>
                      <Settings className="w-3 h-3 mr-1" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info("View logs", { description: "Workflow logs would open here" })}>
                      View Logs
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              About Workflows
            </h3>
            <p className="text-sm text-muted-foreground">
              Workflows automate repetitive tasks like testing, deployment, and notifications.
              Create custom workflows using our visual builder or YAML configuration.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
