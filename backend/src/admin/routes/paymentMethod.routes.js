// ==============================================================================
// Ardab Market - Payment Method Configuration Routes
// ==============================================================================

import { Router } from 'express';
import {
  getPaymentMethods,
  getPaymentMethod,
  createPaymentMethodHandler,
  updatePaymentMethodHandler,
  togglePaymentMethodStatusHandler,
} from '../controllers/paymentMethod.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  updatePaymentMethodStatusSchema,
  paymentMethodParamsSchema,
} from '../validators/paymentMethod.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const router = Router();

/**
 * @route   GET /
 * @desc    List payment methods (supports ?active=true for supplier registration)
 * @access  Private (Authenticated Admin)
 */
router.get('/', adminAuthMiddleware, asyncHandler(getPaymentMethods));

/**
 * @route   GET /:id
 * @desc    Get payment method by ID
 * @access  Private (Super Admin)
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: paymentMethodParamsSchema }),
  asyncHandler(getPaymentMethod)
);

/**
 * @route   POST /
 * @desc    Create a new payment method configuration
 * @access  Private (Super Admin)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ body: createPaymentMethodSchema }),
  asyncHandler(createPaymentMethodHandler)
);

/**
 * @route   PATCH /:id
 * @desc    Update an existing payment method
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: paymentMethodParamsSchema, body: updatePaymentMethodSchema }),
  asyncHandler(updatePaymentMethodHandler)
);

/**
 * @route   PATCH /:id/status
 * @desc    Toggle or set payment method active status
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id/status',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: paymentMethodParamsSchema, body: updatePaymentMethodStatusSchema }),
  asyncHandler(togglePaymentMethodStatusHandler)
);

export default router;
