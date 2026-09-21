'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import commonAm from '@/locales/am/common.json';
import commonEn from '@/locales/en/common.json';
import authAm from '@/locales/am/auth.json';
import authEn from '@/locales/en/auth.json';
import marketplaceAm from '@/locales/am/marketplace.json';
import marketplaceEn from '@/locales/en/marketplace.json';
import ordersAm from '@/locales/am/orders.json';
import ordersEn from '@/locales/en/orders.json';

export type SupportedLanguage = 'am' | 'en';

interface LanguageContextType {
  lang: SupportedLanguage;
  language: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultVal?: string) => string;
}

const translations: Record<SupportedLanguage, Record<string, any>> = {
  am: {
    common: commonAm,
    auth: authAm,
    marketplace: marketplaceAm,
    orders: ordersAm,
  },
  en: {
    common: commonEn,
    auth: authEn,
    marketplace: marketplaceEn,
    orders: ordersEn,
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Amharic is the PRIMARY DEFAULT customer language
  const [lang, setLangState] = useState<SupportedLanguage>('am');

  useEffect(() => {
    const saved = localStorage.getItem('ardab_customer_lang') as SupportedLanguage | null;
    if (saved === 'am' || saved === 'en') {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    localStorage.setItem('ardab_customer_lang', newLang);
    document.documentElement.lang = newLang;
  };

  // Clean human fallback dictionary to guarantee zero raw underscores in visible UI
  const flatFallbacks: Record<string, Record<string, string>> = {
    am: {
      sign_in: 'ይግቡ',
      sign_up: 'ይመዝገቡ',
      register: 'ይመዝገቡ',
      forgot_password: 'የይለፍ ቃል ረሱ?',
      reset_password: 'የይለፍ ቃል ይቀይሩ',
      email_or_phone: 'ኢሜይል ወይም ስልክ ቁጥር',
      email: 'ኢሜይል',
      phone: 'ስልክ ቁጥር',
      phone_number: 'ስልክ ቁጥር',
      city: 'ከተማ',
      password: 'የይለፍ ቃል',
      confirm_password: 'የይለፍ ቃል ማረጋገጫ',
      new_password: 'አዲስ የይለፍ ቃል',
      login: 'ይግቡ',
      login_title: 'ወደ አርዳብ ገበያ ይግቡ',
      login_subtitle: 'በኢሜይል ወይም በስልክ ቁጥርዎ በቀላሉ ይግቡ',
      register_title: 'በአርዳብ ገበያ ይመዝገቡ',
      register_subtitle: 'ትኩስ እና ጥራት ያላቸውን ምርቶች በቀጥታ ከሻጮች ይሸምቱ',
      register_button: 'ይመዝገቡ',
      sign_up_button: 'ይመዝገቡ',
      login_button: 'ይግቡ',
      dont_have_account: 'መለያ የለዎትም?',
      already_have_account: 'መለያ አለዎት?',
      register_here: 'ይመዝገቡ',
      sign_up_here: 'ይመዝገቡ',
      login_here: 'ይግቡ',
      forgot_password_link: 'የይለፍ ቃል ረሱ?',
      no_fullname_needed_hint: 'የሙሉ ስም ማስገባት አያስፈልግም፤ ከመለያ ኢሜይልዎ በቀጥታ ይወሰዳል።',
      shop_now: 'አሁን ይሸምቱ',
      explore_products: 'ምርቶችን ያስሱ',
      categories: 'ምድቦች',
      products: 'ምርቶች',
      featured_categories: 'ተወዳጅ ምድቦች',
      featured_products: 'ተወዳጅ ምርቶች',
      fast_delivery: 'ፈጣን ማድረሻ',
      quality_guarantee: 'የተረጋገጠ ጥራት',
      secure_payment: 'አስተማማኝ ክፍያ',
      view_all: 'ሁሉንም ይመልከቱ',
      shopping_cart: 'የግዢ ጋሪ',
      wishlist: 'የምኞት ዝርዝር',
      my_orders: 'ትዕዛዞቼ',
      my_account: 'መለያዬ',
      all_products: 'ሁሉም ምርቶች',
      filter_results: 'ምርቶችን አጣራ',
      reset_filters: 'ማጣሪያዎችን አጽዳ',
      clear_filters: 'ማጣሪያዎችን አጽዳ',
      all_categories: 'ሁሉም ምድቦች',
      price_range: 'የዋጋ ክልል',
      sort_by: 'አስተካክል በ',
      newest: 'አዳዲስ',
      price_low_high: 'ዋጋ፡ ከዝቅተኛ ወደ ከፍተኛ',
      price_high_low: 'ዋጋ፡ ከከፍተኛ ወደ ዝቅተኛ',
      no_products_found: 'ምንም ምርቶች አልተገኙም',
      in_stock: 'ክምችት አለ',
      out_of_stock: 'አልቋል',
      item_added_to_cart: 'ምርቱ ወደ ጋሪ ተጨምሯል',
      add_to_cart: 'ወደ ጋሪ ጨምር',
      buy_now: 'አሁን ይግዙ',
      customer_reviews: 'የደንበኞች አስተያየት',
      reviews_count: 'አስተያየቶች',
      write_review: 'አስተያየት ጻፍ',
      login_to_review: 'አስተያየት ለመጻፍ ይግቡ',
      no_reviews_yet: 'እስካሁን ምንም አስተያየት አልተሰጠም',
      your_comment: 'የእርስዎ አስተያየት',
      submitting: 'በመላክ ላይ...',
      submit_review: 'አስተያየት ላክ',
      order_not_found: 'ትዕዛዙ አልተገኘም',
      back_to_orders: 'ወደ ትዕዛዞች ተመለስ',
      wishlist_empty: 'የምኞት ዝርዝርዎ ባዶ ነው',
      wishlist_empty_subtitle: 'የወደዷቸውን ምርቶች እዚህ ለማስቀመጥ የልብ ቅርጹን ይጫኑ',
      discover_products: 'ምርቶችን ያስሱ',
      clear_wishlist: 'ዝርዝሩን አጽዳ',
      remove_item: 'አስወግድ',
      move_to_cart: 'ወደ ጋሪ ውሰድ',
      product_not_found: 'ምርቱ አልተገኘም',
      back_to_products: 'ወደ ምርቶች ተመለስ',
      review_submitted_success: 'አስተያየትዎ በተሳካ ሁኔታ ተልኳል',
      about: 'ስለ እኛ',
      about_us: 'ስለ አርዳብ ገበያ',
      specifications: 'የምርት ዝርዝር መረጃዎች',
      product_specifications: 'የምርት ዝርዝር መረጃዎች',
      product_details: 'የምርት ዝርዝር',
      weight: 'ክብደት',
      category: 'ምድብ',
      seller: 'ነጋዴ / አምራች',
      view_fullscreen: 'በትልቅ አሳይ',
      checkout: 'ማዘዣ እና ክፍያ',
      checkout_title: 'ማዘዣ እና ክፍያ',
      powered_by_ardab: 'በአርዳብ ቴክ ሶሉሽንስ አ.ማ. የበለፀገ',
      continue_with_saved_email: 'በተቀመጠ ኢሜይል ይቀጥሉ',
      continue_with_phone: 'በስልክ ቁጥር ይቀጥሉ',
      continue_with_google: 'በጉግል ይቀጥሉ',
      search: 'ፍለጋ',
      search_placeholder: 'ምርቶችን፣ ምድቦችን፣ ብራንዶችን ይፈልጉ...',
      welcome_back: 'እንኳን ደህና መጡ',
    },
    en: {
      sign_in: 'Sign In',
      sign_up: 'Sign Up',
      register: 'Sign Up',
      about: 'About',
      about_us: 'About Ardab Market',
      forgot_password: 'Forgot Password?',
      reset_password: 'Reset Password',
      email_or_phone: 'Email or Phone Number',
      email: 'Email',
      phone: 'Phone Number',
      phone_number: 'Phone Number',
      city: 'City',
      password: 'Password',
      confirm_password: 'Confirm Password',
      new_password: 'New Password',
      login: 'Sign In',
      login_title: 'Sign In to Ardab Market',
      login_subtitle: 'Enter your email or phone number to continue',
      register_title: 'Sign Up for Ardab Market',
      register_subtitle: 'Order fresh groceries and essentials directly from verified sellers',
      register_button: 'Sign Up',
      sign_up_button: 'Sign Up',
      login_button: 'Sign In',
      dont_have_account: "Don't have an account?",
      already_have_account: 'Already have an account?',
      register_here: 'Sign Up',
      sign_up_here: 'Sign Up',
      login_here: 'Sign In',
      forgot_password_link: 'Forgot Password?',
      no_fullname_needed_hint: 'No full name required; your display name is generated from your email.',
      shop_now: 'Shop Now',
      explore_products: 'Explore Products',
      categories: 'Categories',
      products: 'Products',
      featured_categories: 'Featured Categories',
      featured_products: 'Featured Products',
      fast_delivery: 'Fast Delivery',
      quality_guarantee: 'Quality Guarantee',
      secure_payment: 'Secure Payments',
      view_all: 'View All',
      shopping_cart: 'Shopping Cart',
      wishlist: 'Wishlist',
      my_orders: 'My Orders',
      my_account: 'My Account',
      all_products: 'All Products',
      filter_results: 'Filter Results',
      reset_filters: 'Reset Filters',
      clear_filters: 'Clear Filters',
      all_categories: 'All Categories',
      price_range: 'Price Range',
      sort_by: 'Sort By',
      newest: 'Newest',
      price_low_high: 'Price: Low to High',
      price_high_low: 'Price: High to Low',
      no_products_found: 'No products found',
      in_stock: 'In Stock',
      out_of_stock: 'Out of Stock',
      item_added_to_cart: 'Item added to cart',
      add_to_cart: 'Add to Cart',
      buy_now: 'Buy Now',
      customer_reviews: 'Customer Reviews',
      reviews_count: 'Reviews',
      write_review: 'Write a Review',
      login_to_review: 'Sign in to review',
      no_reviews_yet: 'No reviews yet',
      your_comment: 'Your Review',
      submitting: 'Submitting...',
      submit_review: 'Submit Review',
      order_not_found: 'Order not found',
      back_to_orders: 'Back to Orders',
      wishlist_empty: 'Your wishlist is empty',
      wishlist_empty_subtitle: 'Tap the heart icon on products to save them here',
      discover_products: 'Discover Products',
      clear_wishlist: 'Clear Wishlist',
      remove_item: 'Remove',
      move_to_cart: 'Move to Cart',
      product_not_found: 'Product not found',
      back_to_products: 'Back to Products',
      review_submitted_success: 'Your review was submitted successfully',
      specifications: 'Specifications',
      product_specifications: 'Product Specifications',
      product_details: 'Product Details',
      weight: 'Weight',
      category: 'Category',
      seller: 'Seller',
      view_fullscreen: 'View Full Screen',
      checkout: 'Checkout',
      checkout_title: 'Checkout',
      powered_by_ardab: 'Powered by Ardab Tech Solutions S.C.',
      continue_with_saved_email: 'Continue with saved email',
      continue_with_phone: 'Continue with Phone',
      continue_with_google: 'Continue with Google',
      search: 'Search',
      search_placeholder: 'Search products, categories, brands...',
      welcome_back: 'Welcome Back',
    },
  };

  const humanize = (str: string): string => {
    return str
      .replace(/[._]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  };

  const t = (key: string, defaultVal: string = ''): string => {
    // 1. Direct match in flat fallbacks
    if (flatFallbacks[lang]?.[key]) {
      return flatFallbacks[lang][key];
    }
    if (flatFallbacks['en']?.[key]) {
      return flatFallbacks['en'][key];
    }

    // 2. Nested dictionary lookup
    const parts = key.split('.');
    let current: any = translations[lang];
    let found = true;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && typeof current === 'string') {
      return current;
    }

    // Fallback to English dictionary
    let fallback: any = translations['en'];
    let fallbackFound = true;
    for (const fPart of parts) {
      if (fallback && typeof fallback === 'object' && fPart in fallback) {
        fallback = fallback[fPart];
      } else {
        fallbackFound = false;
        break;
      }
    }

    if (fallbackFound && typeof fallback === 'string') {
      return fallback;
    }

    // If defaultVal provided, return it; otherwise humanize key (guarantee no underscores)
    if (defaultVal) {
      return defaultVal;
    }

    return humanize(key);
  };


  return (
    <LanguageContext.Provider value={{ lang, language: lang, setLang, setLanguage: setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
