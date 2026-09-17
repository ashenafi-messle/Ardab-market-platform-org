// ==============================================================================
// Ardab Market - Customer Mobile Authentication Routes
// ==============================================================================

import { Router } from 'express';
import { registerCustomerHandler } from '../controllers/auth.controller.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { customerRegistrationSchema } from '../../admin/validators/customer.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

/**
 * @route   POST /api/customer/auth/register
 * @desc    Register a new customer account via mobile application
 * @access  Public
 */
router.post(
  '/register',
  validate({ body: customerRegistrationSchema }),
  asyncHandler(registerCustomerHandler)
);

export default router;
