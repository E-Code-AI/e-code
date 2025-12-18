/**
 * OTA Updates Service
 * Handles over-the-air updates for the E-Code mobile app using expo-updates
 * 
 * Requires: expo-updates
 * Install: npx expo install expo-updates
 */

import { Alert, Platform } from 'react-native';

export type UpdateState = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface UpdateCheckResult {
  isAvailable: boolean;
  manifest?: any;
}

export interface UpdateStatus {
  state: UpdateState;
  error?: string;
  downloadProgress?: number;
}

class OTAUpdateService {
  private currentState: UpdateState = 'idle';
  private lastError: string | null = null;
  private isUpdatesAvailable: boolean = false;

  /**
   * Get the current update state
   */
  getState(): UpdateState {
    return this.currentState;
  }

  /**
   * Get the current update status
   */
  getStatus(): UpdateStatus {
    return {
      state: this.currentState,
      error: this.lastError || undefined,
    };
  }

  /**
   * Check if expo-updates is available (lazy load)
   */
  private async checkUpdatesAvailable(): Promise<boolean> {
    try {
      const Updates = await import('expo-updates');
      return !!Updates;
    } catch {
      console.log('[OTAUpdate] expo-updates not available');
      return false;
    }
  }

  /**
   * Check if app is running in development mode
   */
  private async isInDevelopmentMode(): Promise<boolean> {
    try {
      const Updates = await import('expo-updates');
      if (__DEV__) {
        console.log('[OTAUpdate] Running in development mode - updates disabled');
        return true;
      }
      return false;
    } catch {
      return true;
    }
  }

  /**
   * Check for available updates
   * @returns Object with isAvailable flag and manifest if update exists
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    console.log('[OTAUpdate] Checking for updates...');
    
    const updatesAvailable = await this.checkUpdatesAvailable();
    if (!updatesAvailable) {
      console.log('[OTAUpdate] Updates module not available');
      return { isAvailable: false };
    }

    const isDev = await this.isInDevelopmentMode();
    if (isDev) {
      return { isAvailable: false };
    }

    try {
      this.currentState = 'checking';
      this.lastError = null;

      const Updates = await import('expo-updates');
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('[OTAUpdate] Update available:', update.manifest?.id || 'unknown');
        this.isUpdatesAvailable = true;
        this.currentState = 'idle';
        return {
          isAvailable: true,
          manifest: update.manifest,
        };
      }

      console.log('[OTAUpdate] No updates available');
      this.currentState = 'idle';
      return { isAvailable: false };
    } catch (error: any) {
      this.currentState = 'error';
      this.lastError = error.message || 'Failed to check for updates';
      console.error('[OTAUpdate] Check failed:', this.lastError);
      return { isAvailable: false };
    }
  }

  /**
   * Download the available update
   */
  async downloadUpdate(): Promise<void> {
    console.log('[OTAUpdate] Downloading update...');

    const updatesAvailable = await this.checkUpdatesAvailable();
    if (!updatesAvailable) {
      throw new Error('Updates module not available');
    }

    const isDev = await this.isInDevelopmentMode();
    if (isDev) {
      throw new Error('Cannot download updates in development mode');
    }

    try {
      this.currentState = 'downloading';
      this.lastError = null;

      const Updates = await import('expo-updates');
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        console.log('[OTAUpdate] Update downloaded successfully');
        this.currentState = 'ready';
      } else {
        console.log('[OTAUpdate] Downloaded update is not new');
        this.currentState = 'idle';
      }
    } catch (error: any) {
      this.currentState = 'error';
      this.lastError = error.message || 'Failed to download update';
      console.error('[OTAUpdate] Download failed:', this.lastError);
      throw error;
    }
  }

  /**
   * Apply the downloaded update and reload the app
   */
  async applyUpdate(): Promise<void> {
    console.log('[OTAUpdate] Applying update and reloading...');

    const updatesAvailable = await this.checkUpdatesAvailable();
    if (!updatesAvailable) {
      throw new Error('Updates module not available');
    }

    try {
      const Updates = await import('expo-updates');
      await Updates.reloadAsync();
    } catch (error: any) {
      this.currentState = 'error';
      this.lastError = error.message || 'Failed to apply update';
      console.error('[OTAUpdate] Apply failed:', this.lastError);
      throw error;
    }
  }

  /**
   * Full update flow: check, download, and optionally prompt user before applying
   * @param showDialog Whether to show confirmation dialog before applying update
   */
  async checkAndApplyUpdate(showDialog: boolean = true): Promise<void> {
    console.log('[OTAUpdate] Starting full update check flow...');

    try {
      const { isAvailable, manifest } = await this.checkForUpdates();

      if (!isAvailable) {
        console.log('[OTAUpdate] No updates to apply');
        return;
      }

      if (showDialog) {
        const updateVersion = manifest?.version || manifest?.id || 'latest';
        
        return new Promise((resolve) => {
          Alert.alert(
            'Update Available',
            `A new version (${updateVersion}) is available. Would you like to update now? The app will restart to apply changes.`,
            [
              {
                text: 'Later',
                style: 'cancel',
                onPress: () => {
                  console.log('[OTAUpdate] User deferred update');
                  resolve();
                },
              },
              {
                text: 'Update Now',
                style: 'default',
                onPress: async () => {
                  try {
                    await this.downloadUpdate();
                    await this.applyUpdate();
                    resolve();
                  } catch (error: any) {
                    Alert.alert(
                      'Update Failed',
                      `Failed to update: ${error.message}. Please try again later.`
                    );
                    resolve();
                  }
                },
              },
            ],
            { cancelable: false }
          );
        });
      } else {
        await this.downloadUpdate();
        await this.applyUpdate();
      }
    } catch (error: any) {
      console.error('[OTAUpdate] Full update flow failed:', error.message);
      if (showDialog) {
        Alert.alert(
          'Update Check Failed',
          'Unable to check for updates. Please try again later.'
        );
      }
    }
  }

  /**
   * Silently check and download updates in background
   * Does not prompt user or apply update automatically
   */
  async checkAndDownloadInBackground(): Promise<boolean> {
    console.log('[OTAUpdate] Background update check starting...');

    try {
      const { isAvailable } = await this.checkForUpdates();

      if (isAvailable) {
        await this.downloadUpdate();
        console.log('[OTAUpdate] Background download complete - update ready');
        return true;
      }

      return false;
    } catch (error: any) {
      console.warn('[OTAUpdate] Background update failed:', error.message);
      return false;
    }
  }

  /**
   * Prompt user to restart if update is ready
   */
  promptRestartIfReady(): void {
    if (this.currentState === 'ready') {
      Alert.alert(
        'Update Ready',
        'A new update has been downloaded and is ready to install. Restart now to apply the update.',
        [
          {
            text: 'Later',
            style: 'cancel',
          },
          {
            text: 'Restart Now',
            style: 'default',
            onPress: () => this.applyUpdate(),
          },
        ]
      );
    }
  }

  /**
   * Get current update information
   */
  async getCurrentUpdateInfo(): Promise<{
    updateId?: string;
    channel?: string;
    createdAt?: Date;
    isEmbeddedLaunch: boolean;
  } | null> {
    try {
      const Updates = await import('expo-updates');
      
      return {
        updateId: Updates.updateId || undefined,
        channel: Updates.channel || undefined,
        createdAt: Updates.createdAt || undefined,
        isEmbeddedLaunch: Updates.isEmbeddedLaunch,
      };
    } catch {
      return null;
    }
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.currentState = 'idle';
    this.lastError = null;
    this.isUpdatesAvailable = false;
  }
}

export const otaUpdateService = new OTAUpdateService();
export default otaUpdateService;
