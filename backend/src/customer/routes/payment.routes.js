// ==============================================================================
// Ardab Market - Customer Payment Routes
// ==============================================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  initializePaymentHandler,
  getPaymentStatusHandler,
  getCustomerPaymentHistoryHandler,
} from '../controllers/payment.controller.js';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { mobileAuthMiddleware } from '../../customer-mobile/middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

/**
 * Unified customer authentication middleware that accepts either
 * customer mobile access tokens or customer web tokens.
 */
async function unifiedCustomerAuth(req, res, next) {
  if (req.customer?.id) return next();

  mobileAuthMiddleware(req, res, (mobileErr) => {
    if (!mobileErr && req.customer?.id) {
      return next();
    }
    customerAuthMiddleware(req, res, next);
  });
}

/**
 * Rate limiter for payment initialization:
 * Allows up to 20 initialization attempts per 5 minutes per IP/customer.
 */
const paymentInitLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many payment requests. Please wait a few moments before trying again.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for payment status polling:
 * Allows up to 60 status checks per minute.
 */
const statusPollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many status check requests. Polling slowed.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/customer/payments/chapa/initialize
 * @desc    Initialize a Chapa checkout session for an order
 * @access  Customer (Auth required)
 */
router.post(
  '/chapa/initialize',
  paymentInitLimiter,
  unifiedCustomerAuth,
  asyncHandler(initializePaymentHandler)
);

/**
 * @route   GET /api/customer/payments/history
 * @desc    Get paginated payment transaction history for customer
 * @access  Customer (Auth required)
 */
router.get(
  '/history',
  unifiedCustomerAuth,
  asyncHandler(getCustomerPaymentHistoryHandler)
);

/**
 * @route   GET /api/customer/payments/:paymentId/status
 * @desc    Get live payment status with automatic on-demand verification
 * @access  Customer (Auth required)
 */
router.get(
  '/:paymentId/status',
  statusPollLimiter,
  unifiedCustomerAuth,
  asyncHandler(getPaymentStatusHandler)
);

export default router;
