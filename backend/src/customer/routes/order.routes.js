// ==============================================================================
// Ardab Market - Customer Mobile Order Routes
// ==============================================================================

import { Router } from 'express';
import { customerCheckoutHandler } from '../controllers/order.controller.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { customerCheckoutSchema } from '../../admin/validators/order.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

/**
 * @route   POST /api/customer/orders/checkout
 * @desc    Customer mobile application checkout endpoint
 * @access  Customer (or body with customerId)
 */
router.post(
  '/checkout',
  validate({ body: customerCheckoutSchema }),
  asyncHandler(customerCheckoutHandler)
);

export default router;
