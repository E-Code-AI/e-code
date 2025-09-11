// Example usage of PWA Update Notification
// Add this to your main App component or layout

import React from 'react';
import { PWAUpdateNotification, usePWAUpdate } from './pwa/PWAUpdateNotification';

// Option 1: Using the component with default UI
function AppWithPWAUpdates() {
  return (
    <div className="app">
      {/* Your app content */}
      <main>
        {/* App content here */}
      </main>
      
      {/* PWA Update Notification */}
      <PWAUpdateNotification className="fixed bottom-4 right-4 z-50 max-w-sm" />
    </div>
  );
}

// Option 2: Using the hook for custom implementation
function AppWithCustomPWAUpdates() {
  const { updateAvailable, loading, activateUpdate, dismissUpdate } = usePWAUpdate();

  return (
    <div className="app">
      {/* Your app content */}
      <main>
        {/* App content here */}
      </main>
      
      {/* Custom update notification */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Update Available</h4>
              <p className="text-sm opacity-90">New features and improvements ready</p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={activateUpdate}
                disabled={loading}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={dismissUpdate}
                className="text-white/70 hover:text-white px-2"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Option 3: Listening to the event manually (vanilla JS)
function setupPWAUpdateListener() {
  window.addEventListener('pwa:update-available', (event) => {
    const customEvent = event as CustomEvent;
    console.log('PWA update available:', customEvent.detail);
    
    // Show your custom notification here
    // For example, using a toast library or custom modal
    showUpdateToast();
  });
}

function showUpdateToast() {
  // Example using a hypothetical toast library
  // toast.info('App update available!', {
  //   action: {
  //     label: 'Update',
  //     onClick: () => activateServiceWorkerUpdate()
  //   }
  // });
}

export { AppWithPWAUpdates, AppWithCustomPWAUpdates, setupPWAUpdateListener };