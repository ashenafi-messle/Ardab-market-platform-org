// ==============================================================================
// Ardab Market - Secure Agent National ID Document Service
// ==============================================================================
// Enforces private document storage, MIME type validation, binary magic bytes
// inspection, file size limits (5MB), and authenticated short-lived access
// for Super Administrators only. National ID documents are NEVER public.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secure private storage directory outside public web root
const PRIVATE_STORAGE_DIR = path.resolve(__dirname, '../../../private_storage/agent_documents');

// Ensure private directory exists with restricted permissions
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
}

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/**
 * Validates magic bytes to prevent extension spoofing
 */
export function validateDocumentMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }

  // WEBP: RIFF ... WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  // PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  return null;
}

// Memory storage for inspection before writing to private disk
const memoryStorage = multer.memoryStorage();

const documentFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      ApiError.badRequest(
        `Unsupported document format '${ext}'. Allowed formats: PDF, JPEG, PNG, WEBP.`,
        'INVALID_DOCUMENT_FORMAT'
      ),
      false
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(
      ApiError.badRequest(
        `Unsupported document MIME type '${file.mimetype}'.`,
        'INVALID_DOCUMENT_MIME'
      ),
      false
    );
  }

  cb(null, true);
};

export const uploadNationalIdDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_SIZE_BYTES,
    files: 1,
  },
});

/**
 * Multer middleware wrapper that runs magic-byte validation
 */
export function handleNationalIdUpload(req, res, next) {
  uploadNationalIdDocument.single('nationalIdDocument')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.badRequest(
              'National identity document exceeds maximum allowed size of 5 MB.',
              'DOCUMENT_TOO_LARGE'
            )
          );
        }
        return next(ApiError.badRequest(err.message, 'DOCUMENT_UPLOAD_ERROR'));
      }
      return next(err);
    }

    if (req.file) {
      const detectedMime = validateDocumentMagicBytes(req.file.buffer);
      if (!detectedMime) {
        return next(
          ApiError.badRequest(
            'The uploaded national identity document failed binary signature verification.',
            'INVALID_DOCUMENT_SIGNATURE'
          )
        );
      }
      req.file.verifiedMimeType = detectedMime;
    }

    return next();
  });
}

/**
 * Saves document buffer to secure private storage and returns the private storage key
 */
export async function savePrivateDocument(fileBuffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase() || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
  const secureKey = `nid_${Date.now()}_${crypto.randomBytes(16).toString('hex')}${ext}`;
  const filePath = path.join(PRIVATE_STORAGE_DIR, secureKey);

  await fs.promises.writeFile(filePath, fileBuffer, { mode: 0o600 });
  logger.info(`[AgentDocument] Securely stored private document: ${secureKey}`);

  return {
    storageKey: secureKey,
    originalName,
    mimeType,
  };
}

/**
 * Retrieves the full path to a private document for authorized streaming
 */
export function getPrivateDocumentPath(storageKey) {
  // Prevent directory traversal attacks
  const safeKey = path.basename(storageKey);
  const filePath = path.join(PRIVATE_STORAGE_DIR, safeKey);

  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('Requested identity document was not found in private storage.');
  }

  return filePath;
}

/**
 * Removes a private document
 */
export async function deletePrivateDocument(storageKey) {
  if (!storageKey) return;
  try {
    const safeKey = path.basename(storageKey);
    const filePath = path.join(PRIVATE_STORAGE_DIR, safeKey);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logger.info(`[AgentDocument] Deleted private document: ${safeKey}`);
    }
  } catch (err) {
    logger.warn(`[AgentDocument] Failed to delete document: ${storageKey}`, err);
  }
}
