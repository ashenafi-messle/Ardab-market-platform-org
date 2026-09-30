// ==============================================================================
// Ardab Market - Customer Profile Routes
// ==============================================================================

import { Router } from 'express';
import { customerAuthMiddleware } from '../middleware/customerAuth.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  getProfileHandler,
  updateProfileHandler,
} from '../controllers/profile.controller.js';

const router = Router();

// All profile routes require authenticated customer
router.use(customerAuthMiddleware);

/**
 * @route   GET /api/customer/profile
 * @desc    Get customer profile
 */
router.get('/', asyncHandler(getProfileHandler));

/**
 * @route   PATCH /api/customer/profile
 * @desc    Update allowed customer profile fields
 */
router.patch('/', asyncHandler(updateProfileHandler));

export default router;
