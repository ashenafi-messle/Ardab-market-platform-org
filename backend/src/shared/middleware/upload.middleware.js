// ==============================================================================
// Ardab Market - Secure Multipart Upload & Image Validation Middleware
// ==============================================================================

import multer from 'multer';
import path from 'path';
import { ApiError } from '../utils/apiResponse.js';

// Configuration constants
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per image
const MAX_FILES_COUNT = 10;
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Validate binary file magic bytes to prevent file extension spoofing
 */
export function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (isJpeg) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return 'image/png';

  // WEBP: starts with "RIFF" (bytes 0-3) and contains "WEBP" at (bytes 8-11)
  const isWebp =
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50;
  if (isWebp) return 'image/webp';

  return null;
}

// Multer memory storage for direct Cloudinary stream upload without disk persistence
const storage = multer.memoryStorage();

// Multer file filter for extension and MIME type pre-check
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      ApiError.badRequest(
        `Unsupported file type '${ext}'. Allowed types: JPEG, JPG, PNG, WEBP`,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(
      ApiError.badRequest(
        `Invalid MIME type '${file.mimetype}'. Allowed types: image/jpeg, image/png, image/webp`,
        'INVALID_MIME_TYPE'
      ),
      false
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: MAX_FILES_COUNT,
  },
});

/**
 * Middleware to handle Multer upload errors cleanly according to Ardab API standards
 */
export function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) {
        // Deep validate magic bytes for all received files in memory
        const files = req.files
          ? Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat()
          : req.file
          ? [req.file]
          : [];

        for (const file of files) {
          const detectedMime = validateImageMagicBytes(file.buffer);
          if (!detectedMime) {
            return next(
              ApiError.badRequest(
                `File '${file.originalname}' has invalid or spoofed image binary signature.`,
                'INVALID_IMAGE_SIGNATURE'
              )
            );
          }
        }
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.badRequest(
              `Image size exceeds maximum allowed limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)} MB`,
              'FILE_TOO_LARGE'
            )
          );
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(
            ApiError.badRequest(
              `Maximum of ${MAX_FILES_COUNT} images can be uploaded simultaneously`,
              'TOO_MANY_FILES'
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            ApiError.badRequest(
              `Unexpected field '${err.field}' in upload request`,
              'UNEXPECTED_FILE_FIELD'
            )
          );
        }
        return next(ApiError.badRequest(err.message, 'UPLOAD_ERROR'));
      }

      return next(err);
    });
  };
}

// Pre-configured middlewares for routes
export const uploadProductImages = handleUpload(upload.array('images', MAX_FILES_COUNT));
export const uploadSingleProductImage = handleUpload(upload.single('image'));
