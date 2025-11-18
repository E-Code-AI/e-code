import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  Key,
  Check,
  Search,
  Loader2
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

interface EnvVariable {
  id: string;
  projectId: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Secret extends EnvVariable {
  isRevealed?: boolean;
}

interface MobileSecretsPanelProps {
  projectId: string;
  className?: string;
}

export function MobileSecretsPanel({ projectId, className }: MobileSecretsPanelProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());

  // Fetch secrets
  const { data, isLoading, error } = useQuery<{ variables: EnvVariable[] }>({
    queryKey: ['/api/env-vars', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/env-vars/${projectId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch secrets');
      return response.json();
    },
    enabled: !!projectId
  });

  const secrets: Secret[] = (data?.variables || []).map(v => ({
    ...v,
    isRevealed: revealedSecrets.has(v.id)
  }));

  const filteredSecrets = secrets.filter(secret =>
    secret.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  // Create secret mutation
  const createMutation = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      return apiRequest('POST', '/api/env-vars', {
        projectId,
        key: data.key.toUpperCase().replace(/\s+/g, '_'),
        value: data.value,
        isSecret: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
      toast({ title: 'Secret added successfully' });
      setNewSecretKey('');
      setNewSecretValue('');
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to add secret', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Update secret mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; value: string }) => {
      return apiRequest('PATCH', `/api/env-vars/${data.id}`, {
        value: data.value
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
      toast({ title: 'Secret updated successfully' });
      setEditingSecret(null);
      setNewSecretKey('');
      setNewSecretValue('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update secret', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete secret mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/env-vars/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
      toast({ title: 'Secret deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete secret', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Reveal secret mutation
  const revealMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<{ value: string }>('POST', `/api/env-vars/${id}/reveal`, {});
    },
    onSuccess: (data, id) => {
      // Update the specific secret's value in cache
      queryClient.setQueryData<{ variables: EnvVariable[] }>(
        ['/api/env-vars', projectId],
        (old) => {
          if (!old) return old;
          return {
            variables: old.variables.map(v => 
              v.id === id ? { ...v, value: data.value } : v
            )
          };
        }
      );
      setRevealedSecrets(prev => new Set(prev).add(id));
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to reveal secret', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleToggleReveal = (secret: Secret) => {
    if (secret.isRevealed) {
      // Hide secret - remove from revealed set and refetch to get masked value
      setRevealedSecrets(prev => {
        const newSet = new Set(prev);
        newSet.delete(secret.id);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['/api/env-vars', projectId] });
    } else {
      // Reveal secret
      revealMutation.mutate(secret.id);
    }
  };

  const handleAddSecret = () => {
    if (newSecretKey && newSecretValue) {
      createMutation.mutate({ key: newSecretKey, value: newSecretValue });
    }
  };

  const handleUpdateSecret = () => {
    if (editingSecret && newSecretValue) {
      updateMutation.mutate({ id: editingSecret.id, value: newSecretValue });
    }
  };

  const handleDeleteSecret = (secretId: string) => {
    if (confirm('Are you sure you want to delete this secret?')) {
      deleteMutation.mutate(secretId);
    }
  };

  const handleCopyValue = (secret: Secret) => {
    navigator.clipboard.writeText(secret.value);
    setCopiedId(secret.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold" data-testid="header-secrets">Secrets</h3>
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-secret-count">
            {secrets.length} secrets
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search secrets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-secrets"
          />
        </div>
      </div>

      {/* Secrets List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-border rounded-lg p-3 bg-card">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </>
          )}

          {error && (
            <div className="text-center py-12 text-destructive">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Failed to load secrets</p>
              <p className="text-xs mt-1">{(error as Error).message}</p>
            </div>
          )}

          {!isLoading && !error && filteredSecrets.map((secret) => (
            <div 
              key={secret.id}
              className="border border-border rounded-lg p-3 bg-card"
              data-testid={`secret-${secret.key}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-medium">{secret.key}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleReveal(secret)}
                    disabled={revealMutation.isPending}
                    data-testid={`button-toggle-${secret.key}`}
                  >
                    {revealMutation.isPending && !secret.isRevealed ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : secret.isRevealed ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
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
                      setNewSecretKey(secret.key);
                      setNewSecretValue(secret.value);
                    }}
                    data-testid={`button-edit-${secret.key}`}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDeleteSecret(secret.id)}
                    data-testid={`button-delete-${secret.key}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              
              <div className="font-mono text-xs p-2 bg-muted/50 rounded border border-border overflow-x-auto">
                {secret.isRevealed ? secret.value : '•'.repeat(32)}
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                Modified {formatDate(secret.updatedAt)}
              </div>
            </div>
          ))}

          {!isLoading && !error && filteredSecrets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No secrets found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Button */}
      <div className="p-4 border-t border-border bg-card">
        <Button 
          className="w-full"
          onClick={() => setShowAddDialog(true)}
          data-testid="button-add-secret"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Secret
        </Button>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={showAddDialog || !!editingSecret} 
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingSecret(null);
            setNewSecretKey('');
            setNewSecretValue('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingSecret ? 'Edit' : 'Add'} Secret</DialogTitle>
            <DialogDescription>
              {editingSecret ? 'Update' : 'Create'} an environment variable for your project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Key</label>
              <Input
                placeholder="DATABASE_URL"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
                className="font-mono"
                disabled={!!editingSecret}
                data-testid="input-secret-key"
              />
              {!!editingSecret && (
                <p className="text-xs text-muted-foreground">Key cannot be changed</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Value</label>
              <Input
                type="password"
                placeholder="your-secret-value"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
                className="font-mono"
                data-testid="input-secret-value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingSecret(null);
                setNewSecretKey('');
                setNewSecretValue('');
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={editingSecret ? handleUpdateSecret : handleAddSecret}
              disabled={
                (!newSecretKey || !newSecretValue) ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              data-testid="button-save-secret"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingSecret ? 'Update' : 'Add'} Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
