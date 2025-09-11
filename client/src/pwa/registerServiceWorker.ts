/**
 * Service Worker Registration Module
 * 
 * Registers the service worker only in production and handles SW lifecycle events.
 * Dispatches custom events for update notifications.
 * 
 * Note: Service worker is disabled in development mode for better dev experience.
 */

const isProduction = import.meta.env.PROD;
const swPath = '/service-worker.js';

export interface ServiceWorkerUpdateInfo {
  isUpdate: boolean;
  registration: ServiceWorkerRegistration;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Only register in production and if service worker is supported
  if (!isProduction || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service worker registration skipped:', {
      production: isProduction,
      supported: 'serviceWorker' in navigator
    });
    return null;
  }

  try {
    console.log('[PWA] Registering service worker...');
    
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: '/',
      type: 'module'
    });

    console.log('[PWA] Service worker registered successfully');

    // Listen for updates
    setupUpdateListener(registration);

    // Check for updates on registration
    await checkForUpdates(registration);

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Set up listener for service worker updates
 */
function setupUpdateListener(registration: ServiceWorkerRegistration): void {
  // Listen for new service worker installation
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    console.log('[PWA] New service worker installing...');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('[PWA] New service worker installed, update available');
        
        // Dispatch custom event for update notification
        window.dispatchEvent(new CustomEvent('pwa:update-available', {
          detail: {
            registration,
            newWorker
          }
        }));
      }
    });
  });

  // Listen for service worker controller change
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[PWA] Service worker controller changed, reloading page...');
    window.location.reload();
  });
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(registration?: ServiceWorkerRegistration): Promise<void> {
  if (!registration && navigator.serviceWorker.controller) {
    registration = await navigator.serviceWorker.getRegistration();
  }

  if (registration) {
    try {
      await registration.update();
      console.log('[PWA] Checked for service worker updates');
    } catch (error) {
      console.error('[PWA] Failed to check for updates:', error);
    }
  }
}

/**
 * Trigger service worker update (skip waiting)
 */
export function applyServiceWorkerUpdate(registration: ServiceWorkerRegistration): void {
  const waitingWorker = registration.waiting;
  if (!waitingWorker) {
    console.warn('[PWA] No waiting service worker to activate');
    return;
  }

  console.log('[PWA] Applying service worker update...');
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Unregister the service worker (for development/testing)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const result = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', result);
      return result;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Get service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  registration: ServiceWorkerRegistration | null;
}> {
  const supported = 'serviceWorker' in navigator;
  
  if (!supported) {
    return { supported: false, registered: false, registration: null };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return {
      supported: true,
      registered: !!registration,
      registration: registration || null
    };
  } catch (error) {
    console.error('[PWA] Failed to get service worker status:', error);
    return { supported: true, registered: false, registration: null };
  }
}

// Auto-register on module load in production
if (isProduction) {
  registerServiceWorker().catch(console.error);
}