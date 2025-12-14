import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CheckpointCardProps {
  checkpointId: number;
  aiSummary?: string;
  filesCount?: number;
  createdAt: string;
  onRestore?: (id: number) => void;
  isRestoring?: boolean;
  type?: 'auto' | 'manual' | 'milestone';
}

export function CheckpointCard({ 
  checkpointId, 
  aiSummary, 
  filesCount, 
  createdAt, 
  onRestore, 
  isRestoring,
  type = 'auto'
}: CheckpointCardProps) {
  const typeLabel = type === 'milestone' ? 'Milestone' : type === 'manual' ? 'Manual' : 'Auto-saved';
  const typeVariant = type === 'milestone' ? 'default' : 'outline';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg border border-border/50 hover:border-primary/30 transition-colors" 
      data-testid={`checkpoint-card-${checkpointId}`}
    >
      <div className="p-2 bg-primary/10 rounded-full shrink-0">
        <History className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Checkpoint #{checkpointId}</span>
          <Badge variant={typeVariant} className="text-xs">{typeLabel}</Badge>
        </div>
        {aiSummary && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{aiSummary}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
          {filesCount !== undefined && filesCount > 0 && (
            <span className="text-xs text-muted-foreground">{filesCount} files</span>
          )}
        </div>
      </div>
      {onRestore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRestore(checkpointId)}
          disabled={isRestoring}
          className="shrink-0"
          data-testid={`restore-checkpoint-${checkpointId}`}
        >
          <RotateCcw className={cn("h-4 w-4 mr-1", isRestoring && "animate-spin")} />
          Restore
        </Button>
      )}
    </motion.div>
  );
}
