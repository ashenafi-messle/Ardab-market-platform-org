// ==============================================================================
// Ardab Market - Product Management Routes
// ==============================================================================

import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProductHandler,
  updateProductHandler,
  toggleProductStatusHandler,
  deleteProductHandler,
  addProductImageHandler,
  deleteProductImageHandler,
  setPrimaryImageHandler,
  reorderImagesHandler,
} from '../controllers/product.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  uploadProductImages,
  uploadSingleProductImage,
} from '../../shared/middleware/upload.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  productParamsSchema,
  productImageParamsSchema,
  updateProductImageSchema,
  reorderProductImagesSchema,
  productQuerySchema,
} from '../validators/product.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const router = Router();

/**
 * @route   GET /
 * @desc    List products with pagination, search, and filtering
 * @access  Private (Admin)
 */
router.get(
  '/',
  adminAuthMiddleware,
  validate({ query: productQuerySchema }),
  asyncHandler(getProducts)
);

/**
 * @route   GET /:id
 * @desc    Get detailed product by ID
 * @access  Private (Admin)
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  validate({ params: productParamsSchema }),
  asyncHandler(getProduct)
);

/**
 * @route   POST /
 * @desc    Create a new product with auto itemCode and optional image uploads
 * @access  Private (Super Admin)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  uploadProductImages,
  validate({ body: createProductSchema }),
  asyncHandler(createProductHandler)
);

/**
 * @route   PATCH /:id
 * @desc    Update an existing product (itemCode immutable)
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productParamsSchema, body: updateProductSchema }),
  asyncHandler(updateProductHandler)
);

/**
 * @route   PATCH /:id/status
 * @desc    Toggle or update product lifecycle status
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id/status',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productParamsSchema, body: updateProductStatusSchema }),
  asyncHandler(toggleProductStatusHandler)
);

/**
 * @route   DELETE /:id
 * @desc    Archive / soft delete a product
 * @access  Private (Super Admin)
 */
router.delete(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productParamsSchema }),
  asyncHandler(deleteProductHandler)
);

// ------------------------------------------------------------------------------
// Product Image Lifecycle Endpoints
// ------------------------------------------------------------------------------

/**
 * @route   POST /:id/images
 * @desc    Upload an additional image for a product to Cloudinary
 * @access  Private (Super Admin)
 */
router.post(
  '/:id/images',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productParamsSchema }),
  uploadSingleProductImage,
  asyncHandler(addProductImageHandler)
);

/**
 * @route   DELETE /:id/images/:imageId
 * @desc    Delete a product image from Cloudinary and database
 * @access  Private (Super Admin)
 */
router.delete(
  '/:id/images/:imageId',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productImageParamsSchema }),
  asyncHandler(deleteProductImageHandler)
);

/**
 * @route   PATCH /:id/images/reorder
 * @desc    Reorder product images
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id/images/reorder',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productParamsSchema, body: reorderProductImagesSchema }),
  asyncHandler(reorderImagesHandler)
);

/**
 * @route   PATCH /:id/images/:imageId
 * @desc    Set primary image or update image details
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id/images/:imageId',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: productImageParamsSchema, body: updateProductImageSchema }),
  asyncHandler(setPrimaryImageHandler)
);


export default router;
