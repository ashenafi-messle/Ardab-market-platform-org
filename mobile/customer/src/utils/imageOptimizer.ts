// ==============================================================================
// Ardab Market - Mobile Image Optimization Utilities
// ==============================================================================
// Automatically optimizes Cloudinary and CDN image URLs:
// - Cloudinary: Injects f_auto, q_auto, w_<width>, c_limit transformations
// - Unsplash: Applies auto=format, q=80, w=<width>
// - Provides lightweight blurhash placeholder for smooth progressive loading
// ==============================================================================

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  crop?: 'fill' | 'limit' | 'fit';
}

/**
 * Standard blurhash placeholder for marketplace products
 */
export const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

/**
 * Transforms an image URL to a compressed, appropriately-dimensioned CDN version
 */
export function getOptimizedImageUrl(
  originalUrl?: string | null,
  options: ImageOptimizationOptions = {}
): string {
  if (!originalUrl) {
    return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
  }

  const {
    width = 400,
    quality = 80,
    format = 'auto',
    crop = 'limit',
  } = options;

  try {
    // 1. Cloudinary CDN Transformation
    // Pattern: https://res.cloudinary.com/<cloud>/image/upload/(v<version>/)<public_id>.<ext>
    if (originalUrl.includes('res.cloudinary.com') && originalUrl.includes('/upload/')) {
      const uploadIndex = originalUrl.indexOf('/upload/');
      const prefix = originalUrl.substring(0, uploadIndex + 8); // includes '/upload/'
      const suffix = originalUrl.substring(uploadIndex + 8);

      // Avoid double transformations if already present
      if (!suffix.startsWith('f_') && !suffix.startsWith('w_') && !suffix.startsWith('c_')) {
        const transforms = [
          `f_${format}`,
          'q_auto:eco',
          `w_${Math.round(width)}`,
          `c_${crop}`,
        ].join(',');

        return `${prefix}${transforms}/${suffix}`;
      }
    }

    // 2. Unsplash Image Optimization
    if (originalUrl.includes('images.unsplash.com')) {
      const url = new URL(originalUrl);
      url.searchParams.set('auto', 'format');
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('w', String(Math.round(width)));
      url.searchParams.set('q', String(quality));
      return url.toString();
    }
  } catch {
    // Return original url if parsing fails
  }

  return originalUrl;
}

/**
 * Presets for common UI components
 */
export const ImagePresets = {
  // Product card in 2-column grid or carousels (360px display width)
  thumbnail: (url?: string | null) => getOptimizedImageUrl(url, { width: 360, crop: 'limit' }),
  // Horizontal list cards (200px width)
  miniThumbnail: (url?: string | null) => getOptimizedImageUrl(url, { width: 220, crop: 'limit' }),
  // Full-width product details gallery (720px width)
  detail: (url?: string | null) => getOptimizedImageUrl(url, { width: 720, crop: 'limit' }),
  // Category circular icons or thumbnails (160px width)
  category: (url?: string | null) => getOptimizedImageUrl(url, { width: 160, crop: 'limit' }),
  // Hero promotional banners (800px width)
  heroBanner: (url?: string | null) => getOptimizedImageUrl(url, { width: 800, crop: 'limit' }),
};
