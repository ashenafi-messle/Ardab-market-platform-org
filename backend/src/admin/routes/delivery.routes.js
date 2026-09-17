// ==============================================================================
// Ardab Market - Deliveries Administrative Management Routes
// ==============================================================================

import { Router } from 'express';
import {
  getDeliverySummaryHandler,
  listDeliveriesHandler,
  getDeliveryByIdHandler,
  getDeliveryActivityHandler,
  createDeliveryHandler,
  prepareDeliveryHandler,
  assignDeliveryToTripHandler,
  dispatchDeliveryHandler,
  completeDeliveryHandler,
  failDeliveryHandler,
  cancelDeliveryHandler,
  listAvailableTripsHandler,
} from '../controllers/delivery.controller.js';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import {
  deliveryQuerySchema,
  createDeliverySchema,
  assignTripSchema,
  completeDeliverySchema,
  failDeliverySchema,
  cancelDeliverySchema,
} from '../validators/delivery.validator.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const router = Router();

// Protect all admin delivery routes with admin session authentication
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/deliveries/summary
 * @desc    Get dynamic summary metrics for Super Admin Deliveries KPI cards
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.get(
  '/summary',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_VIEW),
  asyncHandler(getDeliverySummaryHandler)
);

/**
 * @route   GET /api/deliveries/trips-available
 * @desc    Get list of available trips with remaining vehicle capacity under 5,000 KG
 * @access  Super Admin, Operations Manager
 */
router.get(
  '/trips-available',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_ASSIGN),
  asyncHandler(listAvailableTripsHandler)
);

/**
 * @route   GET /api/deliveries
 * @desc    List deliveries with search, filters, sorting, and pagination
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.get(
  '/',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_VIEW),
  validate({ query: deliveryQuerySchema }),
  asyncHandler(listDeliveriesHandler)
);

/**
 * @route   POST /api/deliveries
 * @desc    Create a delivery for an existing order
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_UPDATE_STATUS),
  validate({ body: createDeliverySchema }),
  asyncHandler(createDeliveryHandler)
);

/**
 * @route   GET /api/deliveries/:id
 * @desc    Get delivery details by internal ID or deliveryNumber
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.get(
  '/:id',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_VIEW),
  asyncHandler(getDeliveryByIdHandler)
);

/**
 * @route   GET /api/deliveries/:id/activity
 * @desc    Get delivery timeline audit events
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.get(
  '/:id/activity',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_VIEW),
  asyncHandler(getDeliveryActivityHandler)
);

/**
 * @route   POST /api/deliveries/:id/prepare
 * @desc    Transition delivery from PENDING to READY_FOR_ASSIGNMENT
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.post(
  '/:id/prepare',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_UPDATE_STATUS),
  asyncHandler(prepareDeliveryHandler)
);

/**
 * @route   POST /api/deliveries/:id/assign-trip
 * @desc    Assign delivery to a Trip respecting 5,000 KG vehicle capacity
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/assign-trip',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_ASSIGN),
  validate({ body: assignTripSchema }),
  asyncHandler(assignDeliveryToTripHandler)
);

/**
 * @route   POST /api/deliveries/:id/dispatch
 * @desc    Dispatch delivery out for delivery (transitions to OUT_FOR_DELIVERY)
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.post(
  '/:id/dispatch',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_UPDATE_STATUS),
  asyncHandler(dispatchDeliveryHandler)
);

/**
 * @route   POST /api/deliveries/:id/complete
 * @desc    Mark delivery as completed (transitions to DELIVERED)
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.post(
  '/:id/complete',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_UPDATE_STATUS),
  validate({ body: completeDeliverySchema }),
  asyncHandler(completeDeliveryHandler)
);

/**
 * @route   POST /api/deliveries/:id/fail
 * @desc    Record delivery attempt failure with structured reason
 * @access  Super Admin, Operations Manager, Dispatcher
 */
router.post(
  '/:id/fail',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_UPDATE_STATUS),
  validate({ body: failDeliverySchema }),
  asyncHandler(failDeliveryHandler)
);

/**
 * @route   POST /api/deliveries/:id/cancel
 * @desc    Cancel a delivery with structured cancellation reason
 * @access  Super Admin, Operations Manager
 */
router.post(
  '/:id/cancel',
  requirePermission(ADMIN_PERMISSIONS.DELIVERIES_UPDATE_STATUS),
  validate({ body: cancelDeliverySchema }),
  asyncHandler(cancelDeliveryHandler)
);

export default router;
