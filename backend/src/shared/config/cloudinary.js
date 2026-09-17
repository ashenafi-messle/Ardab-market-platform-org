// ==============================================================================
// Ardab Market - Centralized Cloudinary Configuration
// ==============================================================================

import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Configure Cloudinary SDK centrally
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info('Cloudinary initialized securely', {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: env.CLOUDINARY_FOLDER,
  });
} else {
  logger.warn('Cloudinary environment variables missing. Cloudinary service will operate in mock/unconfigured mode.');
}

export { cloudinary };
export default cloudinary;
