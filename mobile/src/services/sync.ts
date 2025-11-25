import NetInfo from '@react-native-community/netinfo';
import StorageService from './storage';
import AuthService from './auth';
import { API_BASE_URL } from './config';

type SyncOperation = {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
};

export class SyncService {
  private static isOnline = true;
  private static isSyncing = false;
  private static syncQueue: SyncOperation[] = [];
  private static listeners: Set<(online: boolean) => void> = new Set();

  // Initialize sync service
  static async initialize(): Promise<void> {
    // Load pending operations from storage
    const queue = await StorageService.get<SyncOperation[]>('sync_queue');
    if (queue) {
      this.syncQueue = queue;
    }

    // Setup network listener
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log('Network status:', this.isOnline ? 'online' : 'offline');

      // Notify listeners
      this.listeners.forEach(listener => listener(this.isOnline));

      // Trigger sync when coming back online
      if (!wasOnline && this.isOnline) {
        this.sync();
      }
    });

    // Initial sync if online
    if (this.isOnline) {
      this.sync();
    }
  }

  // Add operation to queue
  static async queueOperation(op: Omit<SyncOperation, 'id' | 'timestamp'>): Promise<void> {
    const operation: SyncOperation = {
      ...op,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.syncQueue.push(operation);
    await StorageService.set('sync_queue', this.syncQueue);

    // Try to sync immediately if online
    if (this.isOnline) {
      this.sync();
    }
  }

  // Perform sync
  static async sync(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    const token = AuthService.getToken();

    if (!token) {
      console.warn('Cannot sync: not authenticated');
      this.isSyncing = false;
      return;
    }

    try {
      console.log(`Syncing ${this.syncQueue.length} operations...`);

      const operations = [...this.syncQueue];
      const results = await Promise.allSettled(
        operations.map(op => this.executeOperation(op, token))
      );

      // Remove successful operations from queue
      const failedOps: SyncOperation[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error('Sync operation failed:', operations[index], result.reason);
          failedOps.push(operations[index]);
        }
      });

      this.syncQueue = failedOps;
      await StorageService.set('sync_queue', this.syncQueue);

      console.log(`Sync complete. ${failedOps.length} operations failed.`);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Execute single operation
  private static async executeOperation(op: SyncOperation, token: string): Promise<void> {
    const url = `${API_BASE_URL}${op.resource}`;
    const method = op.type === 'create' ? 'POST' : op.type === 'update' ? 'PUT' : 'DELETE';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: op.type !== 'delete' ? JSON.stringify(op.data) : undefined
    });

    if (!response.ok) {
      throw new Error(`Sync operation failed: ${response.status} ${response.statusText}`);
    }
  }

  // Subscribe to online status changes
  static onlineStatusListener(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Get current online status
  static getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Get pending operations count
  static getPendingCount(): number {
    return this.syncQueue.length;
  }

  // Clear sync queue (use with caution)
  static async clearQueue(): Promise<void> {
    this.syncQueue = [];
    await StorageService.remove('sync_queue');
  }
}

export default SyncService;
