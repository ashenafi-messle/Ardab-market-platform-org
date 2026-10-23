// ==============================================================================
// Ardab Market - Share Application Service
// ==============================================================================
// Opens native Android/iOS share sheet with curated, localized app details.
// Adheres to strict privacy: zero customer or session data is ever included.
// ==============================================================================

import { Share, Platform } from 'react-native';
import { APP_CONFIG } from '@/config/appConfig';

export interface ShareAppOptions {
  language?: 'en' | 'am';
}

export interface ShareResult {
  success: boolean;
  dismissed?: boolean;
  error?: string;
}

/**
 * Builds the official share message based on language and platform availability
 */
export function buildShareMessage(language: 'en' | 'am' = 'en'): {
  title: string;
  message: string;
  url?: string;
} {
  const isAmharic = language === 'am';
  const appName = isAmharic ? APP_CONFIG.appNameAm : APP_CONFIG.appName;
  const tagline = isAmharic ? APP_CONFIG.taglineAm : APP_CONFIG.taglineEn;
  const description = isAmharic
    ? APP_CONFIG.shareDescriptionAm
    : APP_CONFIG.shareDescriptionEn;

  // Determine official download or website link
  let storeOrWebLink = APP_CONFIG.websiteUrl;
  if (Platform.OS === 'android' && APP_CONFIG.android.isPublished && APP_CONFIG.android.storeWebUrl) {
    storeOrWebLink = APP_CONFIG.android.storeWebUrl;
  } else if (Platform.OS === 'ios' && APP_CONFIG.ios.isPublished && APP_CONFIG.ios.storeWebUrl) {
    storeOrWebLink = APP_CONFIG.ios.storeWebUrl;
  }

  const callToAction = isAmharic
    ? `መተግበሪያውን ያውርዱ እና ይሸምቱ፦ ${storeOrWebLink}`
    : `Download the app and start shopping: ${storeOrWebLink}`;

  const message = `${appName} — ${tagline}\n\n${description}\n\n${callToAction}`;

  return {
    title: `${appName} — ${tagline}`,
    message,
    // On iOS, passing url separately allows the share sheet to attach the rich link preview
    url: Platform.OS === 'ios' ? storeOrWebLink : undefined,
  };
}

/**
 * Triggers native system share sheet.
 * Non-blocking, failsafe, and never leaks personal information.
 */
export async function shareApp(options: ShareAppOptions = {}): Promise<ShareResult> {
  try {
    const { title, message, url } = buildShareMessage(options.language);

    const shareContent = Platform.select({
      ios: {
        title,
        message,
        url,
      },
      default: {
        title,
        message,
      },
    });

    const result = await Share.share(shareContent, {
      dialogTitle: title,
      subject: title,
    });

    if (result.action === Share.sharedAction) {
      return { success: true };
    } else if (result.action === Share.dismissedAction) {
      // User cancelled share sheet on iOS
      return { success: true, dismissed: true };
    }

    return { success: true };
  } catch (error: any) {
    // Graceful error capture without crashing the application
    return {
      success: false,
      error: error?.message || 'Unable to open share sheet',
    };
  }
}
