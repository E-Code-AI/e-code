import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HardDrive, Cloud, AlertCircle } from "lucide-react";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppStoragePanel } from "@/components/editor/AppStoragePanel";
import { apiRequest } from "@/lib/queryClient";

interface ProjectOption {
  id: number | string;
  name?: string | null;
}

interface StorageStats {
  totalSizeFormatted: string;
  fileCount: number;
  maxStorageFormatted: string;
  usagePercent: number;
}

interface StoragePayload {
  files: unknown[];
  stats: StorageStats;
}

export default function ObjectStorage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectOption[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => apiRequest<ProjectOption[]>("GET", "/api/projects"),
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  const storageQuery = useQuery<StoragePayload>({
    queryKey: [`/api/projects/${selectedProjectId}/storage`],
    queryFn: async () => apiRequest("GET", `/api/projects/${selectedProjectId}/storage`),
    enabled: !!selectedProjectId,
  });

  if (projectsLoading) {
    return <PageShellLoading text="Loading object storage..." />;
  }

  const stats = storageQuery.data?.stats;

  return (
    <PageShell>
      <PageHeader
        title="Object Storage"
        description="Browse and manage project file storage backed by Replit GCS or S3."
        icon={HardDrive}
        actions={(
          <div className="w-full sm:w-[280px]">
            <Select
              value={selectedProjectId}
              onValueChange={(value) => setSelectedProjectId(value)}
            >
              <SelectTrigger data-testid="select-storage-project">
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
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No projects available</AlertTitle>
          <AlertDescription>Create or open a project to access object storage.</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4 h-full">
          {stats && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Storage Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{stats.totalSizeFormatted}</div>
                  <Progress className="mt-3" value={stats.usagePercent} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    of {stats.maxStorageFormatted}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{stats.fileCount}</div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Objects stored in this project
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Backend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-primary" />
                    <span className="font-medium text-sm">Replit GCS / S3</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Project-scoped; auth-enforced; CSRF-protected
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex-1 min-h-0 rounded-lg border bg-background overflow-hidden">
            {selectedProjectId ? (
              <AppStoragePanel projectId={selectedProjectId} className="h-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <p>Select a project to browse its storage</p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
