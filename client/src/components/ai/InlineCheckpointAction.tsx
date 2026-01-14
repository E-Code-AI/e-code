import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Save, Loader2, Check, X } from 'lucide-react';

interface InlineCheckpointActionProps {
  projectId: number | string;
  className?: string;
  onClose?: () => void;
}

export function InlineCheckpointAction({ projectId, className, onClose }: InlineCheckpointActionProps) {
  const [name, setName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/checkpoints`, {
        name: name || `Checkpoint ${new Date().toLocaleTimeString()}`,
      });
      if (!res.ok) throw new Error('Failed to create checkpoint');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'checkpoints'] });
      toast({ title: 'Checkpoint saved' });
      setName('');
      setIsExpanded(false);
      onClose?.();
    },
    onError: () => {
      toast({ title: 'Failed to save', variant: 'destructive' });
    },
  });

  const handleQuickSave = () => {
    if (!isExpanded) {
      createMutation.mutate();
    }
  };

  if (!isExpanded) {
    return (
      <div className={cn("flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30 border border-border/40", className)}>
        <Save className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground flex-1">Save checkpoint</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={handleQuickSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={() => setIsExpanded(true)}
        >
          Name it
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30 border border-border/40", className)}>
      <Save className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <Input
        type="text"
        placeholder="Checkpoint name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-6 text-xs flex-1 bg-transparent border-0 focus-visible:ring-0 px-1"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') createMutation.mutate();
          if (e.key === 'Escape') setIsExpanded(false);
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => createMutation.mutate()}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 text-muted-foreground"
        onClick={() => setIsExpanded(false)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
