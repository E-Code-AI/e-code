/**
 * Service Worker Registration for E-Code PWA
 * 
 * Registers the service worker only in production builds and when
 * the browser supports service workers. Handles update notifications
 * and lifecycle events.
 */

interface ServiceWorkerUpdateEvent {
  type: 'pwa:update-available';
  detail: {
    registration: ServiceWorkerRegistration;
    waitingWorker: ServiceWorker;
  };
}

class PWAServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateAvailable = false;

  /**
   * Register the service worker if conditions are met
   */
  async register(): Promise<void> {
    // Only register in production
    if (import.meta.env.DEV) {
      console.log('[PWA] Service worker disabled in development mode');
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service workers not supported in this browser');
      return;
    }

    try {
      console.log('[PWA] Registering service worker...');
      
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        type: 'classic'
      });

      console.log('[PWA] Service worker registered successfully:', this.registration);

      // Set up event listeners
      this.setupEventListeners();

      // Check for immediate updates
      this.checkForUpdates();

      // Send main app assets to service worker for precaching
      await this.sendMainAssetsToServiceWorker();

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  }

  /**
   * Set up event listeners for service worker lifecycle events
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('[PWA] Service worker update found');
      
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[PWA] New service worker installed, update available');
          this.handleUpdateAvailable(newWorker);
        }
      });
    });

    // Listen for controller changes (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] Service worker controller changed - reloading page');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[PWA] Message from service worker:', event.data);
    });
  }

  /**
   * Handle when a service worker update is available
   */
  private handleUpdateAvailable(waitingWorker: ServiceWorker): void {
    this.updateAvailable = true;

    // Dispatch custom event that the app can listen to
    const updateEvent = new CustomEvent('pwa:update-available', {
      detail: {
        registration: this.registration!,
        waitingWorker
      }
    }) as ServiceWorkerUpdateEvent;

    window.dispatchEvent(updateEvent);

    console.log('[PWA] Update notification dispatched');
  }

  /**
   * Activate the waiting service worker
   */
  async activateUpdate(): Promise<void> {
    if (!this.registration?.waiting) {
      console.log('[PWA] No waiting service worker to activate');
      return;
    }

    console.log('[PWA] Activating service worker update...');
    
    // Tell the waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Check for service worker updates manually
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      console.log('[PWA] No service worker registration to check for updates');
      return;
    }

    try {
      console.log('[PWA] Checking for service worker updates...');
      await this.registration.update();
    } catch (error) {
      console.error('[PWA] Error checking for updates:', error);
    }
  }

  /**
   * Unregister the service worker (for debugging)
   */
  async unregister(): Promise<void> {
    if (!this.registration) {
      console.log('[PWA] No service worker registration to unregister');
      return;
    }

    try {
      const result = await this.registration.unregister();
      console.log('[PWA] Service worker unregistered:', result);
      this.registration = null;
    } catch (error) {
      console.error('[PWA] Error unregistering service worker:', error);
    }
  }

  /**
   * Get current registration state
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if update is available
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Send main app assets to service worker for precaching
   */
  private async sendMainAssetsToServiceWorker(): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      console.log('[PWA] No active service worker to send assets to');
      return;
    }

    try {
      // Extract main CSS and JS files from current page
      const mainAssets: string[] = [];
      
      // Get CSS files
      const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
      cssLinks.forEach((link) => {
        const href = (link as HTMLLinkElement).href;
        if (href && href.includes('/assets/')) {
          mainAssets.push(new URL(href).pathname);
        }
      });
      
      // Get main JS file
      const scriptTags = document.querySelectorAll('script[src]');
      scriptTags.forEach((script) => {
        const src = (script as HTMLScriptElement).src;
        if (src && src.includes('/assets/') && src.includes('index-')) {
          mainAssets.push(new URL(src).pathname);
        }
      });

      if (mainAssets.length > 0) {
        console.log('[PWA] Sending main assets to service worker:', mainAssets);
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_MAIN_ASSETS',
          assets: mainAssets
        });
      }
    } catch (error) {
      console.error('[PWA] Failed to send main assets to service worker:', error);
    }
  }
}

// Create singleton instance
const pwaManager = new PWAServiceWorkerManager();

/**
 * Register the service worker
 * Call this from your main app entry point
 */
export async function registerServiceWorker(): Promise<void> {
  await pwaManager.register();
}

/**
 * Activate a pending service worker update
 */
export async function activateServiceWorkerUpdate(): Promise<void> {
  await pwaManager.activateUpdate();
}

/**
 * Check for service worker updates
 */
export async function checkForServiceWorkerUpdates(): Promise<void> {
  await pwaManager.checkForUpdates();
}

/**
 * Unregister the service worker (for debugging)
 */
export async function unregisterServiceWorker(): Promise<void> {
  await pwaManager.unregister();
}

/**
 * Get the current service worker registration
 */
export function getServiceWorkerRegistration(): ServiceWorkerRegistration | null {
  return pwaManager.getRegistration();
}

/**
 * Check if a service worker update is available
 */
export function isServiceWorkerUpdateAvailable(): boolean {
  return pwaManager.isUpdateAvailable();
}

// Development helper: expose PWA manager on window for debugging
if (import.meta.env.DEV) {
  (window as any).__pwaManager = pwaManager;
}

export default pwaManager;