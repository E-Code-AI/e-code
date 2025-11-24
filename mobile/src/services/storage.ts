import AsyncStorage from '@react-native-async-storage/async-storage';

export class StorageService {
  private static prefix = '@ecode_';

  // Get item
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(this.prefix + key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Storage get error for key ${key}:`, error);
      return null;
    }
  }

  // Set item
  static async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Storage set error for key ${key}:`, error);
      return false;
    }
  }

  // Remove item
  static async remove(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error(`Storage remove error for key ${key}:`, error);
      return false;
    }
  }

  // Clear all
  static async clear(): Promise<boolean> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter(k => k.startsWith(this.prefix));
      await AsyncStorage.multiRemove(appKeys);
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  // Get multiple items
  static async getMultiple<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      const prefixedKeys = keys.map(k => this.prefix + k);
      const values = await AsyncStorage.multiGet(prefixedKeys);

      const result: Record<string, T | null> = {};
      values.forEach(([key, value], index) => {
        const originalKey = keys[index];
        result[originalKey] = value ? JSON.parse(value) : null;
      });

      return result;
    } catch (error) {
      console.error('Storage getMultiple error:', error);
      return {};
    }
  }

  // Set multiple items
  static async setMultiple<T>(items: Record<string, T>): Promise<boolean> {
    try {
      const pairs: [string, string][] = Object.entries(items).map(([key, value]) => [
        this.prefix + key,
        JSON.stringify(value)
      ]);

      await AsyncStorage.multiSet(pairs);
      return true;
    } catch (error) {
      console.error('Storage setMultiple error:', error);
      return false;
    }
  }

  // Get all keys
  static async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys
        .filter(k => k.startsWith(this.prefix))
        .map(k => k.replace(this.prefix, ''));
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      return [];
    }
  }

  // Get storage size (approximate)
  static async getSize(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      const values = await this.getMultiple(keys);

      let totalSize = 0;
      Object.values(values).forEach(value => {
        if (value) {
          totalSize += JSON.stringify(value).length;
        }
      });

      return totalSize;
    } catch (error) {
      console.error('Storage getSize error:', error);
      return 0;
    }
  }
}

export default StorageService;
