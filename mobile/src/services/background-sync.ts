import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import SyncService from './sync';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  const startTime = Date.now();
  console.log('[BackgroundSync] Task started at:', new Date().toISOString());

  try {
    await SyncService.sync();
    const duration = Date.now() - startTime;
    console.log(`[BackgroundSync] Sync completed successfully in ${duration}ms`);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[BackgroundSync] Sync failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (isRegistered) {
      console.log('[BackgroundSync] Task already registered');
      return;
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('[BackgroundSync] Task registered successfully');
  } catch (error) {
    console.error('[BackgroundSync] Failed to register task:', error);
    throw error;
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    
    if (!isRegistered) {
      console.log('[BackgroundSync] Task not registered, nothing to unregister');
      return;
    }

    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
    console.log('[BackgroundSync] Task unregistered successfully');
  } catch (error) {
    console.error('[BackgroundSync] Failed to unregister task:', error);
    throw error;
  }
}

export async function checkBackgroundSyncStatus(): Promise<boolean> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    console.log('[BackgroundSync] Task registration status:', isRegistered);
    return isRegistered;
  } catch (error) {
    console.error('[BackgroundSync] Failed to check task status:', error);
    return false;
  }
}

export { BACKGROUND_SYNC_TASK };
