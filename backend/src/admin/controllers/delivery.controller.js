// ==============================================================================
// Ardab Market - Deliveries Administrative HTTP Controllers
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listDeliveries,
  getDeliveryById,
  getDeliveryActivity,
  createDeliveryForOrder,
  prepareDelivery,
  assignDeliveryToTrip,
  dispatchDelivery,
  completeDelivery,
  failDelivery,
  cancelDelivery,
  listAvailableTrips,
} from '../services/delivery.service.js';
import { getDeliverySummary } from '../services/delivery.metrics.service.js';

/**
 * GET /api/deliveries/summary
 */
export async function getDeliverySummaryHandler(req, res) {
  const { city } = req.query;
  const summary = await getDeliverySummary(city || null);
  return ApiResponse.success(res, summary, 'Delivery summary metrics loaded successfully.');
}

/**
 * GET /api/deliveries
 */
export async function listDeliveriesHandler(req, res) {
  const result = await listDeliveries(req.query);
  return ApiResponse.paginated(
    res,
    result.deliveries,
    result.pagination,
    'Deliveries retrieved successfully.'
  );
}

/**
 * GET /api/deliveries/:id
 */
export async function getDeliveryByIdHandler(req, res) {
  const delivery = await getDeliveryById(req.params.id);
  return ApiResponse.success(res, delivery, 'Delivery retrieved successfully.');
}

/**
 * GET /api/deliveries/:id/activity
 */
export async function getDeliveryActivityHandler(req, res) {
  const activities = await getDeliveryActivity(req.params.id);
  return ApiResponse.success(res, activities, 'Delivery activity timeline retrieved successfully.');
}

/**
 * POST /api/deliveries
 */
export async function createDeliveryHandler(req, res) {
  const delivery = await createDeliveryForOrder(
    req.body,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery created successfully.', 201);
}

/**
 * POST /api/deliveries/:id/prepare
 */
export async function prepareDeliveryHandler(req, res) {
  const delivery = await prepareDelivery(
    req.params.id,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery prepared for trip assignment.');
}

/**
 * POST /api/deliveries/:id/assign-trip
 */
export async function assignDeliveryToTripHandler(req, res) {
  const delivery = await assignDeliveryToTrip(
    req.params.id,
    req.body,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery successfully assigned to trip.');
}

/**
 * POST /api/deliveries/:id/dispatch
 */
export async function dispatchDeliveryHandler(req, res) {
  const delivery = await dispatchDelivery(
    req.params.id,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery dispatched and is now out for delivery.');
}

/**
 * POST /api/deliveries/:id/complete
 */
export async function completeDeliveryHandler(req, res) {
  const delivery = await completeDelivery(
    req.params.id,
    req.body,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery successfully marked as completed.');
}

/**
 * POST /api/deliveries/:id/fail
 */
export async function failDeliveryHandler(req, res) {
  const { reason, notes } = req.body;
  const delivery = await failDelivery(
    req.params.id,
    reason,
    notes,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery attempt recorded as failed.');
}

/**
 * POST /api/deliveries/:id/cancel
 */
export async function cancelDeliveryHandler(req, res) {
  const { reason } = req.body;
  const delivery = await cancelDelivery(
    req.params.id,
    reason,
    req.adminUser,
    req.ip || req.connection?.remoteAddress
  );
  return ApiResponse.success(res, delivery, 'Delivery successfully cancelled.');
}

/**
 * GET /api/deliveries/trips-available
 */
export async function listAvailableTripsHandler(req, res) {
  const { city } = req.query;
  const trips = await listAvailableTrips(city || null);
  return ApiResponse.success(res, trips, 'Available trips retrieved successfully.');
}
