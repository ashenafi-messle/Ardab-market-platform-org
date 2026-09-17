// ==============================================================================
// Ardab Market - Customer Management Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listCustomers,
  getCustomerSummary,
  getCustomerById,
  getCustomerOrders,
  getCustomerActivity,
  updateCustomerProfile,
  updateCustomerStatus,
  bulkUpdateCustomerStatus,
} from '../services/customer.service.js';

/**
 * GET /api/customers
 * List customers with pagination, search, city & status filtering, and batched metrics.
 */
export async function getCustomersHandler(req, res) {
  const result = await listCustomers(req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Customers retrieved successfully');
}

/**
 * GET /api/customers/summary
 * Summary counters for dynamic top dashboard summary cards.
 */
export async function getCustomerSummaryHandler(req, res) {
  const summary = await getCustomerSummary();
  return ApiResponse.success(res, summary, 'Customer summary metrics retrieved successfully');
}

/**
 * GET /api/customers/:id
 * Retrieve customer profile, addresses, recent orders, activity, and metrics.
 */
export async function getCustomerHandler(req, res) {
  const customer = await getCustomerById(req.params.id);
  return ApiResponse.success(res, customer, 'Customer details retrieved successfully');
}

/**
 * GET /api/customers/:id/orders
 * Paginated historical orders for a specific customer.
 */
export async function getCustomerOrdersHandler(req, res) {
  const result = await getCustomerOrders(req.params.id, req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Customer orders retrieved successfully');
}

/**
 * GET /api/customers/:id/activity
 * Paginated chronological activity trail for a specific customer.
 */
export async function getCustomerActivityHandler(req, res) {
  const result = await getCustomerActivity(req.params.id, req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Customer activity trail retrieved successfully');
}

/**
 * PATCH /api/customers/:id
 * Update customer profile. Protected metrics are strictly rejected/ignored.
 */
export async function updateCustomerHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const updated = await updateCustomerProfile(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, updated, 'Customer profile updated successfully');
}

/**
 * PATCH /api/customers/:id/status
 * Toggle or update customer account status (ACTIVE, SUSPENDED, INACTIVE).
 */
export async function updateCustomerStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const updated = await updateCustomerStatus(req.params.id, req.body.status, req.user, ipAddress);
  return ApiResponse.success(res, updated, `Customer account status updated to ${req.body.status}`);
}

/**
 * PATCH /api/customers/bulk-status
 * Bulk status update across multiple selected customers.
 */
export async function bulkUpdateCustomerStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await bulkUpdateCustomerStatus(req.body.ids, req.body.status, req.user, ipAddress);
  return ApiResponse.success(res, result, `Successfully updated status for ${result.affectedCount} customers`);
}
