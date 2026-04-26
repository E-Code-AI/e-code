import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, Fingerprint, Info, Key, Plus, Shield, Terminal, Trash2, Upload } from "lucide-react";
import { PageHeader, PageShell, PageShellLoading } from "@/components/layout/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SSHKeyRecord {
  id: string;
  label: string;
  fingerprint: string;
  createdAt: string;
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
      toast({ title: "SSH key added", description: "The public key has been stored." });
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
        description="Manage the real user-level SSH keys currently supported by the backend."
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
                <DialogDescription>Store a public key for your account. Private key generation and session tracking are not exposed by the backend today.</DialogDescription>
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
                  <Input
                    id="ssh-public-key"
                    value={newKey.publicKey}
                    onChange={(event) => setNewKey((prev) => ({ ...prev, publicKey: event.target.value }))}
                    placeholder="ssh-ed25519 AAAA..."
                    data-testid="input-ssh-public-key"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddKeyDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => addKeyMutation.mutate()} disabled={!newKey.label.trim() || !newKey.publicKey.trim() || addKeyMutation.isPending}>
                  {addKeyMutation.isPending ? "Adding..." : "Add Key"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Current backend scope</AlertTitle>
        <AlertDescription>
          The mounted SSH backend currently supports listing, adding, and deleting user SSH public keys at <code>/api/ssh-keys</code>. Generated private keys, active SSH sessions, and live connection orchestration are not available on this route yet.
        </AlertDescription>
      </Alert>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Connection pattern</AlertTitle>
        <AlertDescription>
          Add your existing public key here, then use the corresponding private key from your local machine when the SSH endpoint is enabled in the runtime environment.
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
              <p className="mt-1 text-sm text-muted-foreground">Add an existing public key to use this surface in real backend mode.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sshKeys.map((key) => (
                <div key={key.id} className="rounded-lg border p-4" data-testid={`ssh-key-${key.id}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{key.label}</span>
                        <Badge variant="outline">public key</Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Fingerprint className="h-3 w-3" />
                        <span className="truncate font-mono">{key.fingerprint}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Added {new Date(key.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(key.fingerprint, key.label)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteKeyMutation.mutate(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
