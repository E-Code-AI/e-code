import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReplitPackagesPanel } from "@/components/editor/ReplitPackagesPanel";

interface ProjectOption {
  id: number | string;
  name?: string | null;
}

export default function PackagesPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projects = [], isLoading } = useQuery<ProjectOption[]>({
    queryKey: ["/api/projects"],
    queryFn: () => apiRequest("GET", "/api/projects"),
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  if (isLoading) {
    return <PageShellLoading text="Loading packages..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Packages"
        description="Manage real project dependencies through the package backend wired into the workspace."
        icon={Package}
        actions={(
          <div className="w-full sm:w-[280px]">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger data-testid="select-packages-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={String(project.id)} value={String(project.id)}>
                    {project.name || `Project ${project.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {!projects.length ? (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertTitle>No projects available</AlertTitle>
          <AlertDescription>Create or open a project to manage its dependencies.</AlertDescription>
        </Alert>
      ) : selectedProjectId ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ReplitPackagesPanel projectId={selectedProjectId} />
        </div>
      ) : null}
    </PageShell>
  );
}
