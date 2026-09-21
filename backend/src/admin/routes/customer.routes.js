// ==============================================================================
// Ardab Market - Super Admin Customer Management Routes
// ==============================================================================

import { Router } from 'express';
import {
  getCustomersHandler,
  getCustomerSummaryHandler,
  getCustomerHandler,
  getCustomerOrdersHandler,
  getCustomerActivityHandler,
  updateCustomerHandler,
  updateCustomerStatusHandler,
  bulkUpdateCustomerStatusHandler,
  deleteCustomerHandler,
} from '../controllers/customer.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requireRole, requirePermission } from '../middleware/adminPermission.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  customerParamsSchema,
  customerQuerySchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  bulkUpdateCustomerStatusSchema,
  customerOrdersQuerySchema,
  customerActivityQuerySchema,
} from '../validators/customer.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { ADMIN_ROLES } from '../constants/adminRoles.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';

const router = Router();

// Apply admin authentication to all customer administration endpoints
router.use(adminAuthMiddleware);
router.use(requireRole(ADMIN_ROLES.SUPER_ADMIN));

/**
 * @route   GET /api/customers/summary
 * @desc    Get dynamic aggregate customer statistics for summary cards
 * @access  Private (Super Admin - customers:view)
 */
router.get(
  '/summary',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
  asyncHandler(getCustomerSummaryHandler)
);

/**
 * @route   PATCH /api/customers/bulk-status
 * @desc    Bulk update status across multiple selected customers
 * @access  Private (Super Admin - customers:bulk_status)
 */
router.patch(
  '/bulk-status',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_BULK_STATUS),
  validate({ body: bulkUpdateCustomerStatusSchema }),
  asyncHandler(bulkUpdateCustomerStatusHandler)
);

/**
 * @route   GET /api/customers
 * @desc    List customers with server-side pagination, search, and filtering
 * @access  Private (Super Admin - customers:view)
 */
router.get(
  '/',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
  validate({ query: customerQuerySchema }),
  asyncHandler(getCustomersHandler)
);

/**
 * @route   GET /api/customers/:id
 * @desc    Get detailed customer profile, addresses, metrics, recent orders, and activity
 * @access  Private (Super Admin - customers:view)
 */
router.get(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
  validate({ params: customerParamsSchema }),
  asyncHandler(getCustomerHandler)
);

/**
 * @route   GET /api/customers/:id/orders
 * @desc    Get paginated historical orders for a specific customer
 * @access  Private (Super Admin - customers:view)
 */
router.get(
  '/:id/orders',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
  validate({ params: customerParamsSchema, query: customerOrdersQuerySchema }),
  asyncHandler(getCustomerOrdersHandler)
);

/**
 * @route   GET /api/customers/:id/activity
 * @desc    Get paginated chronological activity trail for a specific customer
 * @access  Private (Super Admin - customers:view)
 */
router.get(
  '/:id/activity',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_VIEW),
  validate({ params: customerParamsSchema, query: customerActivityQuerySchema }),
  asyncHandler(getCustomerActivityHandler)
);

/**
 * @route   PATCH /api/customers/:id
 * @desc    Update customer profile information (protected metrics are strictly rejected)
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id',
  validate({ params: customerParamsSchema, body: updateCustomerSchema }),
  asyncHandler(updateCustomerHandler)
);

/**
 * @route   PATCH /api/customers/:id/status
 * @desc    Update customer account status (ACTIVE, SUSPENDED, INACTIVE)
 * @access  Private (Super Admin - customers:suspend)
 */
router.patch(
  '/:id/status',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_SUSPEND),
  validate({ params: customerParamsSchema, body: updateCustomerStatusSchema }),
  asyncHandler(updateCustomerStatusHandler)
);

/**
 * @route   DELETE /api/customers/:id
 * @desc    Permanently delete/cleanse customer data and records
 * @access  Private (Super Admin - customers:suspend)
 */
router.delete(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.CUSTOMERS_SUSPEND),
  validate({ params: customerParamsSchema }),
  asyncHandler(deleteCustomerHandler)
);

export default router;

