// ==============================================================================
// Ardab Market - Order Administrative Management Routes
// ==============================================================================

import { Router } from 'express';
import {
  getOrderSummaryHandler,
  listOrdersHandler,
  getOrderByIdHandler,
  getOrderActivityHandler,
  transitionOrderStatusHandler,
  confirmOrderHandler,
  processOrderHandler,
  readyOrderHandler,
  rejectOrderHandler,
  cancelOrderHandler,
  bulkOrderStatusHandler,
} from '../controllers/order.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  orderQuerySchema,
  orderStatusUpdateSchema,
  orderCancelSchema,
  orderRejectSchema,
  bulkOrderStatusSchema,
} from '../validators/order.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Protect all admin order routes with admin session authentication
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/orders/summary
 * @desc    Get dynamic summary metrics for dashboard KPI cards
 * @access  Super Admin, Operations Manager
 */
router.get(
  '/summary',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_MANAGE),
  asyncHandler(getOrderSummaryHandler)
);

/**
 * @route   GET /api/orders
 * @desc    List incoming orders with search, filtering, sorting, pagination
 * @access  Super Admin, Operations Manager
 */
router.get(
  '/',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_MANAGE),
  validate({ query: orderQuerySchema }),
  asyncHandler(listOrdersHandler)
);

/**
 * @route   POST /api/orders/bulk-status
 * @desc    Bulk status update for multi-selected orders
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/bulk-status',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_BULK_STATUS),
  validate({ body: bulkOrderStatusSchema }),
  asyncHandler(bulkOrderStatusHandler)
);

/**
 * @route   GET /api/orders/:id
 * @desc    Get complete order details, items snapshots, delivery address, timeline
 * @access  Super Admin, Operations Manager
 */
router.get(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_MANAGE),
  asyncHandler(getOrderByIdHandler)
);

/**
 * @route   GET /api/orders/:id/activity
 * @desc    Get chronological lifecycle activity timeline
 * @access  Super Admin, Operations Manager
 */
router.get(
  '/:id/activity',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_MANAGE),
  asyncHandler(getOrderActivityHandler)
);

/**
 * @route   PATCH /api/orders/:id/status
 * @desc    Transition order status with state-machine validation and audit trail
 * @access  Super Admin, Operations Manager
 */
router.patch(
  '/:id/status',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_UPDATE_STATUS),
  validate({ body: orderStatusUpdateSchema }),
  asyncHandler(transitionOrderStatusHandler)
);

/**
 * @route   POST /api/orders/:id/confirm
 * @desc    Convenience action: Confirm incoming order (PENDING -> CONFIRMED)
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/confirm',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_UPDATE_STATUS),
  asyncHandler(confirmOrderHandler)
);

/**
 * @route   POST /api/orders/:id/process
 * @desc    Convenience action: Send to warehouse processing (CONFIRMED -> PROCESSING)
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/process',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_UPDATE_STATUS),
  asyncHandler(processOrderHandler)
);

/**
 * @route   POST /api/orders/:id/ready
 * @desc    Convenience action: Mark ready for delivery (PROCESSING -> READY_FOR_DELIVERY)
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/ready',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_UPDATE_STATUS),
  asyncHandler(readyOrderHandler)
);

/**
 * @route   POST /api/orders/:id/reject
 * @desc    Destructive action: Reject order (requires reason)
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/reject',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_CANCEL),
  validate({ body: orderRejectSchema }),
  asyncHandler(rejectOrderHandler)
);

/**
 * @route   POST /api/orders/:id/cancel
 * @desc    Destructive action: Cancel order (requires reason)
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/cancel',
  requirePermission(ADMIN_PERMISSIONS.ORDERS_CANCEL),
  validate({ body: orderCancelSchema }),
  asyncHandler(cancelOrderHandler)
);

export default router;
