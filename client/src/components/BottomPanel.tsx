import { File } from "@shared/schema";
import { Terminal, AlertCircle, Workflow } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReplitWorkflows } from "@/components/ReplitWorkflows";
import { ReplitOutputPanel } from "@/components/editor/ReplitOutputPanel";
import { ReplitProblemsPanel } from "@/components/editor/ReplitProblemsPanel";

interface BottomPanelProps {
  activeFile: File | undefined;
  projectId?: number;
}

const BottomPanel = ({ projectId }: BottomPanelProps) => {
  const projectIdStr = projectId != null ? String(projectId) : undefined;

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="console" className="h-full flex flex-col">
        <div className="flex items-center justify-between border-b">
          <TabsList className="h-10">
            <TabsTrigger value="console" className="flex gap-2 h-8">
              <Terminal className="h-4 w-4" />
              <span>Console</span>
            </TabsTrigger>
            <TabsTrigger value="problems" className="flex gap-2 h-8">
              <AlertCircle className="h-4 w-4" />
              <span>Problems</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex gap-2 h-8">
              <Workflow className="h-4 w-4" />
              <span>Workflows</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="console" className="flex-1 p-0 m-0 overflow-hidden">
          <ReplitOutputPanel projectId={projectIdStr} />
        </TabsContent>

        <TabsContent value="problems" className="flex-1 p-0 m-0 overflow-hidden">
          <ReplitProblemsPanel projectId={projectIdStr} />
        </TabsContent>

        <TabsContent value="workflows" className="flex-1 p-0 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              {projectId ? (
                <ReplitWorkflows projectId={projectId} />
              ) : (
                <div className="text-[13px] text-muted-foreground py-8 text-center">
                  Project information unavailable. Open a project to manage workflows.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BottomPanel;
