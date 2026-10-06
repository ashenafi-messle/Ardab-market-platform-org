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
 * Accepts platform: 'WEB' | 'ANDROID' (case-insensitive).
 */
export async function initializePaymentHandler(req, res) {
  const customerId = req.customer.id;
  const { orderId, platform } = req.body;

  if (!orderId) {
    return ApiResponse.error(res, 'ORDER_ID_REQUIRED', 'Order ID is required to initialize payment.', 400);
  }

  // Validate platform strictly: allowed values are 'WEB' or 'ANDROID'
  const normalizedPlatform = (platform || '').toUpperCase().trim();
  const effectivePlatform = normalizedPlatform === 'WEB' ? 'WEB' : 'ANDROID';

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
 * GET /api/payments/chapa/return
 * Central HTTPS return gateway on Ardab backend.
 *
 * Flow:
 * 1. Receive transaction reference from Chapa return redirect.
 * 2. Find Payment record in database.
 * 3. Verify payment server-side if not already verified.
 * 4. Check Payment.platform:
 *    - ANDROID: HTTP 302 redirect to ardabmarket://payment/chapa/callback?paymentId=<PAYMENT_ID>
 *    - WEB: HTTP 302 redirect to https://customer-phi-wheat.vercel.app/payment/chapa/callback?paymentId=<PAYMENT_ID>&tx_ref=<tx_ref>
 * 5. Clean HTTP 302 redirect with zero inline scripts, completely CSP-safe.
 */
export async function chapaReturnHandler(req, res) {
  const { tx_ref, trx_ref, reference, paymentId, status } = req.query;
  const transactionRef = tx_ref || trx_ref || reference;

  logger.info('[ChapaReturn] Customer returned from Chapa checkout', {
    transactionRef,
    paymentId,
    status,
    userAgent: req.headers['user-agent'],
  });

  let payment = null;

  try {
    if (paymentId) {
      payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });
    }

    if (!payment && transactionRef) {
      payment = await prisma.payment.findUnique({
        where: { txRef: transactionRef },
      });
    }

    if (!payment && transactionRef) {
      payment = await prisma.payment.findFirst({
        where: { chapaReference: transactionRef },
      });
    }

    // Verify payment server-side if not already verified as SUCCESS
    if (payment && payment.status !== 'SUCCESS') {
      const finalized = await paymentService
        .finalizePaymentWithVerification(payment.txRef, {
          actorType: 'STATUS_POLL',
          actorId: payment.customerId,
        })
        .catch((e) => {
          logger.warn('[ChapaReturn] On-demand verification non-critical error:', e.message);
          return null;
        });

      if (finalized) {
        payment = await prisma.payment.findUnique({
          where: { id: payment.id },
        });
      }
    }
  } catch (err) {
    logger.error('[ChapaReturn] Exception during return verification:', err.message);
  }

  // Determine originating platform
  const storedPlatform = (payment?.platform || '').toUpperCase().trim();
  const isAndroid = storedPlatform === 'ANDROID' || (
    !storedPlatform && (req.headers['user-agent'] || '').toLowerCase().includes('android')
  );

  const finalPaymentId = payment?.id || paymentId || '';
  const finalTxRef = payment?.txRef || transactionRef || '';

  if (isAndroid || storedPlatform === 'ANDROID') {
    // Android platform: Server-side HTTP 302 redirect to native custom URI scheme
    const targetScheme = env.CHAPA_MOBILE_RETURN_URL || 'ardabmarket://payment/chapa/callback';
    const separator = targetScheme.includes('?') ? '&' : '?';
    const mobileRedirectUrl = `${targetScheme}${separator}paymentId=${encodeURIComponent(finalPaymentId)}${finalTxRef ? `&tx_ref=${encodeURIComponent(finalTxRef)}` : ''}`;

    logger.info('[ChapaReturn] Issuing 302 redirect to Android native scheme', {
      redirectUrl: mobileRedirectUrl,
      paymentId: finalPaymentId,
    });

    return res.redirect(302, mobileRedirectUrl);
  }

  // Web platform: Server-side HTTP 302 redirect to customer web callback
  const targetWebUrl = new URL(
    env.CHAPA_WEB_RETURN_URL || 'https://customer-phi-wheat.vercel.app/payment/chapa/callback'
  );
  if (finalPaymentId) targetWebUrl.searchParams.set('paymentId', finalPaymentId);
  if (finalTxRef) targetWebUrl.searchParams.set('tx_ref', finalTxRef);
  targetWebUrl.searchParams.set('status', payment?.status === 'SUCCESS' ? 'success' : (status || 'pending'));

  logger.info('[ChapaReturn] Issuing 302 redirect to Customer Web callback', {
    redirectUrl: targetWebUrl.toString(),
    paymentId: finalPaymentId,
  });

  return res.redirect(302, targetWebUrl.toString());
}

/**
 * GET/POST /api/payments/chapa/callback
 * Server-side callback endpoint for Chapa.
 *
 * Flow:
 * 1. Receive Chapa callback data.
 * 2. Extract tx_ref/trx_ref correctly.
 * 3. Find Ardab Payment record.
 * 4. Call Chapa verify endpoint.
 * 5. Verify status, tx_ref, amount, currency, mode.
 * 6. Update Payment.status = SUCCESS and Order.paymentStatus = PAID.
 * 7. Database update is atomic and idempotent.
 */
export async function chapaCallbackHandler(req, res) {
  const transactionRef =
    req.query.tx_ref ||
    req.query.trx_ref ||
    req.body?.tx_ref ||
    req.body?.trx_ref ||
    req.query.reference ||
    req.body?.reference;

  logger.info('[ChapaCallback] Processing Chapa callback request', {
    transactionRef,
    method: req.method,
    query: req.query,
  });

  if (!transactionRef) {
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(302, '/api/payments/chapa/return');
    }
    return res.status(400).json({ status: 'failed', message: 'Missing transaction reference in callback.' });
  }

  try {
    const verified = await paymentService.finalizePaymentWithVerification(transactionRef, {
      actorType: 'CALLBACK',
    });

    // If browser navigates directly to /callback, redirect to /return
    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(302, `/api/payments/chapa/return?tx_ref=${encodeURIComponent(transactionRef)}`);
    }

    return res.status(200).json({
      status: 'success',
      message: 'Payment verified and marked PAID.',
      data: {
        paymentId: verified.paymentId,
        orderId: verified.orderId,
        status: verified.status,
      },
    });
  } catch (err) {
    logger.error('[ChapaCallback] Error verifying callback transaction:', err.message);

    if (req.headers.accept?.includes('text/html')) {
      return res.redirect(302, `/api/payments/chapa/return?tx_ref=${encodeURIComponent(transactionRef)}&status=failed`);
    }

    return res.status(200).json({
      status: 'failed',
      message: err.message,
    });
  }
}

// Backward compatibility alias
export const paymentReturnCallbackHandler = chapaReturnHandler;

