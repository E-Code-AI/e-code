import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineFallback() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="text-center p-8 max-w-md">
        <WifiOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-2xl font-semibold mb-2">You're offline</h2>
        <p className="text-muted-foreground mb-6">
          Your changes are saved locally and will sync when you're back online.
        </p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          aria-label="Retry connection"
        >
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
          Retry
        </Button>
      </div>
    </div>
  );
}
