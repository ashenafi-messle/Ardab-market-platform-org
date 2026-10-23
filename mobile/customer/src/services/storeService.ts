// ==============================================================================
// Ardab Market - Store & Rating Link Service
// ==============================================================================
// Handles platform-specific store navigation for customer reviews and app ratings.
// Gracefully manages published vs. pre-release/preview environments.
// ==============================================================================

import { Platform, Linking } from 'react-native';
import { APP_CONFIG } from '@/config/appConfig';

export interface RateAppResult {
  opened: boolean;
  action: 'store_opened' | 'preview_notice' | 'web_opened' | 'failed';
  error?: string;
}

/**
 * Attempts to launch the platform's official store review destination.
 * If the application is in pre-release/preview mode or store app is unavailable,
 * reports a graceful status allowing the UI to present the informative modal.
 */
export async function openStoreRating(): Promise<RateAppResult> {
  try {
    if (Platform.OS === 'android') {
      const { isPublished, storeSchemeUrl, storeWebUrl } = APP_CONFIG.android;

      // If published to Google Play, launch store or fallback to web
      if (isPublished && storeSchemeUrl) {
        const canOpenScheme = await Linking.canOpenURL(storeSchemeUrl).catch(() => false);
        if (canOpenScheme) {
          await Linking.openURL(storeSchemeUrl);
          return { opened: true, action: 'store_opened' };
        }

        if (storeWebUrl) {
          const canOpenWeb = await Linking.canOpenURL(storeWebUrl).catch(() => false);
          if (canOpenWeb) {
            await Linking.openURL(storeWebUrl);
            return { opened: true, action: 'web_opened' };
          }
        }
      }

      // App is currently in preview/internal distribution
      return {
        opened: false,
        action: 'preview_notice',
      };
    }

    if (Platform.OS === 'ios') {
      const { isPublished, storeSchemeUrl, storeWebUrl } = APP_CONFIG.ios;

      if (isPublished && storeSchemeUrl) {
        const canOpenScheme = await Linking.canOpenURL(storeSchemeUrl).catch(() => false);
        if (canOpenScheme) {
          await Linking.openURL(storeSchemeUrl);
          return { opened: true, action: 'store_opened' };
        }

        if (storeWebUrl) {
          const canOpenWeb = await Linking.canOpenURL(storeWebUrl).catch(() => false);
          if (canOpenWeb) {
            await Linking.openURL(storeWebUrl);
            return { opened: true, action: 'web_opened' };
          }
        }
      }

      // iOS listing not published yet
      return {
        opened: false,
        action: 'preview_notice',
      };
    }

    // Web / Other platform: fallback to official website
    if (APP_CONFIG.websiteUrl) {
      await Linking.openURL(APP_CONFIG.websiteUrl);
      return { opened: true, action: 'web_opened' };
    }

    return { opened: false, action: 'failed', error: 'Unsupported platform' };
  } catch (error: any) {
    return {
      opened: false,
      action: 'failed',
      error: error?.message || 'Failed to open store review link',
    };
  }
}

/**
 * Opens official Ardab Market website or verified web portal
 */
export async function openOfficialWebsite(): Promise<boolean> {
  try {
    const url = APP_CONFIG.websiteUrl;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
