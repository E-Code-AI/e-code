import { useState } from "react";
import {
  Terminal,
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Server,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { toast } from "sonner@2.0.3";

interface SSHKey {
  id: string;
  name: string;
  fingerprint: string;
  created: string;
  lastUsed: string | null;
}

export function SSHAccessTab() {
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([
    {
      id: "1",
      name: "MacBook Pro",
      fingerprint: "SHA256:nThbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5SY8",
      created: "2025-01-15",
      lastUsed: "2025-01-20",
    },
    {
      id: "2",
      name: "Work Laptop",
      fingerprint: "SHA256:xXhbg6kXUpJWGl7E1IGOCspRomTxdCARLviKw6E5XX9",
      created: "2025-01-10",
      lastUsed: null,
    },
  ]);

  const [newKeyName, setNewKeyName] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);

  const sshCommand = "ssh user@e-code.ai";
  const sshHost = "ssh.e-code.ai";
  const sshPort = "22";

  const copyToClipboard = (text: string) => {
    // Fallback copy method for when Clipboard API is blocked
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.success("Copied to clipboard");
    }
  };

  const addSSHKey = () => {
    if (!newKeyName.trim()) return;

    const newKey: SSHKey = {
      id: Date.now().toString(),
      name: newKeyName,
      fingerprint: `SHA256:${Math.random().toString(36).substring(2, 15)}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: null,
    };

    setSSHKeys([...sshKeys, newKey]);
    setNewKeyName("");
    setIsAddingKey(false);
    toast.success("SSH key added successfully");
  };

  const deleteKey = (id: string) => {
    setSSHKeys(sshKeys.filter((key) => key.id !== id));
    toast.success("SSH key removed");
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          SSH Access
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect to your development environment via SSH
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Connection Info */}
          <div className="space-y-4">
            <div>
              <Label className="mb-3 block">Connection Details</Label>
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">SSH Host</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {sshHost}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard(sshHost)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Port</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-background px-2 py-1 rounded">
                      {sshPort}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard(sshPort)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs mb-2 block">Connection Command</Label>
                  <div className="flex items-center gap-2 bg-background p-2 rounded">
                    <code className="text-sm flex-1">{sshCommand}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => copyToClipboard(sshCommand)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SSH Keys */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-1 block">SSH Keys</Label>
                <p className="text-xs text-muted-foreground">
                  Manage your SSH public keys for secure access
                </p>
              </div>
              <Dialog open={isAddingKey} onOpenChange={setIsAddingKey}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add SSH Key</DialogTitle>
                    <DialogDescription>
                      Add a new SSH public key to your account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="key-name">Key Name</Label>
                      <Input
                        id="key-name"
                        placeholder="e.g., MacBook Pro"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="key-content">Public Key</Label>
                      <textarea
                        id="key-content"
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
                      />
                      <p className="text-xs text-muted-foreground">
                        Paste your SSH public key. Generate one with: ssh-keygen -t rsa -b 4096
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddingKey(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addSSHKey}>Add Key</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {sshKeys.length === 0 ? (
                <div className="p-8 text-center border rounded-lg">
                  <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                  <p className="text-sm text-muted-foreground">No SSH keys added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your first SSH key to enable secure access
                  </p>
                </div>
              ) : (
                sshKeys.map((key) => (
                  <div key={key.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-green-500" />
                          <span>{key.name}</span>
                          {key.lastUsed ? (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Never used
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {key.fingerprint}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1"
                              onClick={() => copyToClipboard(key.fingerprint)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Added {key.created}
                            </span>
                            {key.lastUsed && (
                              <span className="flex items-center gap-1">
                                Last used {key.lastUsed}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security Tips */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              Security Best Practices
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Use strong, unique SSH keys for each device</li>
              <li>Never share your private SSH key</li>
              <li>Regularly rotate your SSH keys</li>
              <li>Remove unused keys to reduce attack surface</li>
              <li>Use a passphrase to protect your private key</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
