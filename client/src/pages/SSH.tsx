import { PageHeader,PageShell,PageShellLoading } from "@/components/layout/PageShell";
import { Alert,AlertDescription,AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent,CardHeader,CardTitle } from "@/components/ui/card";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
DialogTrigger,
} from "@/components/ui/dialog";
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest,queryClient } from "@/lib/queryClient";
import { useMutation,useQuery } from "@tanstack/react-query";
import { Copy,Fingerprint,Info,Key,Plus,Shield,Terminal,Trash2 } from "lucide-react";
import { useState } from "react";

interface SSHKeyRecord {
  id: string;
  label: string;
  fingerprint: string;
  keyType: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function SSH() {
  const { toast } = useToast();
  const [addKeyDialogOpen, setAddKeyDialogOpen] = useState(false);
  const [newKey, setNewKey] = useState({
    label: "",
    publicKey: "",
  });

  const { data: sshKeys = [], isLoading } = useQuery<SSHKeyRecord[]>({
    queryKey: ["/api/ssh-keys"],
  });

  const addKeyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/ssh-keys", newKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ssh-keys"] });
      setAddKeyDialogOpen(false);
      setNewKey({ label: "", publicKey: "" });
      toast({ title: "SSH key added", description: "Your public key has been stored." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add SSH key", description: error.message, variant: "destructive" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      return apiRequest("DELETE", `/api/ssh-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ssh-keys"] });
      toast({ title: "SSH key deleted", description: "The key has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete SSH key", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard.` });
    } catch (error: any) {
      toast({ title: "Copy failed", description: error.message || "Could not copy text.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <PageShellLoading text="Loading SSH keys..." />;
  }

  return (
    <PageShell>
      <PageHeader
        title="SSH Access"
        description="Manage SSH public keys for secure remote access to your workspace."
        icon={Terminal}
        actions={(
          <Dialog open={addKeyDialogOpen} onOpenChange={setAddKeyDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-ssh-key">
                <Plus className="mr-2 h-4 w-4" />
                Add Public Key
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-add-ssh-key">
              <DialogHeader>
                <DialogTitle>Add SSH Public Key</DialogTitle>
                <DialogDescription>
                  Paste your existing public key (e.g. from <code>~/.ssh/id_ed25519.pub</code>).
                  Supported types: ed25519, rsa (≥2048 bit), ecdsa.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ssh-label">Label</Label>
                  <Input
                    id="ssh-label"
                    value={newKey.label}
                    onChange={(event) => setNewKey((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="Work laptop"
                    data-testid="input-ssh-key-label"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ssh-public-key">Public Key</Label>
                  <Textarea
                    id="ssh-public-key"
                    value={newKey.publicKey}
                    onChange={(event) => setNewKey((prev) => ({ ...prev, publicKey: event.target.value }))}
                    placeholder="ssh-ed25519 AAAA..."
                    className="font-mono text-sm resize-none h-24"
                    data-testid="input-ssh-public-key"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddKeyDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => addKeyMutation.mutate(undefined)}
                  disabled={!newKey.label.trim() || !newKey.publicKey.trim() || addKeyMutation.isPending}
                >
                  {addKeyMutation.isPending ? "Adding..." : "Add Key"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>How SSH access works</AlertTitle>
        <AlertDescription>
          Add your existing SSH public key here. Use the matching private key from your local machine
          to connect when the SSH gateway is enabled in the runtime environment.
        </AlertDescription>
      </Alert>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Key requirements</AlertTitle>
        <AlertDescription>
          Supported key types: <strong>ed25519</strong> (recommended), <strong>rsa</strong> (≥2048 bit), <strong>ecdsa</strong>.
          Each key must be unique per account. You may store up to 20 keys.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Your SSH Keys</CardTitle>
            <Badge variant="secondary">{sshKeys.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!sshKeys.length ? (
            <div className="py-10 text-center">
              <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No SSH keys stored</p>
              <p className="mt-1 text-sm text-muted-foreground">Add a public key to enable SSH access to your workspace.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sshKeys.map((key) => (
                <div key={key.id} className="rounded-lg border p-4" data-testid={`ssh-key-${key.id}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{key.label}</span>
                        <Badge variant="outline">{key.keyType}</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Fingerprint className="h-3 w-3 shrink-0" />
                        <span className="truncate font-mono" data-testid={`ssh-key-fingerprint-${key.id}`}>{key.fingerprint}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Added {new Date(key.createdAt).toLocaleString()}
                        {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.fingerprint, key.label)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            disabled={deleteKeyMutation.isPending}
                            data-testid={`button-delete-ssh-key-${key.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent data-testid={`dialog-confirm-delete-ssh-key-${key.id}`}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete SSH key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently revoke "{key.label}". Anyone using the matching private key will lose SSH access. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`button-cancel-delete-ssh-key-${key.id}`}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteKeyMutation.mutate(key.id)}
                              data-testid={`button-confirm-delete-ssh-key-${key.id}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
