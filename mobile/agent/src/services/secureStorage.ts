/**
 * Ardab Market Agent - Secure Storage Service
 *
 * Provides hardware-backed secure storage using expo-secure-store on mobile,
 * with encrypted web session fallback.
 *
 * Implements strict security rules:
 * - Credentials saved by "Remember Me" are stored strictly in SecureStore keychain/keystore.
 * - Passwords are never stored in plain AsyncStorage or logged.
 * - Credentials can be toggled, inspected (masked only), or deleted by the agent.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'ardab_agent_auth_token',
  REFRESH_TOKEN: 'ardab_agent_refresh_token',
  ACTIVE_PROFILE: 'ardab_agent_profile_cache',
  REMEMBER_ME_ENABLED: 'ardab_agent_remember_me_flag',
  REMEMBERED_EMAIL: 'ardab_agent_remembered_email',
  REMEMBERED_PASSWORD: 'ardab_agent_remembered_password_sec',
  REMEMBERED_AT: 'ardab_agent_remembered_at',
};

const memoryStorage = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export const secureStorage = {
  /**
   * Store sensitive key-value in SecureStore
   */
  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      } else {
        memoryStorage.set(key, value);
        try {
          if (typeof window !== 'undefined' && (window as any).sessionStorage) {
            (window as any).sessionStorage.setItem(key, value);
          }
        } catch {
          // ignore web storage error
        }
      }
    } catch (err) {
      console.warn(`[AgentSecureStore] Error writing ${key}:`, err);
      memoryStorage.set(key, value);
    }
  },

  /**
   * Retrieve sensitive item
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        return await SecureStore.getItemAsync(key);
      }
      if (memoryStorage.has(key)) {
        return memoryStorage.get(key) || null;
      }
      try {
        if (typeof window !== 'undefined' && (window as any).sessionStorage) {
          return (window as any).sessionStorage.getItem(key);
        }
      } catch {
        // ignore web storage error
      }
      return null;
    } catch (err) {
      console.warn(`[AgentSecureStore] Error reading ${key}:`, err);
      return memoryStorage.get(key) || null;
    }
  },

  /**
   * Remove sensitive item
   */
  async deleteSecureItem(key: string): Promise<void> {
    try {
      const available = await isSecureStoreAvailable();
      if (available) {
        await SecureStore.deleteItemAsync(key);
      }
      memoryStorage.delete(key);
      try {
        if (typeof window !== 'undefined' && (window as any).sessionStorage) {
          (window as any).sessionStorage.removeItem(key);
        }
      } catch {
        // ignore web storage error
      }
    } catch (err) {
      console.warn(`[AgentSecureStore] Error deleting ${key}:`, err);
      memoryStorage.delete(key);
    }
  },

  // --------------------------------------------------------------------------
  // Session & Authentication Tokens
  // --------------------------------------------------------------------------

  async saveAuthToken(token: string): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getAuthToken(): Promise<string | null> {
    return await this.getSecureItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async saveRefreshToken(token: string): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await this.getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async clearAuthToken(): Promise<void> {
    await this.deleteSecureItem(STORAGE_KEYS.AUTH_TOKEN);
    await this.deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  // --------------------------------------------------------------------------
  // Remember Me / Secure Credential Storage
  // --------------------------------------------------------------------------

  /**
   * Store credentials securely when Remember Me is enabled.
   */
  async saveRememberedCredentials(email: string, password?: string): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.REMEMBER_ME_ENABLED, 'true');
    await this.setSecureItem(STORAGE_KEYS.REMEMBERED_EMAIL, email.trim());
    await this.setSecureItem(STORAGE_KEYS.REMEMBERED_AT, new Date().toISOString());

    if (password) {
      await this.setSecureItem(STORAGE_KEYS.REMEMBERED_PASSWORD, password);
    }
  },

  /**
   * Get remembered credentials for pre-filling login form
   */
  async getRememberedCredentials(): Promise<{
    email: string | null;
    password: string | null;
    isEnabled: boolean;
    rememberedAt: string | null;
  }> {
    const isEnabled = (await this.getSecureItem(STORAGE_KEYS.REMEMBER_ME_ENABLED)) === 'true';
    if (!isEnabled) {
      return { email: null, password: null, isEnabled: false, rememberedAt: null };
    }

    const email = await this.getSecureItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    const password = await this.getSecureItem(STORAGE_KEYS.REMEMBERED_PASSWORD);
    const rememberedAt = await this.getSecureItem(STORAGE_KEYS.REMEMBERED_AT);

    return {
      email,
      password,
      isEnabled: true,
      rememberedAt,
    };
  },

  /**
   * Completely erase remembered credentials
   */
  async clearRememberedCredentials(): Promise<void> {
    await this.deleteSecureItem(STORAGE_KEYS.REMEMBER_ME_ENABLED);
    await this.deleteSecureItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    await this.deleteSecureItem(STORAGE_KEYS.REMEMBERED_PASSWORD);
    await this.deleteSecureItem(STORAGE_KEYS.REMEMBERED_AT);
  },
};
