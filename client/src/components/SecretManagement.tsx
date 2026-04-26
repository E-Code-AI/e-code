import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Key, Lock, Plus, Search, Shield, Trash2 } from "lucide-react";
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

interface SecretManagementProps {
  projectId: string;
}

export function SecretManagement({ projectId }: SecretManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteSecretId, setDeleteSecretId] = useState<string | null>(null);
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [newSecret, setNewSecret] = useState({
    key: "",
    value: "",
    environment: "development" as "development" | "staging" | "production",
  });

  const secretsQuery = useQuery<SecretsResponse>({
    queryKey: ["/api/projects", projectId, "secrets"],
    queryFn: async () => {
      return apiRequest("GET", `/api/projects/${projectId}/secrets`);
    },
    enabled: !!projectId,
  });

  const createSecretMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/secrets`, {
        key: newSecret.key,
        value: newSecret.value,
        environment: newSecret.environment,
        isSecret: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "secrets"] });
      setCreateDialogOpen(false);
      setNewSecret({ key: "", value: "", environment: "development" });
      toast({ title: "Secret created", description: "The project secret has been stored." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create secret", description: error.message, variant: "destructive" });
    },
  });

  const deleteSecretMutation = useMutation({
    mutationFn: async (secretId: string) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/secrets/${secretId}`);
    },
    onSuccess: (_, secretId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "secrets"] });
      setDeleteSecretId(null);
      setRevealedValues((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      setShowValues((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      toast({ title: "Secret deleted", description: "The project secret has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete secret", description: error.message, variant: "destructive" });
    },
  });

  const revealSecretMutation = useMutation({
    mutationFn: async (secretId: string) => {
      return apiRequest<{ value: string }>("POST", `/api/projects/${projectId}/secrets/${secretId}/reveal`);
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
  const filteredSecrets = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return secrets.filter((secret) => secret.key.toLowerCase().includes(q));
  }, [searchTerm, secrets]);

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

  if (secretsQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading project secrets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Project Secrets</h1>
          <p className="text-sm text-muted-foreground">Manage encrypted environment variables for project {projectId}.</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-project-secret">
          <Plus className="mr-2 h-4 w-4" />
          New Secret
        </Button>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Real backend storage</AlertTitle>
        <AlertDescription>
          Secrets on this page are read and written through the project-scoped secrets API. Values stay masked until you explicitly reveal them.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search secrets..." className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Secrets</CardTitle>
            <Badge variant="secondary">{filteredSecrets.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredSecrets.length ? (
            <div className="py-10 text-center">
              <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No secrets found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? "No secrets match the current search." : "Create the first secret for this project."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSecrets.map((secret) => {
                const visibleValue = showValues[secret.id] ? revealedValues[secret.id] || secret.value : "********";
                return (
                  <div key={secret.id} className="rounded-lg border p-4" data-testid={`project-secret-${secret.id}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="break-all text-sm font-semibold">{secret.key}</code>
                          <Badge variant="outline">{secret.environment}</Badge>
                          <Badge variant="secondary">
                            <Lock className="mr-1 h-3 w-3" />
                            secret
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Last updated {new Date(secret.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleToggleSecret(secret)}>
                          {showValues[secret.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleCopySecret(secret)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteSecretId(secret.id)}>
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project Secret</DialogTitle>
            <DialogDescription>Add a real encrypted environment variable for this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="project-secret-key">Key</Label>
              <Input
                id="project-secret-key"
                value={newSecret.key}
                onChange={(event) => setNewSecret((prev) => ({ ...prev, key: event.target.value.toUpperCase() }))}
                placeholder="API_KEY"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-secret-value">Value</Label>
              <Input
                id="project-secret-value"
                type="password"
                value={newSecret.value}
                onChange={(event) => setNewSecret((prev) => ({ ...prev, value: event.target.value }))}
                placeholder="secret value"
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={newSecret.environment} onValueChange={(value: "development" | "staging" | "production") => setNewSecret((prev) => ({ ...prev, environment: value }))}>
                <SelectTrigger>
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
            <Button onClick={() => createSecretMutation.mutate()} disabled={!newSecret.key.trim() || !newSecret.value.trim() || createSecretMutation.isPending}>
              {createSecretMutation.isPending ? "Creating..." : "Create Secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteSecretId} onOpenChange={(open) => !open && setDeleteSecretId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription>This removes the secret from the project.</AlertDialogDescription>
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
    </div>
  );
}
