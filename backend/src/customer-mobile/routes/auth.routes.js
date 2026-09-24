// ==============================================================================
// Ardab Market - Customer Mobile Authentication Routes
// ==============================================================================

import { Router } from 'express';
import {
  startEmailRegistrationHandler,
  verifyEmailRegistrationHandler,
  startTelegramRegistrationHandler,
  verifyTelegramRegistrationHandler,
  setPasswordHandler,
  loginHandler,
  refreshTokenHandler,
  logoutHandler,
  getMeHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controllers/auth.controller.js';
import { mobileAuthMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  requestEmailOtpSchema,
  verifyEmailOtpSchema,
  requestTelegramOtpSchema,
  verifyTelegramOtpSchema,
  setPasswordSchema,
  mobileLoginSchema,
  mobileRefreshSchema,
  forgotPasswordOtpSchema,
  resetPasswordOtpSchema,
} from '../validators/auth.validator.js';
import {
  authRateLimiter,
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
} from '../../shared/middleware/rateLimit.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// ------------------------------------------------------------------------------
// Registration Flows (Email & Telegram)
// ------------------------------------------------------------------------------

/**
 * @route   POST /api/customer-mobile/auth/register/email/start
 * @desc    Validate input, check email uniqueness, generate & send 6-digit OTP
 * @access  Public
 */
router.post(
  '/register/email/start',
  otpRequestRateLimiter,
  validate({ body: requestEmailOtpSchema }),
  asyncHandler(startEmailRegistrationHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/register/email/verify
 * @desc    Verify 6-digit email OTP and issue single-use verification ticket
 * @access  Public
 */
router.post(
  '/register/email/verify',
  otpVerifyRateLimiter,
  validate({ body: verifyEmailOtpSchema }),
  asyncHandler(verifyEmailRegistrationHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/register/telegram/start
 * @desc    Validate input, check phone uniqueness, dispatch Telegram OTP via bot
 * @access  Public
 */
router.post(
  '/register/telegram/start',
  otpRequestRateLimiter,
  validate({ body: requestTelegramOtpSchema }),
  asyncHandler(startTelegramRegistrationHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/register/telegram/verify
 * @desc    Verify 6-digit Telegram OTP and issue single-use verification ticket
 * @access  Public
 */
router.post(
  '/register/telegram/verify',
  otpVerifyRateLimiter,
  validate({ body: verifyTelegramOtpSchema }),
  asyncHandler(verifyTelegramRegistrationHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/register/set-password
 * @desc    Validate password, create Customer record, issue mobile session
 * @access  Public
 */
router.post(
  '/register/set-password',
  authRateLimiter,
  validate({ body: setPasswordSchema }),
  asyncHandler(setPasswordHandler)
);

// ------------------------------------------------------------------------------
// Authentication & Session
// ------------------------------------------------------------------------------

/**
 * @route   POST /api/customer-mobile/auth/login
 * @desc    Sign in customer using Email OR Phone + Password
 * @access  Public
 */
router.post(
  '/login',
  authRateLimiter,
  validate({ body: mobileLoginSchema }),
  asyncHandler(loginHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/refresh
 * @desc    Issue new access token with rotated refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  validate({ body: mobileRefreshSchema }),
  asyncHandler(refreshTokenHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/logout
 * @desc    Revoke mobile refresh session in database
 * @access  Public
 */
router.post(
  '/logout',
  asyncHandler(logoutHandler)
);

/**
 * @route   GET /api/customer-mobile/auth/me
 * @desc    Return authenticated customer profile
 * @access  Private (Mobile Bearer Token)
 */
router.get(
  '/me',
  mobileAuthMiddleware,
  asyncHandler(getMeHandler)
);

// ------------------------------------------------------------------------------
// Password Reset
// ------------------------------------------------------------------------------

/**
 * @route   POST /api/customer-mobile/auth/forgot-password
 * @desc    Send 6-digit password reset OTP
 * @access  Public
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate({ body: forgotPasswordOtpSchema }),
  asyncHandler(forgotPasswordHandler)
);

/**
 * @route   POST /api/customer-mobile/auth/reset-password
 * @desc    Verify OTP and update password
 * @access  Public
 */
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  validate({ body: resetPasswordOtpSchema }),
  asyncHandler(resetPasswordHandler)
);

// ------------------------------------------------------------------------------
// Backward Compatibility Route Aliases
// (Matches previous endpoints called by mobile client during transition)
// ------------------------------------------------------------------------------
router.post(
  '/request-email-otp',
  otpRequestRateLimiter,
  validate({ body: requestEmailOtpSchema }),
  asyncHandler(startEmailRegistrationHandler)
);

router.post(
  '/verify-email-otp',
  otpVerifyRateLimiter,
  validate({ body: verifyEmailOtpSchema }),
  asyncHandler(verifyEmailRegistrationHandler)
);

router.post(
  '/request-telegram-otp',
  otpRequestRateLimiter,
  validate({ body: requestTelegramOtpSchema }),
  asyncHandler(startTelegramRegistrationHandler)
);

router.post(
  '/verify-telegram-otp',
  otpVerifyRateLimiter,
  validate({ body: verifyTelegramOtpSchema }),
  asyncHandler(verifyTelegramRegistrationHandler)
);

router.post(
  '/complete-registration',
  authRateLimiter,
  validate({ body: setPasswordSchema }),
  asyncHandler(setPasswordHandler)
);

export default router;
