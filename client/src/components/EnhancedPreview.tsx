import React, { useState } from 'react';
import { LivePreview } from './LivePreview';
import { PreviewDevTools } from './PreviewDevTools';
import { Button } from '@/components/ui/button';
import { Code2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedPreviewProps {
  projectId: number;
}

export const EnhancedPreview: React.FC<EnhancedPreviewProps> = ({ projectId }) => {
  const [showDevTools, setShowDevTools] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  return (
    <div className="flex flex-col h-full">
      {/* Preview with dev tools toggle */}
      <div className={cn(
        "flex-1",
        showDevTools ? "h-[60%]" : "h-full"
      )}>
        <div className="relative h-full">
          <LivePreview 
            projectId={projectId} 
            onPreviewReady={(url) => setPreviewUrl(url)}
          />
          
          {/* Dev Tools Toggle Button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 shadow-lg"
            onClick={() => setShowDevTools(!showDevTools)}
          >
            {showDevTools ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Close DevTools
              </>
            ) : (
              <>
                <Code2 className="h-4 w-4 mr-2" />
                Open DevTools
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Developer Tools Panel */}
      {showDevTools && (
        <div className="h-[40%] border-t">
          <PreviewDevTools 
            previewUrl={previewUrl || `/preview/${projectId}/`}
            isOpen={showDevTools}
            onClose={() => setShowDevTools(false)}
          />
        </div>
      )}
    </div>
  );
};