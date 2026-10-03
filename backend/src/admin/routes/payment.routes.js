// ==============================================================================
// Ardab Market - Admin Payment Routes
// ==============================================================================

import { Router } from 'express';
import {
  listPaymentsHandler,
  getPaymentDetailsHandler,
  createRefundHandler,
} from '../controllers/payment.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Protect all admin payment routes
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/admin/payments
 * @desc    List payments with pagination and filters
 * @access  Admin (Auth Required)
 */
router.get('/', asyncHandler(listPaymentsHandler));

/**
 * @route   GET /api/admin/payments/:id
 * @desc    Get payment details, audit trail, and attempts
 * @access  Admin (Auth Required)
 */
router.get('/:id', asyncHandler(getPaymentDetailsHandler));

/**
 * @route   POST /api/admin/payments/:id/refund
 * @desc    Request payment refund
 * @access  Admin (Auth Required)
 */
router.post('/:id/refund', asyncHandler(createRefundHandler));

export default router;
