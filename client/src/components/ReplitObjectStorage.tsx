import { AppStoragePanel } from '@/components/editor/AppStoragePanel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';

interface ReplitObjectStorageProps {
  projectId: number;
  className?: string;
}

export function ReplitObjectStorage({ projectId, className }: ReplitObjectStorageProps) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      <Alert className="m-3 mb-2 flex-shrink-0">
        <Info className="h-4 w-4" />
        <AlertTitle>Project-scoped Object Storage</AlertTitle>
        <AlertDescription>
          Storage is managed per-project using the Replit Object Storage backend. All files
          are scoped to this project's bucket prefix.
        </AlertDescription>
      </Alert>
      <div className="flex-1 overflow-hidden">
        <AppStoragePanel projectId={projectId} className="h-full" />
      </div>
    </div>
  );
}
