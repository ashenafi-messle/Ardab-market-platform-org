// ==============================================================================
// Ardab Market - Order Business Logic & Operations Service
// ==============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { generateNextOrderNumber } from './orderCode.service.js';
import {
  validateStatusTransition,
  getStatusTimestampUpdates,
} from './order.status.service.js';
import { createNotification } from './notification.service.js';

const Decimal = Prisma.Decimal;

/**
 * Lists orders with server-side pagination, multi-field search, filters, and whitelisted sorting.
 * Employs Prisma relation includes to eliminate N+1 queries.
 *
 * @param {object} queryOptions
 * @returns {Promise<{ orders: any[], pagination: object }>}
 */
export async function listOrders(queryOptions = {}) {
  const {
    page = 1,
    pageSize = 10,
    search,
    city,
    deliveryZone,
    status,
    paymentStatus,
    startDate,
    endDate,
    sortBy = 'placedAt',
    sortOrder = 'desc',
  } = queryOptions;

  const take = Math.min(Math.max(Number(pageSize), 1), 100);
  const skip = (Math.max(Number(page), 1) - 1) * take;

  const where = {};

  // City filtering
  if (city && city !== 'All Cities') {
    where.city = { equals: city, mode: 'insensitive' };
  }

  // Delivery Zone filtering
  if (deliveryZone && deliveryZone !== 'All Zones') {
    where.deliveryZone = { equals: deliveryZone, mode: 'insensitive' };
  }

  // Status filtering
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Payment Status filtering
  if (paymentStatus && paymentStatus !== 'ALL') {
    where.paymentStatus = paymentStatus;
  }

  // Date range filtering
  if (startDate || endDate) {
    where.placedAt = {};
    if (startDate) where.placedAt.gte = new Date(startDate);
    if (endDate) where.placedAt.lte = new Date(endDate);
  }

  // Multi-field search
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { orderNumber: { contains: term, mode: 'insensitive' } },
      { customer: { fullName: { contains: term, mode: 'insensitive' } } },
      { customer: { customerCode: { contains: term, mode: 'insensitive' } } },
      { customer: { phone: { contains: term } } },
      { deliveryZone: { contains: term, mode: 'insensitive' } },
      { deliveryAddress: { contains: term, mode: 'insensitive' } },
      {
        items: {
          some: {
            OR: [
              { productNameSnapshot: { contains: term, mode: 'insensitive' } },
              { itemCodeSnapshot: { contains: term, mode: 'insensitive' } },
              { sellerNameSnapshot: { contains: term, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  // Safe sorting whitelist
  const allowedSorts = ['orderNumber', 'placedAt', 'createdAt', 'totalAmount', 'totalWeight', 'status'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'placedAt';
  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, rawOrders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortDirection },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            email: true,
            city: true,
            profileImageUrl: true,
          },
        },
        items: {
          orderBy: { createdAt: 'asc' },
        },
        deliveryAddressSnapshot: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / take) || 1;

  // Format orders with clean numeric representations
  const orders = rawOrders.map((o) => formatOrderResponse(o));

  return {
    orders,
    pagination: {
      page: Number(page),
      pageSize: take,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves a single order by internal UUID or orderNumber.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getOrderById(id) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const order = await prisma.order.findFirst({
    where: isUuid ? { id } : { orderNumber: id },
    include: {
      customer: {
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          phone: true,
          email: true,
          city: true,
          profileImageUrl: true,
        },
      },
      items: {
        orderBy: { createdAt: 'asc' },
      },
      deliveryAddressSnapshot: true,
      activities: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    throw ApiError.notFound(`Order "${id}" not found.`);
  }

  return formatOrderResponse(order);
}

/**
 * Retrieves chronological lifecycle timeline events for an order.
 *
 * @param {string} id
 * @returns {Promise<any[]>}
 */
export async function getOrderActivity(id) {
  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!order) {
    throw ApiError.notFound(`Order "${id}" not found.`);
  }

  const activities = await prisma.orderActivity.findMany({
    where: { orderId: id },
    orderBy: { createdAt: 'asc' },
  });

  return activities.map((a) => ({
    id: a.id,
    action: a.action,
    fromStatus: a.fromStatus,
    toStatus: a.toStatus,
    description: a.description,
    actor: a.actor,
    timestamp: a.createdAt.toISOString(),
  }));
}

/**
 * Transitions an order to a new status with centralized validation,
 * transactional timestamp updates, order activity logging, and audit logs.
 *
 * @param {string} id Order ID
 * @param {string} newStatus Target OrderStatus
 * @param {string|null} reason Optional or required reason
 * @param {object} adminUser Requesting admin user context
 * @param {string} ipAddress Requesting client IP
 * @returns {Promise<object>}
 */
export async function transitionOrderStatus(id, newStatus, reason = null, adminUser = null, ipAddress = null) {
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      city: true,
      customerId: true,
    },
  });

  if (!existingOrder) {
    throw ApiError.notFound(`Order "${id}" not found.`);
  }

  // 1. Centralized state transition validation
  validateStatusTransition(existingOrder.status, newStatus);

  // 2. Prepare status updates and timestamp fields
  const updates = getStatusTimestampUpdates(newStatus, reason);

  // 3. Execute atomic transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: updates,
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            email: true,
            city: true,
          },
        },
        items: true,
        deliveryAddressSnapshot: true,
        activities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Record OrderActivity event
    await tx.orderActivity.create({
      data: {
        orderId: id,
        action: `Order transitioned to ${newStatus.replace('_', ' ')}`,
        fromStatus: existingOrder.status,
        toStatus: newStatus,
        description: reason
          ? `Status changed from ${existingOrder.status} to ${newStatus}: ${reason}`
          : `Status changed from ${existingOrder.status} to ${newStatus} by Super Admin`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
        metadata: reason ? JSON.stringify({ reason }) : null,
      },
    });

    // Record AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'ORDER_STATUS_TRANSITION',
        entity: 'Order',
        entityId: id,
        ipAddress: ipAddress || null,
        changesSummary: `Order ${existingOrder.orderNumber} transitioned from ${existingOrder.status} to ${newStatus}${
          reason ? ` (Reason: ${reason})` : ''
        }`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  // Emit Operational Alert asynchronously on failure/cancellation
  if (newStatus === 'CANCELLED' || newStatus === 'FAILED') {
    createNotification({
      type: 'OPERATIONAL_ALERT',
      category: 'ORDER',
      title: `Order ${existingOrder.orderNumber} ${newStatus}`,
      message: `Order ${existingOrder.orderNumber} in ${existingOrder.city} was marked as ${newStatus}.${reason ? ` Reason: ${reason}` : ''}`,
      severity: newStatus === 'FAILED' ? 'CRITICAL' : 'WARNING',
      priority: 'HIGH',
      isAlert: true,
      entityType: 'ORDER',
      entityId: id,
      actionUrl: '/orders',
    }, adminUser).catch(() => {});
  }

  return formatOrderResponse(updatedOrder);
}

/**
 * Bulk updates order statuses across multiple selected orders.
 *
 * @param {string[]} ids
 * @param {string} newStatus
 * @param {string|null} reason
 * @param {object} adminUser
 * @param {string} ipAddress
 * @returns {Promise<{ count: number }>}
 */
export async function bulkTransitionStatus(ids, newStatus, reason = null, adminUser = null, ipAddress = null) {
  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: { id: true, orderNumber: true, status: true },
  });

  if (orders.length === 0) {
    return { count: 0 };
  }

  // Filter orders that can validly transition to newStatus
  const validOrders = orders.filter((o) => {
    try {
      validateStatusTransition(o.status, newStatus);
      return true;
    } catch {
      return false;
    }
  });

  if (validOrders.length === 0) {
    throw ApiError.badRequest(
      `None of the selected orders can be transitioned to "${newStatus}" from their current statuses.`
    );
  }

  const validIds = validOrders.map((o) => o.id);
  const updates = getStatusTimestampUpdates(newStatus, reason);

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { id: { in: validIds } },
      data: updates,
    });

    // Bulk create activity entries
    const activities = validOrders.map((o) => ({
      orderId: o.id,
      action: `Bulk status update to ${newStatus.replace('_', ' ')}`,
      fromStatus: o.status,
      toStatus: newStatus,
      description: reason
        ? `Bulk transitioned to ${newStatus}: ${reason}`
        : `Bulk transitioned to ${newStatus} by Super Admin`,
      actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
      actorId: adminUser?.id || null,
      metadata: reason ? JSON.stringify({ reason }) : null,
    }));

    await tx.orderActivity.createMany({ data: activities });

    // Record AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'ORDER_BULK_STATUS_TRANSITION',
        entity: 'Order',
        entityId: validIds.join(','),
        ipAddress: ipAddress || null,
        changesSummary: `Bulk updated ${validIds.length} orders to ${newStatus}${reason ? ` (Reason: ${reason})` : ''}`,
        status: 'SUCCESS',
      },
    });
  });

  return { count: validIds.length };
}

/**
 * Creates an authoritative customer order from mobile checkout.
 * Enforces Decimal money and weight calculation from database products.
 * Includes idempotency and transactional consistency.
 *
 * @param {object} payload
 * @param {string} customerId
 * @param {string} ipAddress
 * @returns {Promise<object>}
 */
export async function checkoutCustomerOrder(payload, customerId = null, ipAddress = null) {
  const targetCustomerId = customerId || payload.customerId;

  if (!targetCustomerId) {
    throw ApiError.badRequest('Customer ID is required for checkout.');
  }

  // 1. Idempotency Check
  if (payload.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: payload.idempotencyKey },
      include: {
        customer: true,
        items: true,
        deliveryAddressSnapshot: true,
        activities: true,
      },
    });
    if (existing) {
      return formatOrderResponse(existing);
    }
  }

  // 2. Validate Customer
  const customer = await prisma.customer.findUnique({
    where: { id: targetCustomerId },
  });

  if (!customer) {
    throw ApiError.notFound('Customer account not found.');
  }

  if (customer.status !== 'ACTIVE') {
    throw ApiError.badRequest('Customer account is suspended or inactive. Cannot place orders.');
  }

  // 3. Validate and Fetch Authoritative Products from Database
  const productIds = payload.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { seller: true },
  });

  if (products.length !== productIds.length) {
    throw ApiError.badRequest('One or more requested products were not found in the catalog.');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Check product active status
  for (const item of payload.items) {
    const prod = productMap.get(item.productId);
    if (prod.status !== 'ACTIVE') {
      throw ApiError.badRequest(`Product "${prod.name}" is currently ${prod.status} and cannot be ordered.`);
    }
  }

  // 4. Authoritative Calculations using Decimal
  let orderSubtotal = new Decimal(0);
  let orderTotalWeight = new Decimal(0);

  const preparedItems = payload.items.map((item) => {
    const product = productMap.get(item.productId);
    const qty = item.quantity;
    const unitPrice = new Decimal(product.sellingPrice);
    const weightPerUnit = new Decimal(product.weight);

    const itemSubtotal = unitPrice.mul(qty);
    const itemTotalWeight = weightPerUnit.mul(qty);

    orderSubtotal = orderSubtotal.add(itemSubtotal);
    orderTotalWeight = orderTotalWeight.add(itemTotalWeight);

    return {
      productId: product.id,
      productNameSnapshot: product.name,
      itemCodeSnapshot: product.itemCode,
      unitSnapshot: product.unit,
      unitPrice: unitPrice,
      quantity: qty,
      weightPerUnit: weightPerUnit,
      totalWeight: itemTotalWeight,
      subtotal: itemSubtotal,
      sellerIdSnapshot: product.sellerId,
      sellerNameSnapshot: product.seller?.companyName || product.seller?.name || 'Direct Hub',
    };
  });

  // Calculate delivery fee: 150 ETB standard base + tiered weight surcharge for large bulk orders (>50kg)
  let deliveryFee = new Decimal(150.0);
  if (orderTotalWeight.gt(50)) {
    const excessWeight = orderTotalWeight.sub(50);
    deliveryFee = deliveryFee.add(excessWeight.mul(5.0)); // 5 ETB per extra kg
  }

  const discountAmount = new Decimal(0);
  const taxAmount = new Decimal(0);
  const totalAmount = orderSubtotal.add(deliveryFee).sub(discountAmount).add(taxAmount);

  // 5. Generate human-readable sequential Order Number
  const orderNumber = await generateNextOrderNumber();

  // 6. Execute atomic transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: targetCustomerId,
        city: payload.deliveryAddress.city,
        deliveryZone: payload.deliveryAddress.deliveryZone || null,
        deliveryAddress: payload.deliveryAddress.addressLine,
        status: 'PENDING',
        subtotal: orderSubtotal,
        deliveryFee: deliveryFee,
        discountAmount: discountAmount,
        taxAmount: taxAmount,
        totalAmount: totalAmount,
        totalWeight: orderTotalWeight,
        currency: 'ETB',
        paymentMethod: payload.paymentMethod || 'CASH_ON_DELIVERY',
        paymentStatus: 'PENDING',
        customerNote: payload.customerNote || null,
        idempotencyKey: payload.idempotencyKey || null,
        placedAt: new Date(),
        items: {
          create: preparedItems,
        },
        deliveryAddressSnapshot: {
          create: {
            recipientName: payload.deliveryAddress.recipientName,
            phone: payload.deliveryAddress.phone,
            city: payload.deliveryAddress.city,
            deliveryZone: payload.deliveryAddress.deliveryZone || null,
            neighborhood: payload.deliveryAddress.neighborhood || null,
            addressLine: payload.deliveryAddress.addressLine,
            latitude: payload.deliveryAddress.latitude ? new Decimal(payload.deliveryAddress.latitude) : null,
            longitude: payload.deliveryAddress.longitude ? new Decimal(payload.deliveryAddress.longitude) : null,
          },
        },
        activities: {
          create: {
            action: 'Order Placed',
            fromStatus: null,
            toStatus: 'PENDING',
            description: 'Order placed by customer via mobile application.',
            actor: 'Customer',
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            email: true,
            city: true,
          },
        },
        items: true,
        deliveryAddressSnapshot: true,
        activities: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Update customer lastActivityAt
    await tx.customer.update({
      where: { id: targetCustomerId },
      data: { lastActivityAt: new Date() },
    });

    // Record CustomerActivity
    await tx.customerActivity.create({
      data: {
        customerId: targetCustomerId,
        action: 'ORDER_PLACED',
        description: `Placed order ${orderNumber} for total ${totalAmount.toFixed(2)} ETB`,
        actor: 'Customer',
        metadata: JSON.stringify({ orderId: order.id, orderNumber }),
      },
    });

    return order;
  });

  return formatOrderResponse(createdOrder);
}

/**
 * Normalizes Order object into clean API format compatible with Super Admin UI.
 *
 * @param {object} o Raw Prisma Order
 * @returns {object}
 */
function formatOrderResponse(o) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerId: o.customerId,
    customerName: o.customer?.fullName || 'Customer',
    customerCode: o.customer?.customerCode || '',
    customerPhone: o.customer?.phone || '',
    customerEmail: o.customer?.email || null,
    city: o.city,
    deliveryZone: o.deliveryZone || 'Standard Zone',
    deliveryAddress: o.deliveryAddress || '',
    status: o.status,
    orderStatus: o.status, // Backward compatibility alias
    paymentMethod: o.paymentMethod || 'CASH_ON_DELIVERY',
    paymentStatus: o.paymentStatus,
    subtotal: o.subtotal ? o.subtotal.toString() : '0.00',
    subtotalEtb: o.subtotal ? Number(o.subtotal) : 0,
    deliveryFee: o.deliveryFee ? o.deliveryFee.toString() : '0.00',
    deliveryFeeEtb: o.deliveryFee ? Number(o.deliveryFee) : 0,
    discountAmount: o.discountAmount ? o.discountAmount.toString() : '0.00',
    discountEtb: o.discountAmount ? Number(o.discountAmount) : 0,
    taxAmount: o.taxAmount ? o.taxAmount.toString() : '0.00',
    taxEtb: o.taxAmount ? Number(o.taxAmount) : 0,
    totalAmount: o.totalAmount ? o.totalAmount.toString() : '0.00',
    totalEtb: o.totalAmount ? Number(o.totalAmount) : 0,
    totalWeight: o.totalWeight ? o.totalWeight.toString() : '0.00',
    totalWeightKg: o.totalWeight ? Number(o.totalWeight) : 0,
    currency: o.currency || 'ETB',
    customerNote: o.customerNote || null,
    internalNote: o.internalNote || null,
    placedAt: o.placedAt ? o.placedAt.toISOString() : o.createdAt.toISOString(),
    confirmedAt: o.confirmedAt ? o.confirmedAt.toISOString() : null,
    processingAt: o.processingAt ? o.processingAt.toISOString() : null,
    readyAt: o.readyAt ? o.readyAt.toISOString() : null,
    dispatchedAt: o.dispatchedAt ? o.dispatchedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    cancelledAt: o.cancelledAt ? o.cancelledAt.toISOString() : null,
    cancelledReason: o.cancelledReason || null,
    rejectedAt: o.rejectedAt ? o.rejectedAt.toISOString() : null,
    rejectedReason: o.rejectedReason || null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: (o.items || []).map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.productNameSnapshot,
      itemCode: it.itemCodeSnapshot,
      unit: it.unitSnapshot,
      quantity: it.quantity,
      unitPrice: it.unitPrice.toString(),
      unitPriceEtb: Number(it.unitPrice),
      weightPerUnit: it.weightPerUnit.toString(),
      unitWeightKg: Number(it.weightPerUnit),
      totalWeight: it.totalWeight.toString(),
      totalWeightKg: Number(it.totalWeight),
      subtotal: it.subtotal.toString(),
      totalPriceEtb: Number(it.subtotal),
      sellerId: it.sellerIdSnapshot,
      sellerName: it.sellerNameSnapshot || 'Ardab Direct Hub',
    })),
    deliveryAddressSnapshot: o.deliveryAddressSnapshot
      ? {
          recipientName: o.deliveryAddressSnapshot.recipientName,
          phone: o.deliveryAddressSnapshot.phone,
          city: o.deliveryAddressSnapshot.city,
          deliveryZone: o.deliveryAddressSnapshot.deliveryZone,
          neighborhood: o.deliveryAddressSnapshot.neighborhood,
          addressLine: o.deliveryAddressSnapshot.addressLine,
          latitude: o.deliveryAddressSnapshot.latitude ? Number(o.deliveryAddressSnapshot.latitude) : null,
          longitude: o.deliveryAddressSnapshot.longitude ? Number(o.deliveryAddressSnapshot.longitude) : null,
        }
      : null,
    timeline: (o.activities || []).map((a) => ({
      status: a.toStatus || o.status,
      timestamp: a.createdAt.toISOString(),
      description: a.description,
      actor: a.actor,
    })),
  };
}
