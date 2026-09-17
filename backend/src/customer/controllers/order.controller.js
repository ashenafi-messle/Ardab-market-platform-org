// ==============================================================================
// Ardab Market - Customer Mobile App Order Checkout Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { checkoutCustomerOrder } from '../../admin/services/order.service.js';

/**
 * POST /api/customer/orders/checkout
 * Safely creates an order placed by a customer from the mobile application.
 */
export async function customerCheckoutHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  // If customer auth is implemented, req.customer?.id is used; otherwise customerId in body
  const customerId = req.customer?.id || req.body.customerId;
  const order = await checkoutCustomerOrder(req.body, customerId, ipAddress);
  return ApiResponse.success(res, order, 'Order placed successfully', 201);
}
