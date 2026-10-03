// ==============================================================================
// Ardab Market - Customer Payment Controller
// ==============================================================================

import { paymentService } from '../services/payment.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

/**
 * POST /api/customer/payments/chapa/initialize
 * Initialize an authoritative Chapa payment session for an order.
 */
export async function initializePaymentHandler(req, res) {
  const customerId = req.customer.id;
  const { orderId, returnUrl } = req.body;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'ORDER_ID_REQUIRED',
        message: 'Order ID is required to initialize payment.',
      },
    });
  }

  const result = await paymentService.initializePayment({
    customerId,
    orderId,
    returnUrl,
  });

  return res.status(200).json(
    ApiResponse.success(result, 'Payment session initialized successfully.')
  );
}

/**
 * GET /api/customer/payments/:paymentId/status
 * Retrieve live payment status with on-demand verification for mobile recovery.
 */
export async function getPaymentStatusHandler(req, res) {
  const customerId = req.customer.id;
  const { paymentId } = req.params;

  if (!paymentId) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PAYMENT_ID_REQUIRED',
        message: 'Payment ID is required.',
      },
    });
  }

  const result = await paymentService.getPaymentStatus(customerId, paymentId);

  return res.status(200).json(
    ApiResponse.success(result, 'Payment status retrieved.')
  );
}

/**
 * GET /api/customer/payments/history
 * Paginated transaction history for the authenticated customer.
 */
export async function getCustomerPaymentHistoryHandler(req, res) {
  const customerId = req.customer.id;
  const { cursor, limit } = req.query;

  const result = await paymentService.getCustomerPaymentHistory(customerId, {
    cursor,
    limit,
  });

  return res.status(200).json(
    ApiResponse.success(result, 'Payment history retrieved.')
  );
}
