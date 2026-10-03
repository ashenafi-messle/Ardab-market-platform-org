// ==============================================================================
// Ardab Market - Customer Payment Controller
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { paymentService } from '../services/payment.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

/**
 * POST /api/customer/payments/chapa/initialize
 * Initialize an authoritative Chapa payment session for an order.
 * Accepts optional platform: 'web' | 'android'.
 */
export async function initializePaymentHandler(req, res) {
  const customerId = req.customer.id;
  const { orderId, platform } = req.body;

  if (!orderId) {
    return ApiResponse.error(res, 'ORDER_ID_REQUIRED', 'Order ID is required to initialize payment.', 400);
  }

  // Validate platform strictly: allowed values are 'web' or 'android'
  const normalizedPlatform = (platform || '').toLowerCase().trim();
  const effectivePlatform = ['web', 'android'].includes(normalizedPlatform)
    ? normalizedPlatform
    : 'web'; // Safe default for browser / web clients

  try {
    const result = await paymentService.initializePayment({
      customerId,
      orderId,
      platform: effectivePlatform,
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
  const { tx_ref, trx_ref, status, platform } = req.query;
  const transactionRef = tx_ref || trx_ref;

  // Determine platform strictly: 'web' or 'android'
  const normalizedPlatform = (platform || '').toLowerCase().trim();
  const effectivePlatform = normalizedPlatform === 'android' ? 'android' : 'web';

  let payment = null;
  if (transactionRef) {
    try {
      payment = await prisma.payment.findUnique({
        where: { txRef: transactionRef },
      });

      if (payment && payment.status !== 'SUCCESS') {
        const finalized = await paymentService
          .finalizePaymentWithVerification(transactionRef, {
            actorType: 'STATUS_POLL',
            actorId: payment.customerId,
          })
          .catch((e) => {
            logger.warn('[PaymentCallback] Verification non-critical catch:', e.message);
            return null;
          });

        if (finalized) {
          payment = finalized;
        }
      }
    } catch (err) {
      logger.error('[PaymentCallback] Error during payment lookup/verification:', err.message);
    }
  }

  const finalStatus = payment?.status === 'SUCCESS' ? 'success' : (status || 'pending');

  if (effectivePlatform === 'web') {
    // Web platform: 302 redirect directly to the customer web app callback
    const targetUrl = new URL(
      env.CHAPA_WEB_RETURN_URL || 'https://customer-phi-wheat.vercel.app/payment/chapa/callback'
    );
    if (transactionRef) targetUrl.searchParams.set('tx_ref', transactionRef);
    targetUrl.searchParams.set('status', finalStatus);

    return res.redirect(302, targetUrl.toString());
  }

  // Android platform:
  // Native scheme redirect to ardabmarket://
  const targetMobileScheme = env.CHAPA_MOBILE_RETURN_URL || 'ardabmarket://payment/chapa/callback';
  const separator = targetMobileScheme.includes('?') ? '&' : '?';
  const mobileRedirectUrl = `${targetMobileScheme}${separator}tx_ref=${encodeURIComponent(transactionRef || '')}&status=${encodeURIComponent(finalStatus)}`;

  // Serve clean HTML without any inline script (using meta refresh and anchor link only)
  // Strictly complies with CSP (script-src 'self' without unsafe-inline)
  const safeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0;url=${mobileRedirectUrl}">
  <title>Payment Completed - Ardab Market</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; padding: 36px 28px; border-radius: 20px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
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
    <a href="${mobileRedirectUrl}" class="btn">Open Ardab Market App</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(safeHtml);
}
