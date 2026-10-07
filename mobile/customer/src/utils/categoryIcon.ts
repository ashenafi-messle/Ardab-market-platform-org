// ==============================================================================
// Ardab Market - Category Icon Mapper Utility
// ==============================================================================
// Safely maps raw database / Bootstrap icons (e.g. `bi-droplet-half`, `bi-tag`)
// to guaranteed valid Ionicons names, preventing invalid icon name runtime warnings.
// ==============================================================================

import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

const BOOTSTRAP_TO_IONICONS_MAP: Record<string, IoniconName> = {
  // Common database icons configured in Ardab Market Admin
  'bi-tag': 'pricetag-outline',
  'bi-tags': 'pricetags-outline',
  'bi-phone': 'phone-portrait-outline',
  'bi-phone-fill': 'phone-portrait',
  'bi-droplet': 'water-outline',
  'bi-droplet-half': 'water-outline',
  'bi-droplet-fill': 'water',
  'bi-box-seam': 'cube-outline',
  'bi-box': 'cube-outline',
  'bi-boxes': 'grid-outline',
  'bi-cup-hot': 'cafe-outline',
  'bi-cup': 'cafe-outline',
  'bi-house-door': 'home-outline',
  'bi-house': 'home-outline',
  'bi-laptop': 'laptop-outline',
  'bi-display': 'tv-outline',
  'bi-tv': 'tv-outline',
  'bi-cart': 'cart-outline',
  'bi-cart3': 'cart-outline',
  'bi-bag': 'bag-handle-outline',
  'bi-bag-check': 'bag-check-outline',
  'bi-basket': 'basket-outline',
  'bi-basket2': 'basket-outline',
  'bi-basket3': 'basket-outline',
  'bi-heart': 'heart-outline',
  'bi-star': 'star-outline',
  'bi-camera': 'camera-outline',
  'bi-book': 'book-outline',
  'bi-car': 'car-outline',
  'bi-truck': 'bus-outline',
  'bi-gear': 'settings-outline',
  'bi-tools': 'construct-outline',
  'bi-gift': 'gift-outline',
  'bi-flower': 'flower-outline',
  'bi-flower1': 'flower-outline',
  'bi-flower2': 'flower-outline',
  'bi-person': 'person-outline',
  'bi-people': 'people-outline',
  'bi-shield': 'shield-outline',
  'bi-shield-check': 'shield-checkmark-outline',
  'bi-gem': 'diamond-outline',
  'bi-lightning': 'flash-outline',
  'bi-lightning-charge': 'flash-outline',
  'bi-fire': 'flame-outline',
  'bi-watch': 'watch-outline',
  'bi-controller': 'game-controller-outline',
  'bi-headphones': 'headset-outline',
  'bi-image': 'image-outline',
  'bi-images': 'images-outline',
  'bi-mic': 'mic-outline',
  'bi-music-note': 'musical-notes-outline',
  'bi-palette': 'color-palette-outline',
  'bi-brush': 'brush-outline',
  'bi-newspaper': 'newspaper-outline',
  'bi-medkit': 'medkit-outline',
  'bi-capsule': 'medkit-outline',
  'bi-hospital': 'business-outline',
  'bi-sun': 'sunny-outline',
  'bi-moon': 'moon-outline',
  'bi-key': 'key-outline',
  'bi-lock': 'lock-closed-outline',
  'bi-unlock': 'lock-open-outline',
  'bi-map': 'map-outline',
  'bi-pin': 'pin-outline',
  'bi-geo-alt': 'location-outline',
  'bi-folder': 'folder-outline',
  'bi-folder2': 'folder-outline',
  'bi-grid': 'grid-outline',
  'bi-list': 'list-outline',
  'bi-check': 'checkmark-outline',
  'bi-x': 'close-outline',
};

/**
 * Maps raw icon strings (like Bootstrap `bi-*` or arbitrary backend values)
 * safely to a guaranteed valid Ionicons name, preventing invalid icon warnings.
 */
export function resolveCategoryIcon(
  rawIcon?: string | null,
  fallback: IoniconName = 'grid-outline'
): IoniconName {
  if (!rawIcon || typeof rawIcon !== 'string') {
    return fallback;
  }

  const trimmed = rawIcon.trim().toLowerCase();

  // 1. Direct bootstrap / admin mapping
  if (BOOTSTRAP_TO_IONICONS_MAP[trimmed]) {
    return BOOTSTRAP_TO_IONICONS_MAP[trimmed];
  }

  // 2. If it starts with 'bi-', strip and check
  if (trimmed.startsWith('bi-')) {
    const stripped = trimmed.replace('bi-', '');
    if (BOOTSTRAP_TO_IONICONS_MAP[`bi-${stripped}`]) {
      return BOOTSTRAP_TO_IONICONS_MAP[`bi-${stripped}`];
    }
    // Any remaining bi-* is definitely not an ionicon, use fallback
    return fallback;
  }

  // 3. If it looks like a valid icon name without prefixes
  if (/^[a-z0-9-]+$/.test(trimmed)) {
    return trimmed as IoniconName;
  }

  return fallback;
}
