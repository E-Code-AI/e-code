import { Suspense, useState } from 'react';
import { useLocation } from 'wouter';
import { ReplitHeader } from '@/components/layout/ReplitHeader';
import { ResponsiveShell } from '@/components/shell';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Loader2 } from 'lucide-react';

const ShellLoadingFallback = () => (
  <div className="flex-1 bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading terminal...</p>
    </div>
  </div>
);

function ShellContent() {
  const [, setLocation] = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const handleBack = () => {
    setLocation('/dashboard');
  };

  const handleClose = () => {
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <ReplitHeader />}
      
      <div className="flex-1 flex flex-col">
        <ResponsiveShell 
          projectId={1}
          onBack={handleBack}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}

export default function Shell() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col">
        <ReplitHeader />
        <ShellLoadingFallback />
      </div>
    }>
      <ShellContent />
    </Suspense>
  );
}
