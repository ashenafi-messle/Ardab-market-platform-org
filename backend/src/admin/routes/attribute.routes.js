// ==============================================================================
// Ardab Market - Attribute Definition Routes
// ==============================================================================

import { Router } from 'express';
import {
  getAttributesHandler,
  getAttributeHandler,
  createAttributeHandler,
  updateAttributeHandler,
  deactivateAttributeHandler,
} from '../controllers/attribute.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  createAttributeSchema,
  updateAttributeSchema,
} from '../validators/attribute.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';

const router = Router();

/**
 * @route   GET /api/attributes
 * @desc    List reusable attribute definitions with options
 * @access  Private (Admin)
 */
router.get('/', adminAuthMiddleware, asyncHandler(getAttributesHandler));

/**
 * @route   GET /api/attributes/:id
 * @desc    Get attribute definition details by ID or Slug
 * @access  Private (Admin)
 */
router.get('/:id', adminAuthMiddleware, asyncHandler(getAttributeHandler));

/**
 * @route   POST /api/attributes
 * @desc    Create a new reusable attribute definition
 * @access  Private (Sub Admin / Super Admin)
 */
router.post(
  '/',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ body: createAttributeSchema }),
  asyncHandler(createAttributeHandler)
);

/**
 * @route   PATCH /api/attributes/:id
 * @desc    Update an attribute definition and options
 * @access  Private (Sub Admin / Super Admin)
 */
router.patch(
  '/:id',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validate({ body: updateAttributeSchema }),
  asyncHandler(updateAttributeHandler)
);

/**
 * @route   PATCH /api/attributes/:id/deactivate
 * @desc    Deactivate an attribute definition safely
 * @access  Private (Sub Admin / Super Admin)
 */
router.patch(
  '/:id/deactivate',
  adminAuthMiddleware,
  requireRole(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  asyncHandler(deactivateAttributeHandler)
);

export default router;
