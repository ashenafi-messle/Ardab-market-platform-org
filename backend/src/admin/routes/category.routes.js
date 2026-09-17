// ==============================================================================
// Ardab Market - Marketplace Category Routes
// ==============================================================================

import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategoryHandler,
  updateCategoryHandler,
} from '../controllers/category.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
} from '../validators/category.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const router = Router();

/**
 * @route   GET /
 * @desc    List marketplace categories
 * @access  Private (Admin)
 */
router.get(
  '/',
  adminAuthMiddleware,
  asyncHandler(getCategories)
);

/**
 * @route   GET /:id
 * @desc    Get category details by ID
 * @access  Private (Admin)
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  validate({ params: categoryParamsSchema }),
  asyncHandler(getCategory)
);

/**
 * @route   POST /
 * @desc    Create a new marketplace category
 * @access  Private (Super Admin)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ body: createCategorySchema }),
  asyncHandler(createCategoryHandler)
);

/**
 * @route   PATCH /:id
 * @desc    Update a marketplace category
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: categoryParamsSchema, body: updateCategorySchema }),
  asyncHandler(updateCategoryHandler)
);

export default router;
