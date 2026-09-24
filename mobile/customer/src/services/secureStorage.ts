import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'ardab_auth_token',
  REFRESH_TOKEN: 'ardab_refresh_token',
  SAVED_IDENTITY: 'ardab_saved_identity',
  USER_DATA: 'ardab_user_data',
};

// In-memory fallback for web environment where SecureStore is not natively supported
const memoryStorage = new Map<string, string>();

export const secureStorage = {
  /**
   * Save a key-value pair securely
   * NEVER stores plain passwords!
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        memoryStorage.set(key, value);
        try {
          // Non-sensitive data only in localStorage on web
          if (key !== STORAGE_KEYS.AUTH_TOKEN) {
            localStorage.setItem(key, value);
          } else {
            sessionStorage.setItem(key, value);
          }
        } catch {
          // ignore web storage errors
        }
        return;
      }
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (err) {
      console.warn(`[SecureStore] Failed to write ${key}:`, err);
      memoryStorage.set(key, value);
    }
  },

  /**
   * Read a value securely
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (memoryStorage.has(key)) {
          return memoryStorage.get(key) || null;
        }
        try {
          return sessionStorage.getItem(key) || localStorage.getItem(key);
        } catch {
          return null;
        }
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn(`[SecureStore] Failed to read ${key}:`, err);
      return memoryStorage.get(key) || null;
    }
  },

  /**
   * Delete a key securely
   */
  async deleteItem(key: string): Promise<void> {
    try {
      memoryStorage.delete(key);
      if (Platform.OS === 'web') {
        try {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn(`[SecureStore] Failed to delete ${key}:`, err);
    }
  },

  // Specialized helpers
  async saveAuthToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getAuthToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async clearAuthToken(): Promise<void> {
    await this.deleteItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async saveRefreshToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async clearRefreshToken(): Promise<void> {
    await this.deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async saveSavedIdentity(identity: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.SAVED_IDENTITY, identity);
  },

  async getSavedIdentity(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.SAVED_IDENTITY);
  },

  async clearSavedIdentity(): Promise<void> {
    await this.deleteItem(STORAGE_KEYS.SAVED_IDENTITY);
  },

  async saveUserData(userData: object): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  },

  async getUserData<T>(): Promise<T | null> {
    const raw = await this.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async clearAllSession(): Promise<void> {
    await this.clearAuthToken();
    await this.deleteItem(STORAGE_KEYS.USER_DATA);
    await this.deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
    // Note: We deliberately preserve SAVED_IDENTITY so returning users enjoy quick login!
  },
};
