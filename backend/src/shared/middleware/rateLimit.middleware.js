// ==============================================================================
// Ardab Market - Rate Limiting Middleware
// ==============================================================================

import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Standard rate limiter for general API endpoints
 */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'TOO_MANY_REQUESTS',
      'Too many requests from this IP, please try again later.',
      429
    );
  },
});

/**
 * Strict rate limiter for authentication endpoints (login)
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'TOO_MANY_AUTH_ATTEMPTS',
      'Too many authentication attempts. Please wait before trying again.',
      429
    );
  },
});

/**
 * Rate limiter for forgot password requests (prevents email spam / enumeration sweeps)
 */
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'TOO_MANY_FORGOT_PASSWORD_REQUESTS',
      'Too many password reset requests. Please wait before requesting another email.',
      429
    );
  },
});

/**
 * Rate limiter for password reset execution
 */
export const resetPasswordRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'TOO_MANY_RESET_ATTEMPTS',
      'Too many password reset attempts. Please wait before trying again.',
      429
    );
  },
});

/**
 * Rate limiter for OTP code requests
 */
export const otpRequestRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'TOO_MANY_OTP_REQUESTS',
      'Too many OTP code requests. Please wait before requesting a new code.',
      429
    );
  },
});

/**
 * Rate limiter for OTP verification attempts
 */
export const otpVerifyRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return ApiResponse.error(
      res,
      'TOO_MANY_OTP_VERIFICATIONS',
      'Too many OTP verification attempts. Please wait before trying again.',
      429
    );
  },
});

