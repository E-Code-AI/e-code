import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, X, RefreshCw } from 'lucide-react';
import { pwaManager } from '@/lib/pwa';

export function PWAInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if PWA can be installed
    setCanInstall(pwaManager.canInstall());
    
    // Listen for PWA events
    const handleInstallable = () => {
      setCanInstall(true);
      setShowPrompt(true);
    };

    const handleInstalled = () => {
      setCanInstall(false);
      setShowPrompt(false);
      setIsInstalling(false);
    };

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-updateAvailable', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-updateAvailable', handleUpdateAvailable);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const success = await pwaManager.installPWA();
    if (!success) {
      setIsInstalling(false);
    }
  };

  const handleUpdate = async () => {
    await pwaManager.updateServiceWorker();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (updateAvailable) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 z-50 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            Update Available
          </CardTitle>
          <CardDescription>
            A new version of E-Code is ready. Update now for the latest features.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpdate} className="flex-1">
              Update Now
            </Button>
            <Button size="sm" variant="outline" onClick={() => setUpdateAvailable(false)}>
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canInstall || !showPrompt) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4" />
              Install E-Code
            </CardTitle>
            <CardDescription>
              Install E-Code as an app for a better experience
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Work offline</li>
            <li>• Faster loading</li>
            <li>• Native app experience</li>
            <li>• Easy access from home screen</li>
          </ul>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleInstall} 
              disabled={isInstalling}
              className="flex-1"
            >
              <Download className="h-3 w-3 mr-1" />
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for PWA features
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    setIsInstalled(pwaManager.isAppInstalled());
    setCanInstall(pwaManager.canInstall());

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    const handleInstallable = () => {
      setCanInstall(true);
    };

    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-installable', handleInstallable);

    return () => {
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-installable', handleInstallable);
    };
  }, []);

  return {
    isInstalled,
    canInstall,
    install: () => pwaManager.installPWA(),
    checkForUpdates: () => pwaManager.checkForUpdates(),
    requestNotifications: () => pwaManager.requestNotificationPermission(),
    appInfo: pwaManager.getAppInfo()
  };
}