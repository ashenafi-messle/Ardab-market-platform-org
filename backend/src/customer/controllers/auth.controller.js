// ==============================================================================
// Ardab Market - Customer Mobile Authentication Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { registerCustomer } from '../../admin/services/customer.service.js';

/**
 * POST /api/customer/auth/register
 * Mobile App Customer Registration.
 */
export async function registerCustomerHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const customer = await registerCustomer(req.body, ipAddress);
  return ApiResponse.success(res, customer, 'Customer registered successfully', 201);
}
