import React from 'react';
import { Card } from '@/components/ui/card';

interface WebPreviewProps {
  projectId: number;
  isRunning?: boolean;
  className?: string;
}

export function WebPreview({ projectId, isRunning = false, className = '' }: WebPreviewProps) {
  // Always show "Cannot GET" message
  return (
    <Card className={`flex items-center justify-center h-full ${className}`}>
      <div className="text-center space-y-4 p-8">
        <div className="font-mono text-sm text-muted-foreground bg-muted p-4 rounded">
          Cannot GET /
        </div>
        <p className="text-xs text-muted-foreground">
          Preview not available
        </p>
      </div>
    </Card>
  );
}