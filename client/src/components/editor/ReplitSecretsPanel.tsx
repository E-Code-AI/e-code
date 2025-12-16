import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { LazyMotionDiv } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <LazyMotionDiv
      className={cn("rounded-lg bg-gray-200 dark:bg-[#242b3d]", className)}
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
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
      <div 
        className="h-full flex flex-col items-center justify-center p-3 bg-gray-50 dark:bg-[#0e1525]" 
        data-testid="secrets-panel-no-project"
      >
        <Lock className="w-[48px] h-[48px] mb-4 text-gray-400 dark:text-[#5c6670] opacity-40" />
        <p className="text-[15px] leading-[20px] text-gray-600 dark:text-[#9da2a6]">
          Select a project to manage secrets
        </p>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-gray-50 dark:bg-[#0e1525]" 
      data-testid="secrets-panel"
    >
      <div className="p-3 min-h-[48px] border-b border-gray-200 dark:border-[#3d4452]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-[18px] h-[18px] text-gray-500 dark:text-[#9da2a6]" />
            <h3 className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white">
              Secrets
            </h3>
            <Badge 
              className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-gray-200 dark:bg-[#242b3d] text-gray-600 dark:text-[#9da2a6] border-none"
            >
              {variables.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              className="h-8 w-8 rounded-lg p-0 text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#242b3d]"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-secrets"
            >
              <RefreshCw className={cn("w-[18px] h-[18px]", isLoading && "animate-spin")} />
            </Button>
            <Button
              className="h-8 rounded-lg px-3 text-[13px] bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-secret"
            >
              <Plus className="w-[18px] h-[18px] mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400 dark:text-[#5c6670]" 
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search secrets..."
            className="pl-10 h-8 rounded-lg text-[13px] border bg-white dark:bg-[#1c2333] border-gray-300 dark:border-[#3d4452] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-[#5c6670]"
            data-testid="input-search-secrets"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <ShimmerSkeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-[48px] h-[48px] mb-3 text-red-500 opacity-40" />
              <p className="text-[15px] leading-[20px] text-gray-600 dark:text-[#9da2a6]">
                Failed to load secrets
              </p>
              <Button 
                variant="link" 
                className="text-[13px] mt-2 text-blue-600 dark:text-[#0079f2]"
                onClick={() => refetch()}
              >
                Try again
              </Button>
            </div>
          ) : filteredVariables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock 
                className="w-[48px] h-[48px] mb-4 text-gray-400 dark:text-[#5c6670] opacity-40" 
              />
              <h4 className="text-[17px] font-medium leading-tight mb-2 text-gray-900 dark:text-white">
                {searchQuery ? 'No matching secrets' : 'No secrets configured'}
              </h4>
              <p className="text-[13px] mb-4 text-gray-600 dark:text-[#9da2a6]">
                {searchQuery 
                  ? 'Try adjusting your search query' 
                  : 'Store sensitive data like API keys and tokens securely'}
              </p>
              {!searchQuery && (
                <Button
                  className="h-8 rounded-lg px-4 text-[13px] bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="w-[18px] h-[18px] mr-1" />
                  Add your first secret
                </Button>
              )}
            </div>
          ) : (
            filteredVariables.map((secret) => (
              <div
                key={secret.id}
                className="mb-2 p-3 rounded-lg transition-colors bg-white dark:bg-[#1c2333] border border-gray-200 dark:border-[#3d4452]"
                data-testid={`secret-item-${secret.key}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {secret.isSecret ? (
                        <Lock className="w-[18px] h-[18px] shrink-0 text-amber-500" />
                      ) : (
                        <Key className="w-[18px] h-[18px] shrink-0 text-gray-500 dark:text-[#9da2a6]" />
                      )}
                      <span 
                        className="font-mono text-[15px] leading-[20px] font-medium truncate text-gray-900 dark:text-white"
                      >
                        {secret.key}
                      </span>
                      {secret.isSecret && (
                        <Badge 
                          className="text-[11px] uppercase tracking-wider px-1.5 py-0 rounded bg-transparent text-amber-500 border border-amber-500"
                        >
                          encrypted
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code 
                        className="text-[13px] font-mono px-2 py-1 rounded max-w-[200px] truncate bg-gray-100 dark:bg-[#242b3d] text-gray-600 dark:text-[#9da2a6]"
                      >
                        {revealedSecrets[secret.id] || secret.value}
                      </code>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {secret.isSecret && (
                      <Button
                        variant="ghost"
                        className="h-8 w-8 rounded-lg p-0 text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#242b3d]"
                        onClick={() => handleToggleReveal(secret)}
                        disabled={revealMutation.isPending}
                        data-testid={`button-reveal-${secret.key}`}
                      >
                        {revealMutation.isPending && revealMutation.variables === secret.id ? (
                          <Loader2 className="w-[18px] h-[18px] animate-spin" />
                        ) : revealedSecrets[secret.id] ? (
                          <EyeOff className="w-[18px] h-[18px]" />
                        ) : (
                          <Eye className="w-[18px] h-[18px]" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="h-8 w-8 rounded-lg p-0 text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#242b3d]"
                      onClick={() => handleCopyValue(secret)}
                      data-testid={`button-copy-${secret.key}`}
                    >
                      {copiedId === secret.id ? (
                        <Check className="w-[18px] h-[18px] text-green-500" />
                      ) : (
                        <Copy className="w-[18px] h-[18px]" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 rounded-lg p-0 text-gray-500 dark:text-[#9da2a6] hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#242b3d]"
                      onClick={() => {
                        setEditingSecret(secret);
                        setNewKey(secret.key);
                        setNewValue('');
                        setIsSecretToggle(secret.isSecret);
                      }}
                      data-testid={`button-edit-${secret.key}`}
                    >
                      <Edit className="w-[18px] h-[18px]" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 rounded-lg p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => deleteMutation.mutate(secret.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${secret.key}`}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === secret.id ? (
                        <Loader2 className="w-[18px] h-[18px] animate-spin" />
                      ) : (
                        <Trash2 className="w-[18px] h-[18px]" />
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
        <DialogContent className="bg-white dark:bg-[#1c2333] border-gray-200 dark:border-[#3d4452]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white">
              Add Environment Variable
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[20px] text-gray-600 dark:text-[#9da2a6]">
              Add a new environment variable or secret to your project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-[#9da2a6]">
                Key
              </Label>
              <Input
                id="key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                placeholder="MY_SECRET_KEY"
                className="font-mono h-8 rounded-lg text-[15px] border bg-gray-100 dark:bg-[#242b3d] border-gray-300 dark:border-[#3d4452] text-gray-900 dark:text-white"
                data-testid="input-new-key"
              />
              <p className="text-[13px] text-gray-500 dark:text-[#5c6670]">
                Uppercase with underscores only
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-[#9da2a6]">
                Value
              </Label>
              <Input
                id="value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter value..."
                type={isSecretToggle ? 'password' : 'text'}
                className="h-8 rounded-lg text-[15px] border bg-gray-100 dark:bg-[#242b3d] border-gray-300 dark:border-[#3d4452] text-gray-900 dark:text-white"
                data-testid="input-new-value"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-[15px] leading-[20px] text-gray-900 dark:text-white">
                Encrypt as secret
              </Label>
              <Switch
                id="isSecret"
                checked={isSecretToggle}
                onCheckedChange={setIsSecretToggle}
                data-testid="switch-is-secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="h-8 rounded-lg text-[13px] border border-gray-300 dark:border-[#3d4452] text-gray-600 dark:text-[#9da2a6] bg-transparent hover:bg-gray-100 dark:hover:bg-[#242b3d]"
              onClick={() => { setShowAddDialog(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="h-8 rounded-lg text-[13px] bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => createMutation.mutate({ key: newKey, value: newValue, isSecret: isSecretToggle })}
              disabled={!newKey || !newValue || createMutation.isPending}
              data-testid="button-save-secret"
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-[18px] h-[18px] mr-1 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-[18px] h-[18px] mr-1" /> Save</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSecret} onOpenChange={(open) => { if (!open) { setEditingSecret(null); resetForm(); } }}>
        <DialogContent className="bg-white dark:bg-[#1c2333] border-gray-200 dark:border-[#3d4452]">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-medium leading-tight text-gray-900 dark:text-white">
              Edit Environment Variable
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-[20px] text-gray-600 dark:text-[#9da2a6]">
              Update the value for {editingSecret?.key}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-[#9da2a6]">
                Key
              </Label>
              <div 
                className="font-mono text-[15px] leading-[20px] px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#242b3d] text-gray-900 dark:text-white"
              >
                {editingSecret?.key}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-gray-600 dark:text-[#9da2a6]">
                New Value
              </Label>
              <Input
                id="editValue"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Enter new value..."
                type={isSecretToggle ? 'password' : 'text'}
                className="h-8 rounded-lg text-[15px] border bg-gray-100 dark:bg-[#242b3d] border-gray-300 dark:border-[#3d4452] text-gray-900 dark:text-white"
                data-testid="input-edit-value"
              />
              <p className="text-[13px] text-gray-500 dark:text-[#5c6670]">
                Leave empty to keep current value
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-[15px] leading-[20px] text-gray-900 dark:text-white">
                Encrypt as secret
              </Label>
              <Switch
                id="editIsSecret"
                checked={isSecretToggle}
                onCheckedChange={setIsSecretToggle}
                data-testid="switch-edit-is-secret"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="h-8 rounded-lg text-[13px] border border-gray-300 dark:border-[#3d4452] text-gray-600 dark:text-[#9da2a6] bg-transparent hover:bg-gray-100 dark:hover:bg-[#242b3d]"
              onClick={() => { setEditingSecret(null); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              className="h-8 rounded-lg text-[13px] bg-blue-600 hover:bg-blue-700 text-white"
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
                <><Loader2 className="w-[18px] h-[18px] mr-1 animate-spin" /> Updating...</>
              ) : (
                <><Save className="w-[18px] h-[18px] mr-1" /> Update</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
