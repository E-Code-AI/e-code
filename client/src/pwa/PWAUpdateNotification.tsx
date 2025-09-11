/**
 * Optional PWA Update Notification Component
 * 
 * This component can be used to show update prompts when a new service worker is available.
 * It listens for the 'pwa:update-available' event dispatched by the service worker registration.
 */

import React, { useState, useEffect } from 'react';
import { activateServiceWorkerUpdate } from './registerServiceWorker';

interface PWAUpdateNotificationProps {
  className?: string;
  children?: React.ReactNode;
}

interface UpdateAvailableEvent extends CustomEvent {
  detail: {
    registration: ServiceWorkerRegistration;
    waitingWorker: ServiceWorker;
  };
}

export function PWAUpdateNotification({ className, children }: PWAUpdateNotificationProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = (event: Event) => {
      console.log('[PWA] Update notification received');
      setUpdateAvailable(true);
    };

    // Listen for PWA update events
    window.addEventListener('pwa:update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await activateServiceWorkerUpdate();
      // The page will reload automatically when the new SW takes control
    } catch (error) {
      console.error('[PWA] Failed to activate update:', error);
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className={`pwa-update-notification ${className || ''}`}>
      {children || (
        <div className="update-prompt">
          <div className="update-message">
            <h4>App Update Available</h4>
            <p>A new version of E-Code is ready. Update now for the latest features and improvements.</p>
          </div>
          <div className="update-actions">
            <button 
              onClick={handleUpdate} 
              disabled={loading}
              className="update-button"
            >
              {loading ? 'Updating...' : 'Update Now'}
            </button>
            <button 
              onClick={handleDismiss}
              className="dismiss-button"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for PWA update state
 * Alternative to the component for custom implementations
 */
export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa:update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa:update-available', handleUpdateAvailable);
    };
  }, []);

  const activateUpdate = async () => {
    setLoading(true);
    try {
      await activateServiceWorkerUpdate();
    } catch (error) {
      console.error('[PWA] Failed to activate update:', error);
      setLoading(false);
      throw error;
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    loading,
    activateUpdate,
    dismissUpdate
  };
}

export default PWAUpdateNotification;