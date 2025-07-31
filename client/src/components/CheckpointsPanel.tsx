import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Clock, RotateCcw, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface CheckpointsPanelProps {
  projectId: number;
}

export function CheckpointsPanel({ projectId }: CheckpointsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointDescription, setCheckpointDescription] = useState('');

  // Fetch checkpoints
  const { data: checkpoints, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'checkpoints'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/projects/${projectId}/checkpoints`);
      if (!res.ok) throw new Error('Failed to fetch checkpoints');
      return res.json();
    }
  });

  // Create checkpoint mutation
  const createCheckpointMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/projects/${projectId}/checkpoints`, {
        name: checkpointName || `Checkpoint ${new Date().toISOString()}`,
        description: checkpointDescription
      });
      if (!res.ok) throw new Error('Failed to create checkpoint');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'checkpoints'] });
      toast({
        title: 'Checkpoint created',
        description: 'Your project state has been saved'
      });
      setCheckpointName('');
      setCheckpointDescription('');
    }
  });

  // Restore checkpoint mutation
  const restoreCheckpointMutation = useMutation({
    mutationFn: async (checkpointId: number) => {
      const res = await apiRequest('POST', `/api/checkpoints/${checkpointId}/restore`);
      if (!res.ok) throw new Error('Failed to restore checkpoint');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files'] });
      toast({
        title: 'Checkpoint restored',
        description: 'Your project has been restored to the selected checkpoint'
      });
    }
  });

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Create Checkpoint</h3>
        <input
          type="text"
          placeholder="Checkpoint name (optional)"
          value={checkpointName}
          onChange={(e) => setCheckpointName(e.target.value)}
          className="w-full p-2 mb-2 border rounded"
        />
        <textarea
          placeholder="Description (optional)"
          value={checkpointDescription}
          onChange={(e) => setCheckpointDescription(e.target.value)}
          className="w-full p-2 mb-2 border rounded h-20"
        />
        <Button
          onClick={() => createCheckpointMutation.mutate()}
          disabled={createCheckpointMutation.isPending}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          Create Checkpoint
        </Button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Checkpoint History</h3>
        {isLoading ? (
          <p>Loading checkpoints...</p>
        ) : (
          <div className="space-y-2">
            {checkpoints?.map((checkpoint: any) => (
              <Card key={checkpoint.id} className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{checkpoint.name}</h4>
                    {checkpoint.description && (
                      <p className="text-sm text-muted-foreground">{checkpoint.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {format(new Date(checkpoint.createdAt), 'PPpp')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restoreCheckpointMutation.mutate(checkpoint.id)}
                    disabled={restoreCheckpointMutation.isPending}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}