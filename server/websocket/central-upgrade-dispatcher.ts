/**
 * Central WebSocket Upgrade Dispatcher
 * 
 * 40-YEAR SENIOR ENGINEER FIX (Dec 6, 2025)
 * 
 * PROBLEM: Multiple upgrade listeners (16+) cause race conditions where:
 * - Express/Vite middleware processes upgrades before our handlers
 * - Multiple handlers try to complete the same handshake
 * - "Invalid frame header" errors occur when HTML is written after handshake starts
 * 
 * SOLUTION: Single authoritative dispatcher that:
 * 1. Intercepts ALL upgrade events FIRST (using prependListener)
 * 2. Routes by pathname to the correct handler
 * 3. Marks sockets immediately to prevent other handlers from interfering
 * 4. Delegates to the appropriate WebSocket service
 * 
 * This completely eliminates race conditions by ensuring only ONE handler processes each upgrade.
 */

import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import type { Server } from 'http';
import { markSocketAsHandled, isSocketHandled } from './upgrade-guard';
import { createCentralizedLogger } from '../logging/centralized-logger';

const logger = createCentralizedLogger('central-upgrade-dispatcher');

// Service handlers registered with the dispatcher
interface ServiceHandler {
  path: string;
  pathMatch: 'exact' | 'prefix';
  handler: (request: IncomingMessage, socket: Duplex, head: Buffer) => void;
  priority: number; // Lower = higher priority
}

class CentralUpgradeDispatcher {
  private handlers: ServiceHandler[] = [];
  private isInitialized = false;
  private server: Server | null = null;
  
  /**
   * Initialize the dispatcher on an HTTP server
   * MUST be called BEFORE any other WebSocket services are initialized
   */
  initialize(server: Server): void {
    if (this.isInitialized) {
      logger.warn('[Central Dispatcher] Already initialized - ignoring duplicate call');
      return;
    }
    
    this.server = server;
    this.isInitialized = true;
    
    // Register as THE FIRST upgrade listener using prependListener
    // This ensures we intercept ALL upgrades before any other listener
    server.prependListener('upgrade', this.handleUpgrade.bind(this));
    
    logger.info('[Central Dispatcher] ✅ Initialized as authoritative upgrade handler');
  }
  
  /**
   * Register a WebSocket service handler
   * @param path - URL path to match (e.g., '/ws/agent')
   * @param handler - Function to handle the upgrade
   * @param options - Match options
   */
  register(
    path: string,
    handler: (request: IncomingMessage, socket: Duplex, head: Buffer) => void,
    options: { pathMatch?: 'exact' | 'prefix'; priority?: number } = {}
  ): void {
    const { pathMatch = 'prefix', priority = 100 } = options;
    
    // Insert in priority order (lower priority number = runs first)
    const entry: ServiceHandler = { path, handler, pathMatch, priority };
    const insertIndex = this.handlers.findIndex(h => h.priority > priority);
    
    if (insertIndex === -1) {
      this.handlers.push(entry);
    } else {
      this.handlers.splice(insertIndex, 0, entry);
    }
    
    logger.info(`[Central Dispatcher] Registered handler for ${path} (match: ${pathMatch}, priority: ${priority})`);
  }
  
  /**
   * The single authoritative upgrade handler
   * Routes all WebSocket upgrades to the appropriate service
   */
  private handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    // Extract pathname safely
    const pathname = this.extractPathname(request);
    
    // Check if already handled (safety net)
    if (isSocketHandled(request, socket)) {
      logger.debug(`[Central Dispatcher] Socket already handled for ${pathname} - skipping`);
      return;
    }
    
    // Find matching handler
    const handler = this.findHandler(pathname);
    
    if (handler) {
      // AUTHORITATIVE MARKING POINT (Dec 6, 2025):
      // Mark socket as handled BEFORE delegating to any handler.
      // This ensures EVERY WebSocket upgrade routed through the dispatcher is marked,
      // even if downstream handlers forget to call markSocketAsHandled().
      // This prevents race conditions with other upgrade listeners.
      markSocketAsHandled(request, socket);
      
      logger.info(`[Central Dispatcher] Routing ${pathname} to registered handler`);
      
      // Delegate to the registered handler (socket is already marked above)
      try {
        handler.handler(request, socket, head);
      } catch (error) {
        logger.error(`[Central Dispatcher] Handler error for ${pathname}:`, error);
        this.destroySocketWithError(socket, 500, 'Internal Server Error');
      }
    } else {
      // No handler found - let other listeners (like Vite HMR) handle it
      // Don't mark as handled, don't destroy - just skip
      logger.debug(`[Central Dispatcher] No handler for ${pathname} - deferring to other listeners`);
    }
  }
  
  /**
   * Find a matching handler for the given pathname
   */
  private findHandler(pathname: string): ServiceHandler | null {
    for (const handler of this.handlers) {
      if (handler.pathMatch === 'exact') {
        if (pathname === handler.path) {
          return handler;
        }
      } else {
        // prefix match
        if (pathname.startsWith(handler.path)) {
          return handler;
        }
      }
    }
    return null;
  }
  
  /**
   * Safely extract pathname from request
   */
  private extractPathname(request: IncomingMessage): string {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      return url.pathname;
    } catch {
      return request.url || '/';
    }
  }
  
  /**
   * Destroy socket with HTTP error response
   */
  private destroySocketWithError(socket: Duplex, code: number, message: string): void {
    const httpResponse = `HTTP/1.1 ${code} ${message}\r\n` +
      `Content-Type: text/plain\r\n` +
      `Content-Length: ${message.length}\r\n` +
      `\r\n` +
      message;
    
    socket.write(httpResponse);
    socket.destroy();
  }
  
  /**
   * Get debug info about registered handlers
   */
  getDebugInfo(): { handlers: string[]; isInitialized: boolean } {
    return {
      handlers: this.handlers.map(h => `${h.path} (${h.pathMatch}, priority: ${h.priority})`),
      isInitialized: this.isInitialized
    };
  }
}

// Singleton instance
export const centralUpgradeDispatcher = new CentralUpgradeDispatcher();
