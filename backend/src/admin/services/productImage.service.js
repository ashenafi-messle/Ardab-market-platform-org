// ==============================================================================
// Ardab Market - Product Image & Cloudinary Media Service
// ==============================================================================

import { Readable } from 'node:stream';
import { cloudinary } from '../../shared/config/cloudinary.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { ApiError } from '../../shared/utils/apiResponse.js';

/**
 * Upload single image buffer to Cloudinary via upload stream
 *
 * @param {Buffer} buffer - File binary buffer from memory
 * @param {Object} options - Upload options (folder, productId, isPrimary, etc.)
 * @returns {Promise<Object>} Upload metadata (url, publicId, width, height, format, bytes)
 */
export async function uploadImageToStorage(buffer, options = {}) {
  // If in test environment or Cloudinary is unconfigured, return mock result for deterministic offline testing
  if (env.IS_TEST || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    const mockId = `ardab_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return {
      url: `https://res.cloudinary.com/ardab-market/image/upload/v1/ardab-market/products/${mockId}.jpg`,
      publicId: `${env.CLOUDINARY_FOLDER || 'ardab-market/products'}/${mockId}`,
      width: 1200,
      height: 900,
      format: 'jpg',
      bytes: buffer ? buffer.length : 102400,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || env.CLOUDINARY_FOLDER || 'ardab-market/products',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload failure', {
            operation: 'uploadImageToStorage',
            errorMessage: error.message,
            errorCode: error.http_code,
          });
          return reject(
            ApiError.internal(
              'Failed to process and store product image on cloud storage.',
              'IMAGE_UPLOAD_FAILED'
            )
          );
        }

        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    // Stream the buffer to Cloudinary uploader using native Readable
    if (buffer) {
      Readable.from(buffer).pipe(uploadStream);
    } else {
      reject(ApiError.badRequest('No image buffer provided for upload.'));
    }
  });
}


/**
 * Delete image asset from Cloudinary by public ID
 *
 * @param {string} publicId - Cloudinary asset identifier
 * @returns {Promise<boolean>} True if deleted or already absent
 */
export async function deleteImageFromStorage(publicId) {
  if (!publicId) return false;

  // Mock in test mode or unconfigured mode
  if (env.IS_TEST || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.info('Mock image deletion from storage', { publicId });
    return true;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });

    logger.info('Cloudinary image deleted', {
      publicId,
      result: result.result,
    });

    return result.result === 'ok' || result.result === 'not found';
  } catch (error) {
    logger.error('Cloudinary deletion failed', {
      publicId,
      errorMessage: error.message,
    });
    // Log failure without crashing callers, return false for compensating record
    return false;
  }
}

/**
 * Compensating transaction cleanup: delete an array of uploaded Cloudinary public IDs
 * Used when a PostgreSQL database operation fails after images were already uploaded.
 *
 * @param {string[]} publicIds - Array of public IDs to clean up
 */
export async function cleanupUploadedImages(publicIds = []) {
  if (!Array.isArray(publicIds) || publicIds.length === 0) return;

  logger.info('Starting compensating cleanup for orphaned Cloudinary assets', {
    count: publicIds.length,
    publicIds,
  });

  const cleanupPromises = publicIds.map(async (publicId) => {
    try {
      await deleteImageFromStorage(publicId);
    } catch (err) {
      logger.error('Failed to cleanup orphaned Cloudinary asset during compensation', {
        publicId,
        errorMessage: err.message,
      });
    }
  });

  await Promise.allSettled(cleanupPromises);
}

/**
 * Generate optimized Cloudinary delivery URLs for thumbnails or product cards
 *
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transformation options
 * @returns {string} Optimized URL
 */
export function generateDeliveryUrl(publicId, options = {}) {
  if (!publicId) return '';

  const { width = 300, height = 300, crop = 'fill', format = 'auto', quality = 'auto' } = options;

  if (env.IS_TEST || !env.CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/ardab-market/image/upload/c_${crop},w_${width},h_${height},q_${quality},f_${format}/${publicId}`;
  }

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    fetch_format: format,
    secure: true,
  });
}
