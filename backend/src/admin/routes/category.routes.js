// ==============================================================================
// Ardab Market - Marketplace Category Routes
// ==============================================================================

import { Router } from 'express';
import {
  getCategories,
  getCategoryTreeHandler,
  getCategory,
  getCategoryChildrenHandler,
  getCategoryBreadcrumbsHandler,
  createCategoryHandler,
  updateCategoryHandler,
  updateCategoryStatusHandler,
  moveCategoryHandler,
  deleteCategoryHandler,
  uploadCategoryImageHandler,
  getCategoryAttributesHandler,
  updateCategoryAttributesHandler,
  getEffectiveCategoryAttributesHandler,
} from '../controllers/category.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission, requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { uploadSingleCategoryImage } from '../../shared/middleware/upload.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  updateCategoryStatusSchema,
  moveCategorySchema,
  categoryParamsSchema,
} from '../validators/category.validator.js';
import { updateCategoryAttributesSchema } from '../validators/attribute.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';

const router = Router();

/**
 * @route   POST /api/categories/upload-image
 * @desc    Upload category banner/thumbnail image to Cloudinary
 * @access  Private (Sub Admin / Super Admin)
 */
router.post(
  '/upload-image',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  uploadSingleCategoryImage,
  asyncHandler(uploadCategoryImageHandler)
);

/**
 * @route   GET /api/categories/tree
 * @desc    Get hierarchical category tree
 * @access  Private (Admin)
 */
router.get(
  '/tree',
  adminAuthMiddleware,
  asyncHandler(getCategoryTreeHandler)
);

/**
 * @route   GET /api/categories
 * @desc    List marketplace categories (flat or filtered by parentId/status)
 * @access  Private (Admin)
 */
router.get(
  '/',
  adminAuthMiddleware,
  asyncHandler(getCategories)
);

/**
 * @route   GET /api/categories/:id/children
 * @desc    Get immediate child categories
 * @access  Private (Admin)
 */
router.get(
  '/:id/children',
  adminAuthMiddleware,
  validate({ params: categoryParamsSchema }),
  asyncHandler(getCategoryChildrenHandler)
);

/**
 * @route   GET /api/categories/:id/breadcrumbs
 * @desc    Get category ancestry path for breadcrumbs
 * @access  Private (Admin)
 */
router.get(
  '/:id/breadcrumbs',
  adminAuthMiddleware,
  validate({ params: categoryParamsSchema }),
  asyncHandler(getCategoryBreadcrumbsHandler)
);

/**
 * @route   GET /api/categories/:id
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
 * @route   GET /api/categories/:id/effective-attributes
 * @desc    Resolve inherited and local attributes and logistics config for a category
 * @access  Private (Admin)
 */
router.get(
  '/:id/effective-attributes',
  adminAuthMiddleware,
  validate({ params: categoryParamsSchema }),
  asyncHandler(getEffectiveCategoryAttributesHandler)
);

/**
 * @route   GET /api/categories/:id/attributes
 * @desc    Get attributes and logistics config explicitly defined on this category
 * @access  Private (Admin)
 */
router.get(
  '/:id/attributes',
  adminAuthMiddleware,
  validate({ params: categoryParamsSchema }),
  asyncHandler(getCategoryAttributesHandler)
);

/**
 * @route   PUT /api/categories/:id/attributes
 * @desc    Configure attributes and logistics rules for this category
 * @access  Private (Sub Admin / Super Admin)
 */
router.put(
  '/:id/attributes',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ params: categoryParamsSchema, body: updateCategoryAttributesSchema }),
  asyncHandler(updateCategoryAttributesHandler)
);

/**
 * @route   POST /api/categories
 * @desc    Create a new marketplace category (root or child)
 * @access  Private (Sub Admin / Super Admin)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ body: createCategorySchema }),
  asyncHandler(createCategoryHandler)
);

/**
 * @route   PATCH /api/categories/:id
 * @desc    Update a marketplace category
 * @access  Private (Sub Admin / Super Admin)
 */
router.patch(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ params: categoryParamsSchema, body: updateCategorySchema }),
  asyncHandler(updateCategoryHandler)
);

/**
 * @route   PATCH /api/categories/:id/status
 * @desc    Update category active/inactive status
 * @access  Private (Sub Admin / Super Admin)
 */
router.patch(
  '/:id/status',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ params: categoryParamsSchema, body: updateCategoryStatusSchema }),
  asyncHandler(updateCategoryStatusHandler)
);

/**
 * @route   PATCH /api/categories/:id/move
 * @desc    Move a category safely under a new parent or to root
 * @access  Private (Sub Admin / Super Admin)
 */
router.patch(
  '/:id/move',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ params: categoryParamsSchema, body: moveCategorySchema }),
  asyncHandler(moveCategoryHandler)
);

/**
 * @route   DELETE /api/categories/:id
 * @desc    Safe delete a category (fails if children or products exist)
 * @access  Private (Sub Admin / Super Admin)
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ params: categoryParamsSchema }),
  asyncHandler(deleteCategoryHandler)
);

export default router;
