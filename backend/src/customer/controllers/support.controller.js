// ==============================================================================
// Ardab Market - Customer Support Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import * as supportService from '../services/support.service.js';

/**
 * GET /api/customer/support/categories
 */
export async function listCategoriesHandler(req, res) {
  const categories = await supportService.listCategories();
  return ApiResponse.success(res, categories);
}

/**
 * GET /api/customer/support/orders
 */
export async function listCustomerOrdersHandler(req, res) {
  const orders = await supportService.listCustomerOrders(req.customer.id);
  return ApiResponse.success(res, orders);
}

/**
 * GET /api/customer/support/requests
 */
export async function listRequestsHandler(req, res) {
  const result = await supportService.listCustomerRequests(req.customer.id, req.query);
  return ApiResponse.paginated(res, result.items, result.pagination);
}

/**
 * GET /api/customer/support/requests/:requestId
 */
export async function getRequestByIdHandler(req, res) {
  const ticket = await supportService.getCustomerRequestById(req.params.requestId, req.customer.id);
  return ApiResponse.success(res, ticket);
}

/**
 * POST /api/customer/support/requests
 */
export async function createRequestHandler(req, res) {
  const ticket = await supportService.createCustomerRequest(req.customer.id, req.body);
  return ApiResponse.success(res, ticket, 'Support request submitted successfully', 201);
}

/**
 * POST /api/customer/support/requests/:requestId/messages
 */
export async function replyRequestHandler(req, res) {
  const message = await supportService.replyCustomerRequest(
    req.params.requestId,
    req.customer.id,
    req.body
  );
  return ApiResponse.success(res, message, 'Reply posted successfully', 201);
}

/**
 * PATCH /api/customer/support/requests/:requestId/read
 */
export async function markReadHandler(req, res) {
  const result = await supportService.markCustomerRequestRead(
    req.params.requestId,
    req.customer.id
  );
  return ApiResponse.success(res, result, 'Marked as read');
}
