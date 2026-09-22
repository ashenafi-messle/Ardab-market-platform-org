// ==============================================================================
// Ardab Market - Customer Order Routes (Customer-Facing)
// ==============================================================================

import { Router } from 'express';
import {
  customerCheckoutHandler,
  getMyOrdersHandler,
  getMyOrderDetailsHandler,
  cancelMyOrderHandler,
} from '../controllers/order.controller.js';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { customerCheckoutSchema } from '../../admin/validators/order.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

/**
 * @route   POST /api/customer/orders/checkout
 * @desc    Customer checkout - places a new order
 * @access  Customer (Auth Required)
 */
router.post(
  '/checkout',
  customerAuthMiddleware,
  validate({ body: customerCheckoutSchema }),
  asyncHandler(customerCheckoutHandler)
);

/**
 * @route   GET /api/customer/orders
 * @desc    Get authenticated customer's orders (paginated, filterable)
 * @access  Customer (Auth Required)
 */
router.get(
  '/',
  customerAuthMiddleware,
  asyncHandler(getMyOrdersHandler)
);

/**
 * @route   GET /api/customer/orders/:id
 * @desc    Get a single order (IDOR-protected - customer sees only their orders)
 * @access  Customer (Auth Required)
 */
router.get(
  '/:id',
  customerAuthMiddleware,
  asyncHandler(getMyOrderDetailsHandler)
);

/**
 * @route   POST /api/customer/orders/:id/cancel
 * @desc    Cancel a PENDING or CONFIRMED order
 * @access  Customer (Auth Required)
 * @body    { reason: string }
 */
router.post(
  '/:id/cancel',
  customerAuthMiddleware,
  asyncHandler(cancelMyOrderHandler)
);

export default router;
