// ==============================================================================
// Ardab Market - Cryptographic Security Utilities
// ==============================================================================

import crypto from 'crypto';

/**
 * Generates a SHA-256 hash of a string (tokens, OTPs, session keys)
 * Ensures raw secrets are never persisted in the database.
 * @param {string} input Plaintext secret
 * @returns {string} SHA-256 hex string
 */
export function hashToken(input) {
  if (!input) return '';
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generates a cryptographically secure random reset token
 * @returns {string} 64-character hex string
 */
export function generateRandomToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code
 * @returns {string} 6-digit code string
 */
export function generateNumericOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Performs timing-safe comparison of two hash strings
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
