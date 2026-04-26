import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Key, Lock, Plus, Search, Shield, Trash2 } from "lucide-react";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProjectOption {
  id: number | string;
  name?: string | null;
}

interface SecretRecord {
  id: string;
  key: string;
  value: string;
  environment: "development" | "staging" | "production";
  isSecret: boolean;
  updatedAt: string;
}

interface SecretsResponse {
  secrets: SecretRecord[];
}

export default function Secrets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteSecretId, setDeleteSecretId] = useState<string | null>(null);
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [newSecret, setNewSecret] = useState({
    key: "",
    value: "",
    environment: "development" as "development" | "staging" | "production",
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectOption[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      return apiRequest<ProjectOption[]>("GET", "/api/projects");
    },
  });

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(String(projects[0].id));
    }
  }, [projects, selectedProjectId]);

  const secretsQuery = useQuery<SecretsResponse>({
    queryKey: ["/api/projects", selectedProjectId, "secrets"],
    queryFn: async () => {
      return apiRequest("GET", `/api/projects/${selectedProjectId}/secrets`);
    },
    enabled: !!selectedProjectId,
  });

  const createSecretMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${selectedProjectId}/secrets`, {
        key: newSecret.key,
        value: newSecret.value,
        environment: newSecret.environment,
        isSecret: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "secrets"] });
      setCreateDialogOpen(false);
      setNewSecret({ key: "", value: "", environment: "development" });
      toast({ title: "Secret created", description: "The secret has been stored for this project." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create secret", description: error.message, variant: "destructive" });
    },
  });

  const deleteSecretMutation = useMutation({
    mutationFn: async (secretId: string) => {
      return apiRequest("DELETE", `/api/projects/${selectedProjectId}/secrets/${secretId}`);
    },
    onSuccess: (_, secretId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "secrets"] });
      setDeleteSecretId(null);
      setShowValues((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      toast({ title: "Secret deleted", description: "The secret has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete secret", description: error.message, variant: "destructive" });
    },
  });

  const revealSecretMutation = useMutation({
    mutationFn: async (secretId: string) => {
      return apiRequest<{ value: string }>("POST", `/api/projects/${selectedProjectId}/secrets/${secretId}/reveal`);
    },
    onSuccess: (data, secretId) => {
      setRevealedValues((prev) => ({ ...prev, [secretId]: data.value }));
      setShowValues((prev) => ({ ...prev, [secretId]: true }));
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reveal secret", description: error.message, variant: "destructive" });
    },
  });

  const secrets = secretsQuery.data?.secrets || [];
  const filteredSecrets = useMemo(
    () => secrets.filter((secret) => secret.key.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, secrets]
  );

  const handleToggleSecret = async (secret: SecretRecord) => {
    if (showValues[secret.id]) {
      setShowValues((prev) => ({ ...prev, [secret.id]: false }));
      return;
    }

    if (!revealedValues[secret.id]) {
      await revealSecretMutation.mutateAsync(secret.id);
      return;
    }

    setShowValues((prev) => ({ ...prev, [secret.id]: true }));
  };

  const handleCopySecret = async (secret: SecretRecord) => {
    try {
      let value = revealedValues[secret.id];
      if (!value) {
        const data = await revealSecretMutation.mutateAsync(secret.id);
        value = data.value;
      }
      await navigator.clipboard.writeText(value);
      toast({ title: "Copied", description: `${secret.key} copied to clipboard.` });
    } catch (error: any) {
      toast({ title: "Copy failed", description: error.message || "Could not copy secret.", variant: "destructive" });
    }
  };

  if (projectsLoading || secretsQuery.isLoading) {
    return <PageShellLoading text="Loading secrets..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Secrets"
        description="Project-scoped encrypted environment variables backed by the real backend."
        icon={Lock}
        actions={(
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="w-full sm:w-[280px]">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger data-testid="select-secrets-project">
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
            <Button onClick={() => setCreateDialogOpen(true)} disabled={!selectedProjectId} data-testid="button-new-secret">
              <Plus className="mr-2 h-4 w-4" />
              New Secret
            </Button>
          </div>
        )}
      />

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Encrypted project secrets</AlertTitle>
        <AlertDescription>
          Secrets are stored per project. Values stay masked by default and are only revealed on demand through the backend.
        </AlertDescription>
      </Alert>

      {!projects.length ? (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertTitle>No projects available</AlertTitle>
          <AlertDescription>Create or open a project to manage its secrets.</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card data-testid="card-search-secrets">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search secrets..."
                  className="pl-9"
                  data-testid="input-search-secrets"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-secrets-list">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Project Secrets</CardTitle>
                <Badge variant="secondary">{filteredSecrets.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {!filteredSecrets.length ? (
                <div className="py-10 text-center">
                  <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">No secrets found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {searchQuery ? "No secrets match the current search." : "Create the first secret for this project."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSecrets.map((secret) => {
                    const visibleValue = showValues[secret.id] ? revealedValues[secret.id] || secret.value : "********";
                    return (
                      <div key={secret.id} className="rounded-lg border p-4" data-testid={`secret-item-${secret.id}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <code className="break-all text-sm font-semibold">{secret.key}</code>
                              <Badge variant="outline">{secret.environment}</Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Last updated {new Date(secret.updatedAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleToggleSecret(secret)} data-testid={`button-toggle-secret-${secret.id}`}>
                              {showValues[secret.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleCopySecret(secret)} data-testid={`button-copy-secret-${secret.id}`}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteSecretId(secret.id)} data-testid={`button-delete-secret-${secret.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Input readOnly value={visibleValue} type={showValues[secret.id] ? "text" : "password"} className="mt-3 font-mono text-sm" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-secret">
          <DialogHeader>
            <DialogTitle>Create Secret</DialogTitle>
            <DialogDescription>Add a real encrypted environment variable to the selected project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="secret-key">Key</Label>
              <Input
                id="secret-key"
                value={newSecret.key}
                onChange={(event) => setNewSecret((prev) => ({ ...prev, key: event.target.value.toUpperCase() }))}
                placeholder="API_KEY"
                data-testid="input-secret-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret-value">Value</Label>
              <Input
                id="secret-value"
                type="password"
                value={newSecret.value}
                onChange={(event) => setNewSecret((prev) => ({ ...prev, value: event.target.value }))}
                placeholder="secret value"
                data-testid="input-secret-value"
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={newSecret.environment} onValueChange={(value: "development" | "staging" | "production") => setNewSecret((prev) => ({ ...prev, environment: value }))}>
                <SelectTrigger data-testid="select-secret-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">development</SelectItem>
                  <SelectItem value="staging">staging</SelectItem>
                  <SelectItem value="production">production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createSecretMutation.mutate(undefined)}
              disabled={!selectedProjectId || !newSecret.key.trim() || !newSecret.value.trim() || createSecretMutation.isPending}
              data-testid="button-confirm-create-secret"
            >
              {createSecretMutation.isPending ? "Creating..." : "Create Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSecretId} onOpenChange={(open) => !open && setDeleteSecretId(null)}>
        <AlertDialogContent data-testid="dialog-delete-secret">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription>This removes the secret from the selected project.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteSecretId && deleteSecretMutation.mutate(deleteSecretId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
