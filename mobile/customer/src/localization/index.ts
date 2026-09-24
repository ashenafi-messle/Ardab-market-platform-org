import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en, TranslationKey } from './en';
import { am } from './am';

export type Language = 'en' | 'am';

export const LANGUAGE_STORAGE_KEY = '@ardab_market_language';

let currentLanguage: Language = 'en';
let isInitialized = false;
const listeners = new Set<(lang: Language) => void>();

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  am,
};

/**
 * Translate a key into the active language with optional parameter substitution.
 */
export const t = (key: TranslationKey | string, params?: Record<string, string | number>): string => {
  const dict = translations[currentLanguage] || translations.en;
  let text = (dict as any)[key] || (translations.en as any)[key] || key;

  if (params && typeof text === 'string') {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    });
  }

  return text;
};

/**
 * Get currently active language.
 */
export const getLanguage = (): Language => currentLanguage;

/**
 * Initialize language from persistent storage.
 * Defaults strictly to 'en' if not previously selected.
 */
export const initLanguage = async (): Promise<Language> => {
  if (isInitialized) return currentLanguage;
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'am') {
      currentLanguage = saved;
    } else {
      currentLanguage = 'en'; // Strict default
    }
  } catch {
    currentLanguage = 'en';
  } finally {
    isInitialized = true;
    listeners.forEach((fn) => fn(currentLanguage));
  }
  return currentLanguage;
};

/**
 * Set and persist selected language.
 */
export const setLanguage = async (lang: Language): Promise<void> => {
  currentLanguage = lang;
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (err) {
    console.warn('Failed to save language preference:', err);
  }
  listeners.forEach((fn) => fn(lang));
};

/**
 * Subscribe to language change events.
 */
export const subscribeLanguage = (listener: (lang: Language) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * React hook to access language and translation reactively.
 * Components using useLanguage() will automatically re-render immediately when language changes.
 */
export const useLanguage = () => {
  const [lang, setLang] = useState<Language>(currentLanguage);

  useEffect(() => {
    const unsubscribe = subscribeLanguage((newLang) => {
      setLang(newLang);
    });
    return unsubscribe;
  }, []);

  const change = useCallback((newLang: Language) => {
    setLanguage(newLang);
  }, []);

  return {
    language: lang,
    setLanguage: change,
    changeLanguage: change,
    t: (key: TranslationKey | string, params?: Record<string, string | number>) => t(key, params),
    formatPrice,
  };
};

/**
 * Format currency with localized currency symbol/text.
 */
export const formatPrice = (amount: number, customCurrency?: string): string => {
  const currency = customCurrency || t('common.currency');
  return `${amount.toLocaleString()} ${currency}`;
};

/**
 * Map API error responses or codes to localized customer-friendly text.
 */
export const mapApiError = (error: any): string => {
  if (!error) return t('errors.general');
  const code = typeof error === 'string' ? error : error?.code || error?.message || '';

  if (/network|offline|econnrefused|failed to fetch/i.test(code)) {
    return t('errors.network');
  }
  if (/500|internal|server/i.test(code)) {
    return t('errors.server');
  }
  if (/401|unauthorized|session|token/i.test(code)) {
    return t('errors.unauthorized');
  }
  if (/credentials|password|email.*exist|user.*not.*found/i.test(code)) {
    return t('errors.invalidCredentials');
  }
  if (/not.*found|404/i.test(code)) {
    return t('errors.productNotFound');
  }
  return t('errors.general');
};

export { en, am };
export type { TranslationKey };
