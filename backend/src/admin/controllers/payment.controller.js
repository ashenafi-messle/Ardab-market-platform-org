// ==============================================================================
// Ardab Market - Admin Payment Controller (Super Admin & Sub Admin)
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { paymentService } from '../../customer/services/payment.service.js';
import { collectCodOrderPayment } from '../services/order.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

/**
 * GET /api/admin/payments
 * Paginated and filtered payment listing for administrators.
 */
export async function listPaymentsHandler(req, res) {
  const { status, provider, paymentMethod, startDate, endDate, search, page, limit } = req.query;

  const result = await paymentService.getAdminPayments({
    status,
    provider,
    paymentMethod,
    startDate,
    endDate,
    search,
    page,
    limit,
  });

  return ApiResponse.success(res, result, 'Payments retrieved successfully.');
}

/**
 * GET /api/admin/payments/:id
 * Retrieve single payment with complete audit trail and attempts.
 */
export async function getPaymentDetailsHandler(req, res) {
  const { id } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          currency: true,
          deliveryFee: true,
          discountAmount: true,
          placedAt: true,
        },
      },
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          customerCode: true,
        },
      },
      attempts: {
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
      },
      refunds: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!payment) {
    return ApiResponse.error(res, 'PAYMENT_NOT_FOUND', 'Payment not found.', 404);
  }

  return ApiResponse.success(res, payment, 'Payment details retrieved.');
}

/**
 * POST /api/admin/payments/:id/refund
 * Administrative refund request creation.
 */
export async function createRefundHandler(req, res) {
  const { id } = req.params;
  const { amount, reason } = req.body;
  const adminId = req.admin?.id || 'Admin';

  const result = await paymentService.createPaymentRefund(
    id,
    { amount, reason },
    adminId
  );

  return ApiResponse.success(res, result, 'Payment refund requested successfully.');
}

/**
 * POST /api/admin/payments/:id/collect-cod
 * Administrative cash collection by payment ID.
 */
export async function collectCodPaymentByIdHandler(req, res) {
  const { id } = req.params;
  const { notes } = req.body || {};

  const payment = await prisma.payment.findUnique({
    where: { id },
  });

  if (!payment) {
    return ApiResponse.error(res, 'PAYMENT_NOT_FOUND', 'Payment not found.', 404);
  }

  const result = await collectCodOrderPayment(payment.orderId, req.admin || req.user, { notes });
  return ApiResponse.success(res, result, 'Cash on Delivery payment collected successfully.');
}

