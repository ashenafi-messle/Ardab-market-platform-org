// ==============================================================================
// Ardab Market - Authoritative Customer Payment Service (Chapa Escrow)
// ==============================================================================
// Handles customer payments, authoritative amount verification, transaction references,
// server-to-server provider verification, and atomic state finalization.
// ==============================================================================

import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/config/database.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/utils/logger.js';
import { chapaService } from '../../shared/services/chapa.service.js';
import { createCustomerOrderNotification } from './notification.service.js';

const Decimal = Prisma.Decimal;

export class PaymentService {
  /**
   * Generates a cryptographically secure, collision-resistant transaction reference.
   * Format: ARDAB-ORDER-{orderNumber}-{timestampBase36}-{randomHex}
   *
   * @param {string} orderNumber
   * @returns {string}
   */
  generateTxRef(orderNumber) {
    const cleanNum = (orderNumber || 'ORD').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const timeComponent = Date.now().toString(36).toUpperCase();
    const randomComponent = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `ARDAB-ORDER-${cleanNum}-${timeComponent}-${randomComponent}`;
  }

  /**
   * Customer initiates a Chapa payment attempt for an authoritative order.
   *
   * @param {object} params
   * @param {string} params.customerId - Authenticated customer ID (from JWT/session)
   * @param {string} params.orderId - Order UUID to pay
   * @param {string} [params.returnUrl] - Optional mobile deep link or return URL
   * @returns {Promise<{
   *   paymentId: string,
   *   txRef: string,
   *   checkoutUrl: string,
   *   status: string,
   *   amount: string,
   *   currency: string
   * }>}
   */
  async initializePayment({ customerId, orderId, returnUrl }) {
    if (!orderId) {
      const err = new Error('Order ID is required.');
      err.statusCode = 400;
      err.code = 'INVALID_ORDER_ID';
      throw err;
    }

    // 1. Authoritative order retrieval with customer ownership verification
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        status: true,
        paymentStatus: true,
        subtotal: true,
        deliveryFee: true,
        discountAmount: true,
        taxAmount: true,
        totalAmount: true,
        currency: true,
        customer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      err.code = 'ORDER_NOT_FOUND';
      throw err;
    }

    if (order.customerId !== customerId) {
      logger.warn('[PaymentService] Unauthorized order payment attempt', {
        orderId,
        attemptedCustomerId: customerId,
        actualCustomerId: order.customerId,
      });
      const err = new Error('You do not have permission to pay for this order.');
      err.statusCode = 403;
      err.code = 'ORDER_NOT_OWNED';
      throw err;
    }

    // 2. State verification: Reject already paid or cancelled orders
    if (order.paymentStatus === 'PAID') {
      const existingSuccessPayment = await prisma.payment.findFirst({
        where: { orderId, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      });

      return {
        paymentId: existingSuccessPayment?.id || null,
        txRef: existingSuccessPayment?.txRef || null,
        checkoutUrl: null,
        status: 'SUCCESS',
        amount: order.totalAmount.toFixed(2),
        currency: order.currency || 'ETB',
        message: 'Order is already paid.',
      };
    }

    if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
      const err = new Error(`Order is ${order.status.toLowerCase()} and cannot be paid.`);
      err.statusCode = 400;
      err.code = 'ORDER_NOT_PAYABLE';
      throw err;
    }

    // 3. Authoritative financial validation
    const authoritativeAmount = new Decimal(order.totalAmount);
    if (authoritativeAmount.lte(0)) {
      const err = new Error('Invalid payable amount for order.');
      err.statusCode = 400;
      err.code = 'INVALID_PAYMENT_AMOUNT';
      throw err;
    }

    // 4. Duplicate protection & reuse of active checkout session
    const existingActivePayment = await prisma.payment.findFirst({
      where: {
        orderId,
        status: { in: ['PENDING', 'PROCESSING'] },
        checkoutUrl: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingActivePayment && existingActivePayment.checkoutUrl) {
      const minutesSinceCreation =
        (Date.now() - new Date(existingActivePayment.createdAt).getTime()) / (1000 * 60);

      // Chapa checkout sessions typically remain active for 30 minutes; reuse within 20m
      if (minutesSinceCreation < 20) {
        logger.info('[PaymentService] Reusing active pending payment session', {
          paymentId: existingActivePayment.id,
          txRef: existingActivePayment.txRef,
        });

        return {
          paymentId: existingActivePayment.id,
          txRef: existingActivePayment.txRef,
          checkoutUrl: existingActivePayment.checkoutUrl,
          status: existingActivePayment.status,
          amount: existingActivePayment.amount.toFixed(2),
          currency: existingActivePayment.currency,
        };
      }
    }

    // 5. Generate secure transaction reference and local records
    const txRef = this.generateTxRef(order.orderNumber);

    // Split customer name cleanly for Chapa
    const nameParts = (order.customer?.fullName || 'Valued Customer').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || 'Shopper';

    // Format phone number to clean digits
    let customerPhone = (order.customer?.phone || '').replace(/[^0-9]/g, '');
    if (customerPhone.startsWith('251')) customerPhone = '0' + customerPhone.slice(3);

    // Create Payment in PENDING state within local atomic transaction
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          provider: 'CHAPA',
          txRef,
          amount: authoritativeAmount,
          currency: 'ETB',
          status: 'PENDING',
          paymentMethod: 'UNKNOWN',
          initiatedAt: new Date(),
        },
      });

      await tx.paymentAttempt.create({
        data: {
          paymentId: p.id,
          attemptNumber: 1,
          txRef,
          status: 'PENDING',
          amount: authoritativeAmount,
        },
      });

      await tx.paymentAuditLog.create({
        data: {
          paymentId: p.id,
          event: 'PAYMENT_CREATED',
          previousStatus: null,
          newStatus: 'PENDING',
          actorType: 'CUSTOMER',
          actorId: customerId,
          metadata: JSON.stringify({
            orderId: order.id,
            orderNumber: order.orderNumber,
            amount: authoritativeAmount.toFixed(2),
          }),
        },
      });

      return p;
    });

    // 6. External Call to Chapa Hosted Checkout (OUTSIDE DB TRANSACTION)
    let chapaResponse;
    try {
      chapaResponse = await chapaService.initializeTransaction({
        amount: authoritativeAmount.toFixed(2),
        currency: 'ETB',
        email: order.customer?.email || 'customer@ardabmarket.com',
        firstName,
        lastName,
        phoneNumber: customerPhone || undefined,
        txRef,
        returnUrl: returnUrl || undefined,
        customization: {
          title: `Ardab Market (#${order.orderNumber})`,
          description: `Payment for Order #${order.orderNumber}`,
        },
      });
    } catch (err) {
      logger.error('[PaymentService] Chapa initialization failed', {
        error: err.message,
        paymentId: payment.id,
        txRef,
      });

      // Update payment record to FAILED
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: `Initialization error: ${err.message}`,
        },
      }).catch(() => {});

      await prisma.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          event: 'PAYMENT_FAILED',
          previousStatus: 'PENDING',
          newStatus: 'FAILED',
          actorType: 'SYSTEM',
          metadata: JSON.stringify({ error: err.message }),
        },
      }).catch(() => {});

      const publicError = new Error('Failed to initiate Chapa payment gateway. Please try again.');
      publicError.statusCode = 502;
      publicError.code = 'PAYMENT_INITIALIZATION_FAILED';
      throw publicError;
    }

    // 7. Update Payment with checkout URL and transition to PROCESSING
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        checkoutUrl: chapaResponse.checkoutUrl,
        status: 'PROCESSING',
        processingAt: new Date(),
      },
    });

    await prisma.paymentAuditLog.create({
      data: {
        paymentId: payment.id,
        event: 'CHECKOUT_INITIALIZED',
        previousStatus: 'PENDING',
        newStatus: 'PROCESSING',
        actorType: 'SYSTEM',
        metadata: JSON.stringify({ txRef, checkoutUrl: chapaResponse.checkoutUrl }),
      },
    }).catch(() => {});

    return {
      paymentId: updatedPayment.id,
      txRef,
      checkoutUrl: updatedPayment.checkoutUrl,
      status: 'PROCESSING',
      amount: authoritativeAmount.toFixed(2),
      currency: 'ETB',
    };
  }

  /**
   * Finalizes a payment via authoritative server-to-server Chapa verification.
   * Atomic, idempotent, concurrency-safe.
   *
   * @param {string} txRef - Unique transaction reference
   * @param {object} options
   * @param {string} options.actorType - 'WEBHOOK' | 'STATUS_POLL' | 'ADMIN'
   * @param {string} [options.actorId] - Actor identifier
   * @returns {Promise<object>} Finalized payment state
   */
  async finalizePaymentWithVerification(txRef, { actorType = 'SYSTEM', actorId = null } = {}) {
    if (!txRef) {
      throw new Error('txRef is required for verification.');
    }

    // 1. Locate local payment record
    const payment = await prisma.payment.findUnique({
      where: { txRef },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            customerId: true,
          },
        },
      },
    });

    if (!payment) {
      logger.warn('[PaymentService] Payment not found for txRef during verification', { txRef });
      const err = new Error('Payment not found for transaction reference.');
      err.statusCode = 404;
      err.code = 'PAYMENT_NOT_FOUND';
      throw err;
    }

    // 2. If already SUCCESS, return immediately (Idempotency)
    if (payment.status === 'SUCCESS' && payment.order?.paymentStatus === 'PAID') {
      logger.info('[PaymentService] Payment already marked SUCCESS (idempotent)', {
        paymentId: payment.id,
        txRef,
      });
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNumber: payment.order?.orderNumber,
        status: 'SUCCESS',
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
        paidAt: payment.paidAt,
        isSuccess: true,
      };
    }

    // 3. Server-to-server verification with Chapa API (OUTSIDE DB TRANSACTION)
    let verifyResult;
    try {
      verifyResult = await chapaService.verifyTransaction(txRef);
    } catch (err) {
      logger.error('[PaymentService] Chapa verification API call failed', {
        txRef,
        error: err.message,
      });
      // Do not mark failed prematurely if network error
      const error = new Error('Payment verification currently unavailable. Status will be confirmed shortly.');
      error.statusCode = 502;
      error.code = 'PROVIDER_UNAVAILABLE';
      throw error;
    }

    // 4. Validate financial and currency integrity
    const expectedAmount = new Decimal(payment.amount);
    const verifiedAmount = new Decimal(verifyResult.amount || 0);

    if (verifyResult.isSuccess && !expectedAmount.equals(verifiedAmount)) {
      logger.error('[PaymentService] CRITICAL: Amount mismatch during verification', {
        txRef,
        expected: expectedAmount.toFixed(2),
        verified: verifiedAmount.toFixed(2),
      });

      await prisma.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          event: 'PAYMENT_AMOUNT_MISMATCH',
          previousStatus: payment.status,
          newStatus: 'FAILED',
          actorType: 'SECURITY',
          metadata: JSON.stringify({
            expected: expectedAmount.toFixed(2),
            received: verifiedAmount.toFixed(2),
          }),
        },
      });

      const mismatchError = new Error('Security Error: Payment amount mismatch.');
      mismatchError.statusCode = 400;
      mismatchError.code = 'PAYMENT_AMOUNT_MISMATCH';
      throw mismatchError;
    }

    if (verifyResult.isSuccess && verifyResult.currency !== 'ETB') {
      logger.error('[PaymentService] CRITICAL: Currency mismatch during verification', {
        txRef,
        currency: verifyResult.currency,
      });
      const currencyError = new Error('Security Error: Invalid payment currency.');
      currencyError.statusCode = 400;
      currencyError.code = 'PAYMENT_CURRENCY_MISMATCH';
      throw currencyError;
    }

    // 5. Short Atomic Database Transaction around local state changes
    const finalized = await prisma.$transaction(async (tx) => {
      // Re-read with row lock semantics (in Prisma read within transaction)
      const current = await tx.payment.findUnique({
        where: { id: payment.id },
      });

      if (current.status === 'SUCCESS') {
        return current;
      }

      if (verifyResult.isSuccess) {
        // Atomic conditional update to prevent concurrent double-finalization
        const updateResult = await tx.payment.updateMany({
          where: { id: payment.id, status: { not: 'SUCCESS' } },
          data: {
            status: 'SUCCESS',
            paidAt: new Date(),
            chapaReference: verifyResult.reference,
            providerStatus: verifyResult.status,
            paymentMethod: verifyResult.paymentMethod || 'UNKNOWN',
          },
        });

        const updatedPayment = await tx.payment.findUnique({
          where: { id: payment.id },
        });

        // If another concurrent worker already marked it SUCCESS, exit cleanly
        if (updateResult.count === 0) {
          return updatedPayment;
        }

        // Update PaymentAttempt
        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id, txRef },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
          },
        });

        // Mark Order PAID & CONFIRMED
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: 'PAID',
            status: payment.order.status === 'PENDING' ? 'CONFIRMED' : payment.order.status,
            confirmedAt: payment.order.status === 'PENDING' ? new Date() : undefined,
          },
        });

        // Record Order Activity
        await tx.orderActivity.create({
          data: {
            orderId: payment.orderId,
            action: 'Payment Confirmed',
            fromStatus: payment.order.status,
            toStatus: payment.order.status === 'PENDING' ? 'CONFIRMED' : payment.order.status,
            description: `Payment of ${expectedAmount.toFixed(2)} ETB verified via Chapa (${verifyResult.paymentMethod || 'Escrow'}). TxRef: ${txRef}`,
            actor: 'System',
          },
        });

        // Audit Log
        await tx.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            event: 'PAYMENT_SUCCEEDED',
            previousStatus: current.status,
            newStatus: 'SUCCESS',
            actorType,
            actorId,
            metadata: JSON.stringify({
              txRef,
              chapaReference: verifyResult.reference,
              paymentMethod: verifyResult.paymentMethod,
              amount: expectedAmount.toFixed(2),
            }),
          },
        });

        return updatedPayment;
      } else {
        // Verification indicated non-success
        const failedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            providerStatus: verifyResult.status,
            failureReason: `Chapa reported status: ${verifyResult.status}`,
          },
        });

        await tx.paymentAttempt.updateMany({
          where: { paymentId: payment.id, txRef },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: `Chapa reported status: ${verifyResult.status}`,
          },
        });

        await tx.paymentAuditLog.create({
          data: {
            paymentId: payment.id,
            event: 'PAYMENT_FAILED',
            previousStatus: current.status,
            newStatus: 'FAILED',
            actorType,
            actorId,
            metadata: JSON.stringify({
              txRef,
              providerStatus: verifyResult.status,
            }),
          },
        });

        return failedPayment;
      }
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    // 6. Post-transaction async notification dispatch
    if (finalized.status === 'SUCCESS') {
      createCustomerOrderNotification(
        {
          id: payment.orderId,
          customerId: payment.customerId,
          orderNumber: payment.order?.orderNumber,
        },
        'ORDER_CONFIRMED',
        `Your payment for order #${payment.order?.orderNumber} has been confirmed.`
      ).catch((e) => logger.warn('[PaymentService] Notification failed:', e.message));
    }

    return {
      paymentId: finalized.id,
      orderId: payment.orderId,
      orderNumber: payment.order?.orderNumber,
      status: finalized.status,
      amount: finalized.amount.toFixed(2),
      currency: finalized.currency,
      paidAt: finalized.paidAt,
      isSuccess: finalized.status === 'SUCCESS',
      failureReason: finalized.failureReason || null,
    };
  }

  /**
   * Retrieves live payment status for customer mobile app with automatic on-demand verification.
   *
   * @param {string} customerId - Authenticated customer ID
   * @param {string} paymentId - Payment UUID
   * @returns {Promise<object>} Safe public payment status
   */
  async getPaymentStatus(customerId, paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
          },
        },
      },
    });

    if (!payment) {
      const err = new Error('Payment record not found.');
      err.statusCode = 404;
      err.code = 'PAYMENT_NOT_FOUND';
      throw err;
    }

    if (payment.customerId !== customerId) {
      const err = new Error('You do not have access to this payment record.');
      err.statusCode = 403;
      err.code = 'PAYMENT_NOT_OWNED';
      throw err;
    }

    // If still in PENDING or PROCESSING and created more than 4 seconds ago,
    // execute an on-demand server verification in case webhook was delayed or mobile returned
    if (payment.status === 'PROCESSING' || payment.status === 'PENDING') {
      const secondsSinceInit = (Date.now() - new Date(payment.initiatedAt).getTime()) / 1000;
      if (secondsSinceInit >= 4) {
        try {
          const verified = await this.finalizePaymentWithVerification(payment.txRef, {
            actorType: 'STATUS_POLL',
            actorId: customerId,
          });
          return {
            paymentId: verified.paymentId,
            orderId: verified.orderId,
            orderNumber: verified.orderNumber,
            status: verified.status,
            amount: verified.amount,
            currency: verified.currency,
            paidAt: verified.paidAt,
            isSuccess: verified.isSuccess,
            failureReason: verified.failureReason,
          };
        } catch (e) {
          // If verification is inconclusive or rate-limited, fall back to current status
          logger.info('[PaymentService] On-demand verification poll deferred', {
            paymentId,
            reason: e.message,
          });
        }
      }
    }

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order?.orderNumber,
      status: payment.status,
      amount: payment.amount.toFixed(2),
      currency: payment.currency,
      paidAt: payment.paidAt,
      isSuccess: payment.status === 'SUCCESS',
      failureReason: payment.failureReason,
    };
  }

  /**
   * Cursor-based payment history for customer profile.
   *
   * @param {string} customerId
   * @param {object} query - { cursor, limit }
   */
  async getCustomerPaymentHistory(customerId, { cursor, limit = 20 } = {}) {
    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const queryArgs = {
      where: { customerId },
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderId: true,
        txRef: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
        paidAt: true,
        createdAt: true,
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
    };

    if (cursor) {
      queryArgs.cursor = { id: cursor };
      queryArgs.skip = 1;
    }

    const items = await prisma.payment.findMany(queryArgs);
    const hasMore = items.length > take;
    const records = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore ? records[records.length - 1].id : null;

    return {
      items: records.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || '',
        txRef: p.txRef,
        amount: p.amount.toFixed(2),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Admin paginated payment listing and filtering.
   *
   * @param {object} params
   */
  async getAdminPayments({
    status,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 20,
  } = {}) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * pageSize;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { txRef: { contains: search, mode: 'insensitive' } },
        { chapaReference: { contains: search, mode: 'insensitive' } },
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          customerId: true,
          provider: true,
          txRef: true,
          chapaReference: true,
          amount: true,
          currency: true,
          status: true,
          paymentMethod: true,
          providerStatus: true,
          failureReason: true,
          initiatedAt: true,
          paidAt: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
              status: true,
            },
          },
          customer: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          },
          refunds: {
            select: {
              id: true,
              amount: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    return {
      payments: items.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber,
        customerName: p.customer?.fullName || 'Customer',
        customerPhone: p.customer?.phone || '',
        customerEmail: p.customer?.email || '',
        txRef: p.txRef,
        chapaReference: p.chapaReference,
        amount: p.amount.toFixed(2),
        currency: p.currency,
        status: p.status,
        paymentMethod: p.paymentMethod,
        providerStatus: p.providerStatus,
        failureReason: p.failureReason,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
        refundsCount: p.refunds?.length || 0,
      })),
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Admin initiate refund record.
   *
   * @param {string} paymentId
   * @param {object} payload
   * @param {string} adminId
   */
  async createPaymentRefund(paymentId, { amount, reason }, adminId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      const err = new Error('Payment not found.');
      err.statusCode = 404;
      throw err;
    }

    if (payment.status !== 'SUCCESS' && payment.status !== 'PARTIALLY_REFUNDED') {
      const err = new Error('Only successful payments can be refunded.');
      err.statusCode = 400;
      throw err;
    }

    const refundAmount = new Decimal(amount || payment.amount);
    if (refundAmount.lte(0) || refundAmount.gt(payment.amount)) {
      const err = new Error('Refund amount must be greater than 0 and cannot exceed the original payment.');
      err.statusCode = 400;
      throw err;
    }

    const refund = await prisma.$transaction(async (tx) => {
      const r = await tx.paymentRefund.create({
        data: {
          paymentId: payment.id,
          amount: refundAmount,
          status: 'REQUESTED',
          reason: reason || 'Customer requested refund',
          requestedBy: adminId || 'Admin',
        },
      });

      await tx.paymentAuditLog.create({
        data: {
          paymentId: payment.id,
          event: 'REFUND_REQUESTED',
          previousStatus: payment.status,
          newStatus: payment.status,
          actorType: 'ADMIN',
          actorId: adminId,
          metadata: JSON.stringify({
            refundId: r.id,
            amount: refundAmount.toFixed(2),
            reason,
          }),
        },
      });

      return r;
    });

    return {
      refundId: refund.id,
      paymentId: payment.id,
      amount: refundAmount.toFixed(2),
      status: refund.status,
      message: 'Refund requested. Provider refund processing is required.',
    };
  }
}

export const paymentService = new PaymentService();
