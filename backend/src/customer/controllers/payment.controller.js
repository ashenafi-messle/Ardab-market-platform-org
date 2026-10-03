// ==============================================================================
// Ardab Market - Customer Payment Controller
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
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
    return ApiResponse.error(res, 'ORDER_ID_REQUIRED', 'Order ID is required to initialize payment.', 400);
  }

  try {
    const result = await paymentService.initializePayment({
      customerId,
      orderId,
      returnUrl,
    });

    return ApiResponse.success(res, result, 'Payment session initialized successfully.');
  } catch (err) {
    const status = Number(err.statusCode || err.status) || 500;
    return ApiResponse.error(
      res,
      err.code || 'PAYMENT_INITIALIZATION_FAILED',
      err.message || 'Failed to initialize payment session.',
      status
    );
  }
}

/**
 * GET /api/customer/payments/:paymentId/status
 * Retrieve live payment status with on-demand verification for mobile recovery.
 */
export async function getPaymentStatusHandler(req, res) {
  const customerId = req.customer.id;
  const { paymentId } = req.params;

  if (!paymentId) {
    return ApiResponse.error(res, 'PAYMENT_ID_REQUIRED', 'Payment ID is required.', 400);
  }

  try {
    const result = await paymentService.getPaymentStatus(customerId, paymentId);
    return ApiResponse.success(res, result, 'Payment status retrieved.');
  } catch (err) {
    const status = Number(err.statusCode || err.status) || 500;
    return ApiResponse.error(
      res,
      err.code || 'PAYMENT_STATUS_FAILED',
      err.message || 'Failed to retrieve payment status.',
      status
    );
  }
}

/**
 * GET /api/customer/payments/history
 * Paginated transaction history for the authenticated customer.
 */
export async function getCustomerPaymentHistoryHandler(req, res) {
  const customerId = req.customer.id;
  const { cursor, limit } = req.query;

  try {
    const result = await paymentService.getCustomerPaymentHistory(customerId, {
      cursor,
      limit,
    });
    return ApiResponse.success(res, result, 'Payment history retrieved.');
  } catch (err) {
    const status = Number(err.statusCode || err.status) || 500;
    return ApiResponse.error(
      res,
      err.code || 'PAYMENT_HISTORY_FAILED',
      err.message || 'Failed to retrieve payment history.',
      status
    );
  }
}

/**
 * GET /api/customer/payments/chapa/callback
 * Browser return endpoint for Chapa hosted checkout redirects.
 * Triggers server-side verification and redirects to the mobile deep link or web app.
 */
export async function paymentReturnCallbackHandler(req, res) {
  const { tx_ref, trx_ref, status, deep_link } = req.query;
  const transactionRef = tx_ref || trx_ref;

  if (transactionRef) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { txRef: transactionRef },
      });
      if (payment && payment.status !== 'SUCCESS') {
        await paymentService.finalizePaymentWithVerification(payment.id, payment.customerId).catch(() => {});
      }
    } catch {
      // Continue to redirect even if immediate verification fails
    }
  }

  // Determine redirect URL
  const targetDeepLink = deep_link || 'ardabmarket://payment/chapa/callback';
  const separator = targetDeepLink.includes('?') ? '&' : '?';
  const redirectUrl = `${targetDeepLink}${separator}tx_ref=${encodeURIComponent(transactionRef || '')}&status=${encodeURIComponent(status || 'success')}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Completed - Ardab Market</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 36px 28px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); max-width: 440px; width: 100%; text-align: center; }
    .icon { width: 64px; height: 64px; border-radius: 50%; background: #10b981; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 10px; color: #ffffff; }
    p { font-size: 15px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .btn { display: block; width: 100%; background: #2563eb; color: #ffffff; padding: 14px 20px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Payment Completed</h1>
    <p>Your payment session has finished. Returning you to the Ardab Market app...</p>
    <a href="${redirectUrl}" id="returnBtn" class="btn">Return to App</a>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${redirectUrl}";
    }, 600);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
