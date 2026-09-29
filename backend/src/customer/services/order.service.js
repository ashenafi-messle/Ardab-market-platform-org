// ==============================================================================
// Ardab Market - Customer Order Service (Customer-Facing Operations)
// ==============================================================================
// Wraps the authoritative order system with customer-specific IDOR protection,
// cancellation policy enforcement, customer-safe timeline formatting,
// and lifecycle milestones tracking.

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';

// Statuses from which a customer is allowed to cancel their own order
const CUSTOMER_CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];

// Active statuses for filtering
const ACTIVE_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY_FOR_DELIVERY',
  'ASSIGNED_TO_TRIP',
  'PICKED_UP',
  'IN_TRANSIT',
];

const CANCELLED_STATUSES = ['CANCELLED', 'REJECTED', 'FAILED', 'RETURNED'];

/**
 * Maps order statuses to customer-safe descriptive messages.
 * Prevents raw internal admin notes or warehouse issues from leaking to customers.
 */
export function getCustomerFriendlyStatusMessage(status, actionDescription) {
  const messages = {
    PENDING: 'Order placed successfully. Waiting for Ardab Market confirmation.',
    CONFIRMED: 'Your order has been verified and confirmed by Ardab Market.',
    PROCESSING: 'Your order is being prepared and packed at the distribution center.',
    READY_FOR_DELIVERY: 'Your order is packed and ready for delivery dispatch.',
    ASSIGNED_TO_TRIP: 'A delivery driver has been assigned to your order.',
    PICKED_UP: 'Your package has been picked up by the delivery agent.',
    IN_TRANSIT: 'Your package is out for delivery to your address.',
    DELIVERED: 'Your package has been successfully delivered.',
    CANCELLED: 'This order was cancelled.',
    REJECTED: 'This order was rejected and could not be fulfilled.',
    FAILED: 'Delivery was attempted but could not be completed.',
    RETURNED: 'Order returned to the warehouse.',
  };

  if (status && messages[status]) {
    return messages[status];
  }

  // If action description does not contain internal phrases, return safe version
  if (actionDescription && !/internal|admin|warehouse issue|error|debug/i.test(actionDescription)) {
    return actionDescription;
  }

  return `Order status updated to ${status || 'updated'}.`;
}

/**
 * Generates the standardized lifecycle milestones for visual progress tracking
 */
export function buildOrderMilestones(order) {
  const status = order.status;
  const isCancelled = ['CANCELLED', 'REJECTED'].includes(status);
  const isFailed = ['FAILED', 'RETURNED'].includes(status);

  // Standard ordered lifecycle stages
  const stageOrder = [
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY_FOR_DELIVERY',
    'IN_TRANSIT',
    'DELIVERED',
  ];

  const currentIdx = stageOrder.indexOf(
    ['ASSIGNED_TO_TRIP', 'PICKED_UP'].includes(status) ? 'IN_TRANSIT' : status
  );

  const getStageState = (stage, stageIdx) => {
    if (isCancelled) {
      if (stage === 'PENDING') return 'COMPLETED';
      return stage === status ? 'CANCELLED' : 'UPCOMING';
    }
    if (isFailed && stage === 'IN_TRANSIT') {
      return 'FAILED';
    }
    if (currentIdx === -1) {
      return 'UPCOMING';
    }
    if (stageIdx < currentIdx || status === 'DELIVERED') {
      return 'COMPLETED';
    }
    if (stageIdx === currentIdx) {
      return 'CURRENT';
    }
    return 'UPCOMING';
  };

  const stages = [
    {
      key: 'PLACED',
      stage: 'PENDING',
      title: 'Order Placed',
      description: 'Your order was received and queued.',
      timestamp: order.placedAt ? order.placedAt.toISOString() : order.createdAt.toISOString(),
      state: getStageState('PENDING', 0),
    },
    {
      key: 'CONFIRMED',
      stage: 'CONFIRMED',
      title: 'Order Confirmed',
      description: 'Verified and confirmed by Ardab Market.',
      timestamp: order.confirmedAt ? order.confirmedAt.toISOString() : null,
      state: getStageState('CONFIRMED', 1),
    },
    {
      key: 'PROCESSING',
      stage: 'PROCESSING',
      title: 'Preparing Order',
      description: 'Being prepared and packed at the distribution hub.',
      timestamp: order.processingAt ? order.processingAt.toISOString() : null,
      state: getStageState('PROCESSING', 2),
    },
    {
      key: 'READY_FOR_DELIVERY',
      stage: 'READY_FOR_DELIVERY',
      title: 'Ready for Delivery',
      description: 'Package staged and assigned for local transit.',
      timestamp: order.readyAt ? order.readyAt.toISOString() : null,
      state: getStageState('READY_FOR_DELIVERY', 3),
    },
    {
      key: 'OUT_FOR_DELIVERY',
      stage: 'IN_TRANSIT',
      title: 'Out for Delivery',
      description: 'Courier is en route to your delivery address.',
      timestamp: order.dispatchedAt ? order.dispatchedAt.toISOString() : null,
      state: getStageState('IN_TRANSIT', 4),
    },
    {
      key: 'DELIVERED',
      stage: 'DELIVERED',
      title: 'Delivered',
      description: 'Package safely delivered to recipient.',
      timestamp: order.deliveredAt ? order.deliveredAt.toISOString() : null,
      state: getStageState('DELIVERED', 5),
    },
  ];

  if (isCancelled) {
    stages.push({
      key: 'CANCELLED',
      stage: status,
      title: status === 'REJECTED' ? 'Order Rejected' : 'Order Cancelled',
      description: order.cancelledReason || order.rejectedReason || 'Order was cancelled.',
      timestamp: order.cancelledAt
        ? order.cancelledAt.toISOString()
        : order.rejectedAt
        ? order.rejectedAt.toISOString()
        : order.updatedAt.toISOString(),
      state: 'CANCELLED',
    });
  }

  return stages;
}

/**
 * Lists orders for an authenticated customer (Strict IDOR scope).
 * Supports filters: ALL, ACTIVE, COMPLETED, CANCELLED.
 *
 * @param {string} customerId Authenticated Customer ID
 * @param {object} queryOptions
 * @returns {Promise<{orders: any[], pagination: object}>}
 */
export async function getMyOrders(customerId, queryOptions = {}) {
  const {
    page = 1,
    limit,
    pageSize,
    status,
    paymentStatus,
    startDate,
    endDate,
    sortBy = 'placedAt',
    sortOrder = 'desc',
  } = queryOptions;

  const rawLimit = limit || pageSize || 20;
  const take = Math.min(Math.max(Number(rawLimit), 1), 50);
  const skip = (Math.max(Number(page), 1) - 1) * take;

  // Strict ownership filter: ONLY orders belonging to this customer
  const where = { customerId };

  if (status && status !== 'ALL') {
    const upperStatus = String(status).toUpperCase();
    if (upperStatus === 'ACTIVE') {
      where.status = { in: ACTIVE_STATUSES };
    } else if (upperStatus === 'COMPLETED') {
      where.status = 'DELIVERED';
    } else if (upperStatus === 'CANCELLED') {
      where.status = { in: CANCELLED_STATUSES };
    } else {
      where.status = upperStatus;
    }
  }

  if (paymentStatus && paymentStatus !== 'ALL') {
    where.paymentStatus = String(paymentStatus).toUpperCase();
  }

  if (startDate || endDate) {
    where.placedAt = {};
    if (startDate) where.placedAt.gte = new Date(startDate);
    if (endDate) where.placedAt.lte = new Date(endDate);
  }

  const allowedSorts = ['placedAt', 'createdAt', 'totalAmount', 'status'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'placedAt';
  const sortDir = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

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
      limit: take,
      pageSize: take,
      total,
      totalPages,
    },
  };
}

/**
 * Gets a single order for a customer — strictly enforces IDOR protection.
 *
 * @param {string} orderId UUID or orderNumber
 * @param {string} customerId Authenticated Customer ID
 * @returns {Promise<object>}
 */
export async function getMyOrderById(orderId, customerId) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

  const order = await prisma.order.findFirst({
    where: {
      customerId, // Strict IDOR guard
      ...(isUuid ? { id: orderId } : { orderNumber: orderId }),
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
      delivery: {
        select: {
          id: true,
          deliveryNumber: true,
          status: true,
          estimatedDeliveryAt: true,
          deliveredAt: true,
          driver: {
            select: {
              fullName: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  return formatCustomerOrder(order);
}

/**
 * Allows an authenticated customer to cancel their own order.
 * Enforces status machine: only PENDING or CONFIRMED orders can be cancelled.
 *
 * @param {string} orderId
 * @param {string} customerId
 * @param {string} reason
 * @returns {Promise<object>}
 */
export async function cancelMyOrder(orderId, customerId, reason = 'Cancelled by customer') {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

  // IDOR check: order must belong to this customer
  const order = await prisma.order.findFirst({
    where: {
      customerId,
      ...(isUuid ? { id: orderId } : { orderNumber: orderId }),
    },
    select: { id: true, orderNumber: true, status: true, customerId: true },
  });

  if (!order) {
    throw ApiError.notFound('Order not found.');
  }

  if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
    throw ApiError.badRequest(
      `Order cannot be cancelled. Only orders in PENDING or CONFIRMED status can be cancelled by customers. Current status: ${order.status}.`
    );
  }

  const cancelledOrder = await prisma.$transaction(
    async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledReason: reason,
        },
        include: {
          items: {
            include: {
              product: {
                include: { images: { where: { isPrimary: true }, take: 1 } },
              },
            },
          },
          deliveryAddressSnapshot: true,
          activities: { orderBy: { createdAt: 'asc' } },
          delivery: true,
        },
      });

      // Record OrderActivity event
      await tx.orderActivity.create({
        data: {
          orderId: order.id,
          action: 'Order Cancelled by Customer',
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          description: `Order ${order.orderNumber} was cancelled by the customer. Reason: ${reason}`,
          actor: 'Customer',
        },
      });

      // Record CustomerActivity
      await tx.customerActivity.create({
        data: {
          customerId,
          action: 'ORDER_CANCELLED',
          description: `Cancelled order ${order.orderNumber}. Reason: ${reason}`,
          actor: 'Customer',
          metadata: JSON.stringify({ orderId: order.id, orderNumber: order.orderNumber, reason }),
        },
      });

      return updated;
    },
    {
      maxWait: 10000,
      timeout: 20000,
    }
  );

  // Dispatch customer-specific cancellation notification
  import('./notification.service.js')
    .then((m) => m.createCustomerOrderNotification(cancelledOrder, 'CANCELLED', reason))
    .catch(() => {});

  return formatCustomerOrder(cancelledOrder);
}

/**
 * Customer-friendly order format (exposes only customer-relevant fields).
 * Hides internal admin notes, admin user IDs, and server credentials.
 */
function formatCustomerOrder(o) {
  const addressSnap = o.deliveryAddressSnapshot;
  const items = o.items || [];
  const itemCount = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const previewImages = items
    .map((it) => it.product?.images?.[0]?.url)
    .filter(Boolean)
    .slice(0, 4);

  // Compute milestones
  const milestones = buildOrderMilestones(o);

  // Format customer-safe chronological activities
  const timeline = (o.activities || []).map((a) => ({
    id: a.id,
    type: a.action,
    status: a.toStatus || o.status,
    customerMessage: getCustomerFriendlyStatusMessage(a.toStatus, a.description),
    timestamp: a.createdAt.toISOString(),
    actor: a.actor === 'Customer' ? 'You' : 'Ardab Market',
    isCompleted: true,
  }));

  // Estimated delivery label
  let estimatedDelivery = '1-2 business days';
  if (o.delivery?.estimatedDeliveryAt) {
    estimatedDelivery = new Date(o.delivery.estimatedDeliveryAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } else if (o.status === 'DELIVERED') {
    estimatedDelivery = o.deliveredAt
      ? new Date(o.deliveredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Delivered';
  }

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
    discountEtb: o.discountAmount ? Number(o.discountAmount) : 0,
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
    itemCount,
    previewImages,
    placedAt: o.placedAt ? o.placedAt.toISOString() : o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
    processingAt: o.processingAt ? o.processingAt.toISOString() : null,
    readyAt: o.readyAt ? o.readyAt.toISOString() : null,
    dispatchedAt: o.dispatchedAt ? o.dispatchedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    estimatedDelivery,
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
          deliveredAt: o.delivery.deliveredAt ? o.delivery.deliveredAt.toISOString() : null,
          agentName: o.delivery.driver?.fullName || 'Ardab Express Rider',
          agentPhone: o.delivery.driver?.phone || '+251 91 100 0000',
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
    recipientName: addressSnap?.recipientName || null,
    recipientPhone: addressSnap?.phone || null,
    // Order items with product images
    items: items.map((it) => ({
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
      productImage: it.product?.images?.[0]?.url || null,
    })),
    // Tracking milestones & chronological timeline
    milestones,
    timeline,
    // Customer Support Reference Context
    support: {
      telegramBotUrl: 'https://t.me/Ardab_market_bot',
      supportPhone: '+251 91 100 0000',
      supportEmail: 'support@ardab.com',
      orderReference: o.orderNumber,
    },
  };
}
