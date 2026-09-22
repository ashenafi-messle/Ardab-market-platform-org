// ==============================================================================
// Ardab Market - Cloudinary Image Optimization Helper
// ==============================================================================
// Injects responsive downscaling (e.g. w_400 for cards, w_800 for hero details),
// automatic format negotiation (f_auto -> WebP/AVIF), and perceptual compression
// (q_auto). Reduces image payload from ~2-5MB to ~25-45KB per product card.

interface ImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'thumb' | 'fit';
  quality?: string;
  fallback?: string;
}

export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string {
  const { width = 400, height, crop = 'limit', quality = 'auto', fallback = '/placeholder.png' } = options;

  if (!url || typeof url !== 'string' || url.trim() === '') {
    return fallback;
  }

  const cleanUrl = url.trim();

  // Non-Cloudinary URLs or local assets are returned as-is
  if (!cleanUrl.includes('res.cloudinary.com') || !cleanUrl.includes('/image/upload/')) {
    return cleanUrl;
  }

  // Already transformed URL guard
  if (cleanUrl.includes('/f_auto,q_auto') || cleanUrl.includes('/q_auto,f_auto')) {
    return cleanUrl;
  }

  const transformParams = [
    'f_auto',
    `q_${quality}`,
    `w_${width}`,
    `c_${crop}`,
    height ? `h_${height}` : '',
  ]
    .filter(Boolean)
    .join(',');

  // Replace '/image/upload/' with '/image/upload/<transformParams>/'
  return cleanUrl.replace('/image/upload/', `/image/upload/${transformParams}/`);
}
