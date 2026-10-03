// ==============================================================================
// Ardab Market - Admin Payment Controller (Super Admin & Sub Admin)
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { paymentService } from '../../customer/services/payment.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

/**
 * GET /api/admin/payments
 * Paginated and filtered payment listing for administrators.
 */
export async function listPaymentsHandler(req, res) {
  const { status, startDate, endDate, search, page, limit } = req.query;

  const result = await paymentService.getAdminPayments({
    status,
    startDate,
    endDate,
    search,
    page,
    limit,
  });

  return res.status(200).json(
    ApiResponse.success(result, 'Payments retrieved successfully.')
  );
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
    return res.status(404).json({
      success: false,
      error: {
        code: 'PAYMENT_NOT_FOUND',
        message: 'Payment not found.',
      },
    });
  }

  return res.status(200).json(
    ApiResponse.success(payment, 'Payment details retrieved.')
  );
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

  return res.status(200).json(
    ApiResponse.success(result, 'Payment refund requested successfully.')
  );
}
