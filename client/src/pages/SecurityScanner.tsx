import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Shield } from "lucide-react";
import SecurityScannerPanel from "@/components/SecurityScannerPanel";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectOption {
  id: number | string;
  name?: string | null;
}

export default function SecurityScanner() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: projects = [], isLoading } = useQuery<ProjectOption[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  if (isLoading) {
    return <PageShellLoading text="Loading security scanner..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Security Scanner"
        description="Scan the real project workspace for security, privacy, dependency, and malicious code issues."
        icon={Shield}
        actions={(
          <div className="w-full sm:w-[280px]">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger data-testid="select-security-project">
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

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Runtime-backed scanning</AlertTitle>
        <AlertDescription>
          Security static analysis runs on the real project workspace. Semgrep and HoundDog.ai are used when available in the runtime; otherwise the backend falls back to the platform scanner.
        </AlertDescription>
      </Alert>

      {!projects.length ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No projects available</AlertTitle>
          <AlertDescription>Create or open a project to run a real security scan.</AlertDescription>
        </Alert>
      ) : selectedProjectId ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <SecurityScannerPanel projectId={selectedProjectId} onClose={() => undefined} />
        </div>
      ) : null}
    </PageShell>
  );
}
