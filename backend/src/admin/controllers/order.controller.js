// ==============================================================================
// Ardab Market - Order Administrative Operations Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listOrders,
  getOrderById,
  getOrderActivity,
  transitionOrderStatus,
  bulkTransitionStatus,
} from '../services/order.service.js';
import { getOrderSummary } from '../services/order.metrics.service.js';

/**
 * GET /api/orders/summary
 * Retrieves dynamic summary metrics for Super Admin dashboard KPI cards.
 */
export async function getOrderSummaryHandler(req, res) {
  const summary = await getOrderSummary(req.query.city);
  return ApiResponse.success(res, summary, 'Order metrics retrieved successfully');
}

/**
 * GET /api/orders
 * Paginated list of incoming orders with server-side search, filtering, and sorting.
 */
export async function listOrdersHandler(req, res) {
  const { orders, pagination } = await listOrders(req.query);
  return ApiResponse.paginated(res, orders, pagination, 'Orders retrieved successfully');
}

/**
 * GET /api/orders/:id
 * Retrieves full order profile, items snapshots, delivery address, and timeline.
 */
export async function getOrderByIdHandler(req, res) {
  const order = await getOrderById(req.params.id);
  return ApiResponse.success(res, order, 'Order details retrieved successfully');
}

/**
 * GET /api/orders/:id/activity
 * Retrieves chronological timeline of status transitions and operational actions.
 */
export async function getOrderActivityHandler(req, res) {
  const activities = await getOrderActivity(req.params.id);
  return ApiResponse.success(res, activities, 'Order activity timeline retrieved successfully');
}

/**
 * PATCH /api/orders/:id/status
 * Transitions order state with centralized lifecycle validation and audit logging.
 */
export async function transitionOrderStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const order = await transitionOrderStatus(
    req.params.id,
    req.body.status,
    req.body.reason,
    req.user,
    ipAddress
  );
  return ApiResponse.success(res, order, `Order successfully transitioned to ${req.body.status}`);
}

/**
 * POST /api/orders/:id/confirm
 * Super Admin convenience action: PENDING -> CONFIRMED
 */
export async function confirmOrderHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const order = await transitionOrderStatus(
    req.params.id,
    'CONFIRMED',
    null,
    req.user,
    ipAddress
  );
  return ApiResponse.success(res, order, 'Order successfully confirmed');
}

/**
 * POST /api/orders/:id/process
 * Super Admin convenience action: CONFIRMED -> PROCESSING
 */
export async function processOrderHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const order = await transitionOrderStatus(
    req.params.id,
    'PROCESSING',
    null,
    req.user,
    ipAddress
  );
  return ApiResponse.success(res, order, 'Order moved to warehouse processing');
}

/**
 * POST /api/orders/:id/ready
 * Super Admin convenience action: PROCESSING -> READY_FOR_DELIVERY
 */
export async function readyOrderHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const order = await transitionOrderStatus(
    req.params.id,
    'READY_FOR_DELIVERY',
    null,
    req.user,
    ipAddress
  );
  return ApiResponse.success(res, order, 'Order staged and marked ready for delivery');
}

/**
 * POST /api/orders/:id/reject
 * Destructive action: PENDING -> REJECTED (requires reason)
 */
export async function rejectOrderHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const order = await transitionOrderStatus(
    req.params.id,
    'REJECTED',
    req.body.reason,
    req.user,
    ipAddress
  );
  return ApiResponse.success(res, order, 'Order successfully rejected');
}

/**
 * POST /api/orders/:id/cancel
 * Destructive action: -> CANCELLED (requires reason)
 */
export async function cancelOrderHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const order = await transitionOrderStatus(
    req.params.id,
    'CANCELLED',
    req.body.reason,
    req.user,
    ipAddress
  );
  return ApiResponse.success(res, order, 'Order successfully cancelled');
}

/**
 * POST /api/orders/bulk-status
 * Bulk status update across multiple selected orders.
 */
export async function bulkOrderStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await bulkTransitionStatus(
    req.body.ids,
    req.body.status,
    req.body.reason,
    req.user,
    ipAddress
  );
  return ApiResponse.success(
    res,
    result,
    `Successfully transitioned ${result.count} order(s) to ${req.body.status}`
  );
}
