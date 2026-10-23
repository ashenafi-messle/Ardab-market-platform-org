// ==============================================================================
// Ardab Market - Centralized Application & Store Configuration
// ==============================================================================
// Centralized, typed metadata for official store listings, websites, and
// platform-specific distribution channels.
// ==============================================================================

export interface AppStoreListing {
  packageId?: string;
  bundleId?: string;
  appStoreId?: string | null;
  storeSchemeUrl?: string | null;
  storeWebUrl?: string | null;
  isPublished: boolean;
}

export interface AppConfiguration {
  appName: string;
  appNameAm: string;
  taglineEn: string;
  taglineAm: string;
  shareDescriptionEn: string;
  shareDescriptionAm: string;
  websiteUrl: string;
  supportEmail: string;
  telegramBotUrl: string;
  android: AppStoreListing;
  ios: AppStoreListing;
}

export const APP_CONFIG: AppConfiguration = {
  appName: 'Ardab Market',
  appNameAm: 'አርዳብ ገበያ',
  taglineEn: 'Quality and Trust, Delivered to Your Door!',
  taglineAm: 'ጥራትና ታማኝነት፣ እስከ ቤትዎ ድረስ!',
  shareDescriptionEn:
    'Shop authentic Ethiopian groceries, fashion, electronics, and daily essentials delivered directly to you with verified merchant quality.',
  shareDescriptionAm:
    'ጥራት ያላቸውን የሀገር ውስጥ እህሎች፣ ባህላዊ አልባሳት፣ ኤሌክትሮኒክስ እና የቤት ውስጥ ፍጆታዎችን በቀጥታ ከተረጋገጡ ነጋዴዎች በደጃፍዎ ማድረሻ ይዘዙ።',
  websiteUrl: 'https://customer-phi-wheat.vercel.app',
  supportEmail: 'support@ardabmarket.com',
  telegramBotUrl: 'https://t.me/Ardab_market_bot',

  android: {
    packageId: 'com.ashu2288.customer',
    storeSchemeUrl: 'market://details?id=com.ashu2288.customer',
    storeWebUrl: 'https://play.google.com/store/apps/details?id=com.ashu2288.customer',
    // Currently built via EAS internal/preview channel. Flip to true once published to Google Play Production track.
    isPublished: false,
  },

  ios: {
    bundleId: 'com.ashu2288.customer',
    appStoreId: null, // Numerical Apple App Store ID assigned upon App Store submission
    storeSchemeUrl: null,
    storeWebUrl: null,
    // Currently in development/preview. Flip to true once assigned an App Store ID.
    isPublished: false,
  },
};
