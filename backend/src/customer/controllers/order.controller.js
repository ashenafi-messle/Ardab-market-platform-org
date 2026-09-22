// ==============================================================================
// Ardab Market - Customer Order Controller (Customer-Facing Endpoints)
// ==============================================================================

import { ApiResponse, ApiError } from '../../shared/utils/apiResponse.js';
import { checkoutCustomerOrder } from '../../admin/services/order.service.js';
import {
  getMyOrders,
  getMyOrderById,
  cancelMyOrder,
} from '../services/order.service.js';

/**
 * POST /api/customer/orders/checkout
 * Safely creates an order placed by an authenticated customer.
 */
export async function customerCheckoutHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const customerId = req.customer?.id;

  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required', 'UNAUTHORIZED');
  }

  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
  const order = await checkoutCustomerOrder(
    { ...req.body, ...(idempotencyKey ? { idempotencyKey } : {}) },
    customerId,
    ipAddress
  );
  return ApiResponse.success(res, order, 'Order placed successfully', 201);
}

/**
 * GET /api/customer/orders
 * Returns the authenticated customer's orders with pagination and filtering.
 */
export async function getMyOrdersHandler(req, res) {
  const customerId = req.customer?.id;

  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required', 'UNAUTHORIZED');
  }

  const result = await getMyOrders(customerId, req.query);
  return ApiResponse.paginated(
    res,
    result.orders,
    result.pagination,
    'Orders fetched successfully',
    200
  );
}

/**
 * GET /api/customer/orders/:id
 * Returns details for a single customer order (IDOR protected).
 */
export async function getMyOrderDetailsHandler(req, res) {
  const customerId = req.customer?.id;

  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required', 'UNAUTHORIZED');
  }

  const order = await getMyOrderById(req.params.id, customerId);
  return ApiResponse.success(res, order, 'Order details fetched successfully', 200);
}

/**
 * POST /api/customer/orders/:id/cancel
 * Cancels a PENDING or CONFIRMED order for the customer.
 */
export async function cancelMyOrderHandler(req, res) {
  const customerId = req.customer?.id;

  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required', 'UNAUTHORIZED');
  }

  const { reason = 'Cancelled by customer' } = req.body;
  const order = await cancelMyOrder(req.params.id, customerId, reason);
  return ApiResponse.success(res, order, 'Order cancelled successfully', 200);
}
