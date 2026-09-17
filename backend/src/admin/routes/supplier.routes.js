// ==============================================================================
// Ardab Market - Supplier Management Routes
// ==============================================================================

import { Router } from 'express';
import {
  getSuppliers,
  getSupplier,
  createSupplierHandler,
  updateSupplierHandler,
  toggleSupplierStatusHandler,
} from '../controllers/supplier.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  createSupplierSchema,
  updateSupplierSchema,
  updateSupplierStatusSchema,
  supplierParamsSchema,
} from '../validators/supplier.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const router = Router();

/**
 * @route   GET /
 * @desc    List suppliers with pagination, search, and city/status filtering
 * @access  Private (Super Admin)
 */
router.get(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  asyncHandler(getSuppliers)
);

/**
 * @route   GET /:id
 * @desc    Get detailed supplier profile by ID
 * @access  Private (Super Admin)
 */
router.get(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: supplierParamsSchema }),
  asyncHandler(getSupplier)
);

/**
 * @route   POST /
 * @desc    Register a new platform supplier
 * @access  Private (Super Admin)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ body: createSupplierSchema }),
  asyncHandler(createSupplierHandler)
);

/**
 * @route   PATCH /:id
 * @desc    Update an existing supplier
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: supplierParamsSchema, body: updateSupplierSchema }),
  asyncHandler(updateSupplierHandler)
);

/**
 * @route   PATCH /:id/status
 * @desc    Toggle or update supplier account status (ACTIVE / SUSPENDED)
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id/status',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN),
  validate({ params: supplierParamsSchema, body: updateSupplierStatusSchema }),
  asyncHandler(toggleSupplierStatusHandler)
);

export default router;
