// ==============================================================================
// Ardab Market - Customer Order Service (Customer-Facing Operations)
// ==============================================================================
// Wraps the admin order service with customer-specific IDOR protection,
// cancellation policy enforcement, and timeline formatting.

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import {
  getOrderById,
  checkoutCustomerOrder,
} from '../../admin/services/order.service.js';

// Statuses from which a customer is allowed to cancel their own order
const CUSTOMER_CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

/**
 * Lists orders for a specific customer (IDOR-safe, customer-scoped).
 *
 * @param {string} customerId
 * @param {object} queryOptions
 * @returns {Promise<{orders: any[], pagination: object}>}
 */
export async function getMyOrders(customerId, queryOptions = {}) {
  const {
    page = 1,
    pageSize = 10,
    status,
    paymentStatus,
    startDate,
    endDate,
    sortBy = 'placedAt',
    sortOrder = 'desc',
  } = queryOptions;

  const take = Math.min(Math.max(Number(pageSize), 1), 50);
  const skip = (Math.max(Number(page), 1) - 1) * take;

  // Base where: always scoped to the authenticated customer
  const where = { customerId };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== 'ALL') {
    where.paymentStatus = paymentStatus;
  }

  if (startDate || endDate) {
    where.placedAt = {};
    if (startDate) where.placedAt.gte = new Date(startDate);
    if (endDate) where.placedAt.lte = new Date(endDate);
  }

  const allowedSorts = ['placedAt', 'createdAt', 'totalAmount', 'status'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'placedAt';
  const sortDir = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, rawOrders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortDir },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
        },
        deliveryAddressSnapshot: true,
        delivery: {
          select: {
            id: true,
            deliveryNumber: true,
            status: true,
            estimatedDeliveryAt: true,
            deliveredAt: true,
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / take) || 1;

  return {
    orders: rawOrders.map(formatCustomerOrder),
    pagination: {
      page: Number(page),
      pageSize: take,
      total,
      totalPages,
    },
  };
}

/**
 * Gets a single order for a customer — enforces IDOR protection.
 *
 * @param {string} orderId
 * @param {string} customerId
 * @returns {Promise<object>}
 */
export async function getMyOrderById(orderId, customerId) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId, // Strict IDOR guard
    },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
        },
      },
      deliveryAddressSnapshot: true,
      activities: {
        orderBy: { createdAt: 'asc' },
      },
      delivery: true,
    },
  });

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  return formatCustomerOrder(order);
}

/**
 * Allows a customer to cancel their own order.
 * Enforces status-machine: only PENDING or CONFIRMED orders can be cancelled.
 *
 * @param {string} orderId
 * @param {string} customerId
 * @param {string} reason
 * @returns {Promise<object>}
 */
export async function cancelMyOrder(orderId, customerId, reason) {
  // IDOR check: order must belong to this customer
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    select: { id: true, orderNumber: true, status: true, customerId: true },
  });

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    throw ApiError.badRequest(
      `Order cannot be cancelled. Only orders in PENDING or CONFIRMED status can be cancelled by customers. ` +
      `Current status: ${order.status}.`
    );
  }

  const cancelledOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledReason: reason,
      },
      include: {
        items: true,
        deliveryAddressSnapshot: true,
        activities: { orderBy: { createdAt: 'asc' } },
        delivery: true,
      },
    });

    // Activity log
    await tx.orderActivity.create({
      data: {
        orderId,
        action: 'Order Cancelled by Customer',
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        description: `Order ${order.orderNumber} was cancelled by the customer. Reason: ${reason}`,
        actor: 'Customer',
      },
    });

    // Customer activity log
    await tx.customerActivity.create({
      data: {
        customerId,
        action: 'ORDER_CANCELLED',
        description: `Cancelled order ${order.orderNumber}. Reason: ${reason}`,
        actor: 'Customer',
        metadata: JSON.stringify({ orderId, orderNumber: order.orderNumber, reason }),
      },
    });

    return updated;
  }, {
    maxWait: 10000,
    timeout: 20000,
  });

  return formatCustomerOrder(cancelledOrder);
}

/**
 * Customer-friendly order format (exposes only customer-relevant fields).
 * Hides internal notes, admin metadata.
 */
function formatCustomerOrder(o) {
  const addressSnap = o.deliveryAddressSnapshot;

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod || 'CASH_ON_DELIVERY',
    paymentStatus: o.paymentStatus,
    subtotal: o.subtotal ? o.subtotal.toString() : '0.00',
    subtotalEtb: o.subtotal ? Number(o.subtotal) : 0,
    deliveryFee: o.deliveryFee ? o.deliveryFee.toString() : '0.00',
    deliveryFeeEtb: o.deliveryFee ? Number(o.deliveryFee) : 0,
    discountAmount: o.discountAmount ? o.discountAmount.toString() : '0.00',
    totalAmount: o.totalAmount ? o.totalAmount.toString() : '0.00',
    totalEtb: o.totalAmount ? Number(o.totalAmount) : 0,
    totalWeight: o.totalWeight ? o.totalWeight.toString() : '0.00',
    currency: o.currency || 'ETB',
    customerNote: o.customerNote || null,
    city: o.city,
    deliveryZone: o.deliveryZone || null,
    deliveryAddress: o.deliveryAddress || null,
    cancelledReason: o.cancelledReason || null,
    rejectedReason: o.rejectedReason || null,
    placedAt: o.placedAt ? o.placedAt.toISOString() : o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
    processingAt: o.processingAt ? o.processingAt.toISOString() : null,
    readyAt: o.readyAt ? o.readyAt.toISOString() : null,
    dispatchedAt: o.dispatchedAt ? o.dispatchedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    // Can customer cancel?
    canCancel: CUSTOMER_CANCELLABLE_STATUSES.includes(o.status),
    // Delivery info
    delivery: o.delivery
      ? {
          id: o.delivery.id,
          deliveryNumber: o.delivery.deliveryNumber,
          status: o.delivery.status,
          estimatedDeliveryAt: o.delivery.estimatedDeliveryAt
            ? o.delivery.estimatedDeliveryAt.toISOString()
            : null,
          deliveredAt: o.delivery.deliveredAt
            ? o.delivery.deliveredAt.toISOString()
            : null,
        }
      : null,
    // Delivery address snapshot
    deliveryAddressSnapshot: addressSnap
      ? {
          recipientName: addressSnap.recipientName,
          phone: addressSnap.phone,
          city: addressSnap.city,
          deliveryZone: addressSnap.deliveryZone,
          neighborhood: addressSnap.neighborhood,
          addressLine: addressSnap.addressLine,
          latitude: addressSnap.latitude ? Number(addressSnap.latitude) : null,
          longitude: addressSnap.longitude ? Number(addressSnap.longitude) : null,
        }
      : null,
    // Recipient info from snapshot (convenience fields for orders list)
    recipientName: addressSnap?.recipientName || null,
    recipientPhone: addressSnap?.phone || null,
    // Order items with image URLs
    items: (o.items || []).map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productNameSnapshot,
      itemCode: it.itemCodeSnapshot,
      unit: it.unitSnapshot,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toString(),
      unitPriceEtb: Number(it.unitPrice),
      totalWeight: it.totalWeight.toString(),
      subtotal: it.subtotal.toString(),
      totalPriceEtb: Number(it.subtotal),
      sellerName: it.sellerNameSnapshot || 'Ardab Direct Hub',
      // Product image if still available
      productImage: it.product?.images?.[0]?.url || null,
    })),
    // Chronological timeline for order tracking
    timeline: (o.activities || []).map((a) => ({
      status: a.toStatus || o.status,
      timestamp: a.createdAt.toISOString(),
      description: a.description,
      actor: a.actor,
    })),
  };
}
