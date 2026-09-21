// ==============================================================================
// Ardab Market - Customer Mobile & Web Authentication Routes
// ==============================================================================

import { Router } from 'express';
import {
  registerCustomerHandler,
  resendVerificationHandler,
  verifyEmailHandler,
  setPasswordHandler,
  loginCustomerHandler,
  loginWithGoogleHandler,
  getCurrentCustomerHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from '../controllers/auth.controller.js';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { customerRegistrationSchema } from '../../admin/validators/customer.validator.js';
import {
  authRateLimiter,
  emailVerificationRateLimiter,
  resendVerificationRateLimiter,
} from '../../shared/middleware/rateLimit.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

/**
 * @route   POST /api/customer/auth/register
 * @desc    Register a new customer account (Email, Phone, City) - Creates pending registration
 * @access  Public
 */
router.post(
  '/register',
  validate({ body: customerRegistrationSchema }),
  asyncHandler(registerCustomerHandler)
);

/**
 * @route   POST /api/customer/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  asyncHandler(resendVerificationHandler)
);

/**
 * @route   POST /api/customer/auth/verify-email
 * @desc    Verify customer email address via token link and create permanent customer
 * @access  Public
 */
router.post(
  '/verify-email',
  emailVerificationRateLimiter,
  asyncHandler(verifyEmailHandler)
);

/**
 * @route   POST /api/customer/auth/set-password
 * @desc    Set customer password and automatically authenticate
 * @access  Public
 */
router.post(
  '/set-password',
  asyncHandler(setPasswordHandler)
);

/**
 * @route   POST /api/customer/auth/login
 * @desc    Authenticate customer using Email OR Phone + Password
 * @access  Public
 */
router.post(
  '/login',
  authRateLimiter,
  asyncHandler(loginCustomerHandler)
);

/**
 * @route   POST /api/customer/auth/google-login
 * @desc    Authenticate registered customer using Google account/email
 * @access  Public
 */
router.post(
  '/google-login',
  authRateLimiter,
  asyncHandler(loginWithGoogleHandler)
);

/**
 * @route   GET /api/customer/auth/me
 * @desc    Get currently authenticated customer profile
 * @access  Private (Customer)
 */
router.get(
  '/me',
  customerAuthMiddleware,
  asyncHandler(getCurrentCustomerHandler)
);

/**
 * @route   POST /api/customer/auth/forgot-password
 * @desc    Request password reset email link
 * @access  Public
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  asyncHandler(forgotPasswordHandler)
);

/**
 * @route   POST /api/customer/auth/reset-password
 * @desc    Reset password with secure token
 * @access  Public
 */
router.post(
  '/reset-password',
  authRateLimiter,
  asyncHandler(resetPasswordHandler)
);

export default router;
