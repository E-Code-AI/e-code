import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Package, ExternalLink } from "lucide-react";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { ReplitPackagesPanel } from "@/components/editor/ReplitPackagesPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface ProjectSummary {
  id: number;
  name: string;
  description?: string | null;
}

export default function Dependencies() {
  const [location, navigate] = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const projectIdFromQuery = searchParams.get("projectId") || "";
  const [selectedProjectId, setSelectedProjectId] = useState(projectIdFromQuery);

  const { data: projects = [], isLoading, error } = useQuery<ProjectSummary[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const data = await apiRequest<any>("GET", "/api/projects");
      return Array.isArray(data) ? data : data.projects || [];
    },
    staleTime: 30000,
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const fallbackProjectId = String(projects[0].id);
      setSelectedProjectId(fallbackProjectId);

      const nextParams = new URLSearchParams(window.location.search);
      nextParams.set("projectId", fallbackProjectId);
      navigate(`/dependencies?${nextParams.toString()}`, { replace: true });
    }
  }, [navigate, projects, selectedProjectId]);

  const selectedProject = projects.find((project) => String(project.id) === selectedProjectId) || null;

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("projectId", value);
    navigate(`/dependencies?${nextParams.toString()}`, { replace: true });
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageShellLoading />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Dependencies"
        description="Real package management for a selected project"
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedProjectId} onValueChange={handleProjectChange} disabled={projects.length === 0}>
              <SelectTrigger className="w-[260px]" data-testid="select-dependencies-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjectId && (
              <Button
                variant="outline"
                onClick={() => navigate(`/ide/${selectedProjectId}?panel=packages`)}
                data-testid="button-open-packages-in-ide"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open In IDE
              </Button>
            )}
          </div>
        }
      />

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Dependencies unavailable</CardTitle>
            <CardDescription>Project inventory could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {(error as Error).message || "Failed to load projects"}
            </p>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card data-testid="dependencies-empty-projects">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              No projects available
            </CardTitle>
            <CardDescription>Create or import a project before managing dependencies.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden bg-card" data-testid="dependencies-real-panel">
          {selectedProject ? (
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium">{selectedProject.name}</p>
              {selectedProject.description ? (
                <p className="text-xs text-muted-foreground mt-1">{selectedProject.description}</p>
              ) : null}
            </div>
          ) : null}
          <div className="h-[calc(100vh-240px)] min-h-[560px]">
            <ReplitPackagesPanel projectId={selectedProjectId} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
