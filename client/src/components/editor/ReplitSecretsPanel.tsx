import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Shield,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Lock,
  Key,
  AlertCircle,
  Check,
  Search,
  RefreshCw,
  Loader2,
  Save,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EnvVar {
  id: string;
  projectId: number;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface EnvVarsResponse {
  variables: EnvVar[];
}

export function ReplitSecretsPanel({ projectId }: { projectId?: string | number }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSecret, setEditingSecret] = useState<EnvVar | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isSecretToggle, setIsSecretToggle] = useState(true);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: envVarsData, isLoading, error, refetch } = useQuery<EnvVarsResponse>({
    queryKey: ['/api/env-vars', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const response = await fetch(`/api/env-vars/${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch environment variables');
      }
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { key: string; value: string; isSecret: boolean }) => {
      if (!projectId) throw new Error('Project ID required');
      const response = await apiRequest('POST', '/api/env-vars', {
        projectId: projectId.toString(),
        key: data.key.toUpperCase().replace(/\s+/g, '_'),
        value: data.value,
        isSecret: data.isSecret
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Environment variable created' });
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
      resetForm();
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create environment variable',
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value, isSecret }: { id: string; value?: string; isSecret?: boolean }) => {
      const response = await apiRequest('PATCH', `/api/env-vars/${id}`, {
        ...(value !== undefined && { value }),
        ...(isSecret !== undefined && { isSecret })
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Environment variable updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
      resetForm();
      setEditingSecret(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update environment variable',
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/env-vars/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Environment variable deleted' });
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete environment variable',
        variant: 'destructive'
      });
    }
  });

  const revealMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/env-vars/${id}/reveal`, {});
      return response.json();
    },
    onSuccess: (data, id) => {
      setRevealedSecrets(prev => ({ ...prev, [id]: data.value }));
      setTimeout(() => {
        setRevealedSecrets(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }, 60000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reveal secret',
        variant: 'destructive'
      });
    }
  });

  const resetForm = useCallback(() => {
    setNewKey('');
    setNewValue('');
    setIsSecretToggle(true);
  }, []);

  const handleCopyValue = useCallback((secret: EnvVar) => {
    const valueToCopy = revealedSecrets[secret.id] || secret.value;
    if (valueToCopy === '********') {
      toast({
        title: 'Cannot copy',
        description: 'Reveal the secret first to copy its value',
        variant: 'destructive'
      });
      return;
    }
    navigator.clipboard.writeText(valueToCopy);
    setCopiedId(secret.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied', description: 'Value copied to clipboard' });
  }, [revealedSecrets, toast]);

  const handleToggleReveal = useCallback((secret: EnvVar) => {
    if (revealedSecrets[secret.id]) {
      setRevealedSecrets(prev => {
        const newState = { ...prev };
        delete newState[secret.id];
        return newState;
      });
    } else if (secret.isSecret) {
      revealMutation.mutate(secret.id);
    }
  }, [revealedSecrets, revealMutation]);

  const variables = envVarsData?.variables || [];
  const filteredVariables = variables.filter(v =>
    v.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4" data-testid="secrets-panel-no-project">
        <Shield className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Select a project to manage secrets</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background" data-testid="secrets-panel">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Secrets</h3>
            <Badge variant="secondary" className="text-xs">
              {variables.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-secrets"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-secret"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search secrets..."
            className="pl-9 text-sm"
            data-testid="input-search-secrets"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <p className="text-sm text-muted-foreground">Failed to load secrets</p>
              <Button variant="link" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : filteredVariables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Key className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No matching secrets' : 'No secrets configured'}
              </p>
              {!searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                >
                  Add your first secret
                </Button>
              )}
            </div>
          ) : (
            filteredVariables.map((secret) => (
              <div
                key={secret.id}
                className="mb-2 p-3 border border-border rounded hover:bg-muted/50"
                data-testid={`secret-item-${secret.key}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {secret.isSecret ? (
                        <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                      ) : (
                        <Key className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-mono font-medium text-sm text-foreground truncate">
                        {secret.key}
                      </span>
                      {secret.isSecret && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 text-amber-500 border-amber-500/30">
                          encrypted
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                        {revealedSecrets[secret.id] || secret.value}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {secret.isSecret && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleToggleReveal(secret)}
                        disabled={revealMutation.isPending}
                        data-testid={`button-reveal-${secret.key}`}
                      >
                        {revealMutation.isPending && revealMutation.variables === secret.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : revealedSecrets[secret.id] ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleCopyValue(secret)}
                      data-testid={`button-copy-${secret.key}`}
                    >
                      {copiedId === secret.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingSecret(secret);
                        setNewKey(secret.key);
                        setNewValue('');
                        setIsSecretToggle(secret.isSecret);
                      }}
                      data-testid={`button-edit-${secret.key}`}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteMutation.mutate(secret.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${secret.key}`}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === secret.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Environment Variable</DialogTitle>
            <DialogDescription>
              Add a new environment variable or secret to your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                placeholder="MY_SECRET_KEY"
                className="font-mono"
                data-testid="input-new-key"
              />
              <p className="text-xs text-muted-foreground">Uppercase with underscores only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter value..."
                type={isSecretToggle ? 'password' : 'text'}
                data-testid="input-new-value"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isSecret">Encrypt as secret</Label>
              <Switch
                id="isSecret"
                checked={isSecretToggle}
                onCheckedChange={setIsSecretToggle}
                data-testid="switch-is-secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate({ key: newKey, value: newValue, isSecret: isSecretToggle })}
              disabled={!newKey || !newValue || createMutation.isPending}
              data-testid="button-save-secret"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-1" /> Save</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSecret} onOpenChange={(open) => { if (!open) { setEditingSecret(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment Variable</DialogTitle>
            <DialogDescription>
              Update the value for {editingSecret?.key}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <div className="font-mono text-sm bg-muted px-3 py-2 rounded">
                {editingSecret?.key}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editValue">New Value</Label>
              <Input
                id="editValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter new value..."
                type={isSecretToggle ? 'password' : 'text'}
                data-testid="input-edit-value"
              />
              <p className="text-xs text-muted-foreground">Leave empty to keep current value</p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="editIsSecret">Encrypt as secret</Label>
              <Switch
                id="editIsSecret"
                checked={isSecretToggle}
                onCheckedChange={setIsSecretToggle}
                data-testid="switch-edit-is-secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingSecret(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingSecret) {
                  updateMutation.mutate({
                    id: editingSecret.id,
                    ...(newValue && { value: newValue }),
                    isSecret: isSecretToggle
                  });
                }
              }}
              disabled={updateMutation.isPending}
              data-testid="button-update-secret"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Updating...</>
              ) : (
                <><Save className="h-4 w-4 mr-1" /> Update</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
