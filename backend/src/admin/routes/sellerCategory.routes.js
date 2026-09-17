// ==============================================================================
// Ardab Market - Seller Marketplace Category Routes
// ==============================================================================

import { Router } from 'express';
import {
  getSellerCategoriesHandler,
  assignCategoryToSellerHandler,
  removeCategoryFromSellerHandler,
} from '../controllers/category.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  sellerParamsSchema,
  assignSellerCategorySchema,
  sellerCategoryParamsSchema,
} from '../validators/category.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const router = Router({ mergeParams: true });

/**
 * @route   GET /:sellerId/marketplace-categories
 * @desc    Get active categories assigned to a seller
 * @access  Private (Admin)
 */
router.get(
  '/:sellerId/marketplace-categories',
  adminAuthMiddleware,
  validate({ params: sellerParamsSchema }),
  asyncHandler(getSellerCategoriesHandler)
);

/**
 * @route   POST /:sellerId/marketplace-categories
 * @desc    Assign a marketplace category to a seller
 * @access  Private (Super Admin)
 */
router.post(
  '/:sellerId/marketplace-categories',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: sellerParamsSchema, body: assignSellerCategorySchema }),
  asyncHandler(assignCategoryToSellerHandler)
);

/**
 * @route   DELETE /:sellerId/marketplace-categories/:categoryId
 * @desc    Remove a marketplace category assignment from a seller
 * @access  Private (Super Admin)
 */
router.delete(
  '/:sellerId/marketplace-categories/:categoryId',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: sellerCategoryParamsSchema }),
  asyncHandler(removeCategoryFromSellerHandler)
);

export default router;
