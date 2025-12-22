import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isSecureStoreAvailable = async (): Promise<boolean> => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(key, value);
    } else {
      console.warn('[SecureStorage] Falling back to AsyncStorage (less secure)');
      await AsyncStorage.setItem(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (await isSecureStoreAvailable()) {
      return await SecureStore.getItemAsync(key);
    } else {
      return await AsyncStorage.getItem(key);
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  },

  async migrateFromAsyncStorage(key: string): Promise<void> {
    try {
      const asyncValue = await AsyncStorage.getItem(key);
      if (asyncValue && await isSecureStoreAvailable()) {
        await SecureStore.setItemAsync(key, asyncValue);
        await AsyncStorage.removeItem(key);
        console.log(`[SecureStorage] Migrated ${key} to secure storage`);
      }
    } catch (error) {
      console.warn(`[SecureStorage] Migration failed for ${key}:`, error);
    }
  }
};

export const TOKEN_STORAGE_KEY = 'ecode.mobile.accessToken';
export const REFRESH_TOKEN_KEY = 'ecode.mobile.refreshToken';
export const USER_STORAGE_KEY = 'ecode.mobile.user';
