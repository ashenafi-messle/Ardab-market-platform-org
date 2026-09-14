// ==============================================================================
// Ardab Market - Admin Authentication Routes
// ==============================================================================

import { Router } from 'express';
import {
  login,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
  requestOtp,
  verifyOtp,
} from '../controllers/auth.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  authRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  otpRequestRateLimiter,
  otpVerifyRateLimiter,
} from '../../shared/middleware/rateLimit.middleware.js';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

/**
 * @route   POST /login
 * @desc    Shared administrative login for Super Admin and Sub Admin
 * @access  Public (Rate-limited)
 */
router.post('/login', authRateLimiter, validate({ body: loginSchema }), asyncHandler(login));

/**
 * @route   GET /me
 * @desc    Get currently authenticated admin profile
 * @access  Private (Admin)
 */
router.get('/me', adminAuthMiddleware, asyncHandler(getMe));

/**
 * @route   POST /logout
 * @desc    Log out current admin
 * @access  Private (Admin)
 */
router.post('/logout', adminAuthMiddleware, asyncHandler(logout));

/**
 * @route   POST /forgot-password
 * @desc    Initiate password reset via email token (Enumeration-safe)
 * @access  Public (Rate-limited)
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(forgotPassword)
);

/**
 * @route   POST /reset-password
 * @desc    Reset password using valid reset token
 * @access  Public (Rate-limited)
 */
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(resetPassword)
);

/**
 * @route   POST /request-otp
 * @desc    Request 6-digit OTP code via email (Enumeration-safe)
 * @access  Public (Rate-limited)
 */
router.post(
  '/request-otp',
  otpRequestRateLimiter,
  validate({ body: requestOtpSchema }),
  asyncHandler(requestOtp)
);

/**
 * @route   POST /verify-otp
 * @desc    Verify 6-digit OTP code
 * @access  Public (Rate-limited)
 */
router.post(
  '/verify-otp',
  otpVerifyRateLimiter,
  validate({ body: verifyOtpSchema }),
  asyncHandler(verifyOtp)
);

export default router;

