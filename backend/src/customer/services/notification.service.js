// ==============================================================================
// Ardab Market - Centralized Customer Notification Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import {
  isExpoPushToken,
  sendPushNotifications,
  maskPushToken,
} from '../../shared/services/pushNotification.service.js';
import { getCustomerFriendlyStatusMessage } from './order.service.js';

/**
 * Register or update a customer's push device token.
 * Authenticated customer is authoritative owner.
 */
export async function registerDeviceToken(customerId, { pushToken, platform = 'ANDROID', deviceId = null, appVersion = null }) {
  if (!pushToken || typeof pushToken !== 'string') {
    throw ApiError.badRequest('Push token is required', 'PUSH_TOKEN_REQUIRED');
  }

  const trimmedToken = pushToken.trim();
  if (!isExpoPushToken(trimmedToken)) {
    throw ApiError.badRequest('Invalid Expo push token format', 'INVALID_PUSH_TOKEN');
  }

  const validPlatforms = ['ANDROID', 'IOS', 'WEB'];
  const normalizedPlatform = validPlatforms.includes((platform || '').toUpperCase())
    ? platform.toUpperCase()
    : 'ANDROID';

  // Check if token is already registered to this or another customer
  const existingToken = await prisma.customerPushToken.findUnique({
    where: { token: trimmedToken },
  });

  let tokenRecord;
  if (existingToken) {
    // If device switched accounts or is re-registering, reassign to current authenticated customer
    tokenRecord = await prisma.customerPushToken.update({
      where: { id: existingToken.id },
      data: {
        customerId,
        platform: normalizedPlatform,
        deviceId: deviceId ? String(deviceId).slice(0, 128) : null,
        appVersion: appVersion ? String(appVersion).slice(0, 64) : null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  } else {
    tokenRecord = await prisma.customerPushToken.create({
      data: {
        customerId,
        token: trimmedToken,
        platform: normalizedPlatform,
        deviceId: deviceId ? String(deviceId).slice(0, 128) : null,
        appVersion: appVersion ? String(appVersion).slice(0, 64) : null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  logger.info('[NOTIFICATION SERVICE] Registered customer device token', {
    customerId,
    platform: normalizedPlatform,
    token: maskPushToken(trimmedToken),
  });

  return { registered: true, tokenId: tokenRecord.id };
}

/**
 * Unregister/deactivate a customer push token upon logout.
 * Only deactivates tokens owned by the authenticated customer (IDOR protection).
 */
export async function unregisterDeviceToken(customerId, tokenOrId) {
  if (!tokenOrId) {
    return { unregistered: false };
  }

  const result = await prisma.customerPushToken.updateMany({
    where: {
      customerId,
      OR: [{ id: tokenOrId }, { token: tokenOrId }],
    },
    data: {
      isActive: false,
      lastUsedAt: new Date(),
    },
  });

  return { unregistered: result.count > 0 };
}

/**
 * List paginated notifications for the authenticated customer.
 */
export async function getCustomerNotifications(customerId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {
    customerId,
    isHidden: false,
  };

  if (query.unread === true || query.unread === 'true') {
    where.isRead = false;
  }

  const [recipients, total, unreadCount] = await Promise.all([
    prisma.notificationRecipient.findMany({
      where,
      include: {
        notification: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notificationRecipient.count({ where }),
    prisma.notificationRecipient.count({
      where: {
        customerId,
        isHidden: false,
        isRead: false,
      },
    }),
  ]);

  const notifications = recipients.map((r) => ({
    id: r.notification.id,
    recipientId: r.id,
    type: r.notification.type,
    title: r.notification.title,
    body: r.notification.message,
    imageUrl: r.notification.imageUrl || null,
    deepLink: r.notification.deepLink || null,
    entityType: r.notification.entityType || null,
    entityId: r.notification.entityId || null,
    isRead: r.isRead,
    readAt: r.readAt,
    createdAt: r.createdAt,
  }));

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
    unreadCount,
  };
}

/**
 * Get accurate unread notifications count for the authenticated customer.
 */
export async function getUnreadCount(customerId) {
  const count = await prisma.notificationRecipient.count({
    where: {
      customerId,
      isHidden: false,
      isRead: false,
    },
  });
  return { count };
}

/**
 * Mark a single notification as read for the authenticated customer.
 */
export async function markAsRead(customerId, notificationId) {
  if (!notificationId) {
    throw ApiError.badRequest('Notification ID is required', 'NOTIFICATION_ID_REQUIRED');
  }

  const recipient = await prisma.notificationRecipient.findFirst({
    where: {
      customerId,
      OR: [{ notificationId }, { id: notificationId }],
    },
  });

  if (!recipient) {
    throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  const updated = await prisma.notificationRecipient.update({
    where: { id: recipient.id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true, isRead: updated.isRead, readAt: updated.readAt };
}

/**
 * Mark all notifications as read for the authenticated customer.
 */
export async function markAllAsRead(customerId) {
  const result = await prisma.notificationRecipient.updateMany({
    where: {
      customerId,
      isRead: false,
      isHidden: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { success: true, updatedCount: result.count };
}

/**
 * Soft hide a notification for the authenticated customer.
 * Does NOT delete the global Notification record.
 */
export async function hideNotification(customerId, notificationId) {
  const recipient = await prisma.notificationRecipient.findFirst({
    where: {
      customerId,
      OR: [{ notificationId }, { id: notificationId }],
    },
  });

  if (!recipient) {
    throw ApiError.notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  await prisma.notificationRecipient.update({
    where: { id: recipient.id },
    data: {
      isHidden: true,
      hiddenAt: new Date(),
    },
  });

  return { success: true, hidden: true };
}

/**
 * Creates and broadcasts a NEW_PRODUCT notification when a product becomes ACTIVE.
 * Idempotent: Never sends duplicate new product notifications for the same product.
 * Push delivery is dispatched asynchronously after the database commit.
 */
export async function createNewProductNotification(product) {
  if (!product || !product.id) return null;

  // 1. Check if product is ACTIVE
  if (product.status !== 'ACTIVE') {
    return null;
  }

  // 2. Idempotency Check: Prevent duplicate NEW_PRODUCT notifications for the same product
  const existingNotification = await prisma.notification.findFirst({
    where: {
      type: 'NEW_PRODUCT',
      entityType: 'PRODUCT',
      entityId: product.id,
    },
  });

  if (existingNotification) {
    return existingNotification;
  }

  // 3. Resolve primary product image URL
  let imageUrl = null;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const primary = product.images.find((img) => img.isPrimary) || product.images[0];
    imageUrl = typeof primary === 'object' && primary !== null ? primary.url : primary;
  }

  const priceText = product.sellingPrice
    ? ` — ETB ${Number(product.sellingPrice).toLocaleString()}`
    : '';
  const title = 'New product on Ardab Market';
  const body = `Check out ${product.name}${priceText} now on Ardab Market.`;
  const deepLink = `/products/${product.id}`;

  // Check if productId actually exists in database to satisfy foreign key safely
  let validProductId = null;
  if (product.id) {
    const pExists = await prisma.product.findUnique({
      where: { id: product.id },
      select: { id: true },
    });
    if (pExists) validProductId = pExists.id;
  }

  // 4. Create single global Notification in DB
  const notification = await prisma.notification.create({
    data: {
      type: 'NEW_PRODUCT',
      category: 'SYSTEM',
      title,
      message: body,
      imageUrl,
      deepLink,
      entityType: 'PRODUCT',
      entityId: product.id,
      productId: validProductId,
      severity: 'INFO',
      priority: 'NORMAL',
      isActive: true,
    },
  });

  // 5. Query active, eligible customers (respecting preferences)
  const eligibleCustomers = await prisma.customer.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { notificationPreference: null },
        { notificationPreference: { newProductsEnabled: true } },
      ],
    },
    select: {
      id: true,
      pushTokens: {
        where: { isActive: true },
        select: { id: true, token: true, platform: true },
      },
    },
  });

  if (eligibleCustomers.length === 0) {
    return notification;
  }

  // 6. Bulk create recipient records
  const recipientRecords = eligibleCustomers.map((c) => ({
    notificationId: notification.id,
    customerId: c.id,
    isRead: false,
  }));

  // Batch insert recipients
  await prisma.notificationRecipient.createMany({
    data: recipientRecords,
    skipDuplicates: true,
  });

  // 7. Collect push items for active tokens and dispatch asynchronously
  const pushItems = [];
  for (const customer of eligibleCustomers) {
    for (const pt of customer.pushTokens) {
      pushItems.push({
        notificationId: notification.id,
        customerPushTokenId: pt.id,
        token: pt.token,
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: 'NEW_PRODUCT',
          entityType: 'PRODUCT',
          entityId: product.id,
          deepLink,
        },
        channelId: 'new-products',
      });
    }
  }

  if (pushItems.length > 0) {
    // Fire and forget: Non-blocking push delivery
    sendPushNotifications(pushItems).catch((err) => {
      logger.warn('[NOTIFICATION SERVICE] Background push delivery error', { error: err.message });
    });
  }

  logger.info('[NOTIFICATION SERVICE] Broadcasted NEW_PRODUCT notification', {
    productId: product.id,
    recipientsCount: recipientRecords.length,
    pushTokensCount: pushItems.length,
  });

  return notification;
}

/**
 * Creates and dispatches a customer-specific order notification.
 * Customer A's order notifications will NEVER reach Customer B.
 */
export async function createCustomerOrderNotification(order, eventStatus, customMessage = null) {
  if (!order || !order.id || !order.customerId) return null;

  // Check customer preferences
  const customer = await prisma.customer.findUnique({
    where: { id: order.customerId },
    select: {
      id: true,
      status: true,
      notificationPreference: true,
      pushTokens: {
        where: { isActive: true },
        select: { id: true, token: true },
      },
    },
  });

  if (!customer || customer.status !== 'ACTIVE') {
    return null;
  }

  if (customer.notificationPreference && !customer.notificationPreference.orderUpdatesEnabled) {
    // Push updates disabled by customer preference, but in-app notification can still be recorded
  }

  const EVENT_CONFIGS = {
    ORDER_PLACED: {
      type: 'ORDER_PLACED',
      title: `Order Placed (#${order.orderNumber})`,
      message: 'Your order was successfully placed. Waiting for Ardab Market confirmation.',
    },
    CONFIRMED: {
      type: 'ORDER_CONFIRMED',
      title: `Order Confirmed (#${order.orderNumber})`,
      message: 'Your order has been verified and confirmed by Ardab Market.',
    },
    PROCESSING: {
      type: 'ORDER_PROCESSING',
      title: `Order Processing (#${order.orderNumber})`,
      message: 'Your order is being prepared and packed at the distribution center.',
    },
    READY_FOR_DELIVERY: {
      type: 'ORDER_PACKED',
      title: `Order Packed (#${order.orderNumber})`,
      message: 'Your order is packed and ready for delivery dispatch.',
    },
    ASSIGNED_TO_TRIP: {
      type: 'ORDER_OUT_FOR_DELIVERY',
      title: `Driver Assigned (#${order.orderNumber})`,
      message: 'A delivery driver has been assigned to your order.',
    },
    PICKED_UP: {
      type: 'ORDER_OUT_FOR_DELIVERY',
      title: `Order Picked Up (#${order.orderNumber})`,
      message: 'Your package has been picked up by the delivery agent.',
    },
    IN_TRANSIT: {
      type: 'ORDER_OUT_FOR_DELIVERY',
      title: `Order Out For Delivery (#${order.orderNumber})`,
      message: 'Your package is out for delivery to your address.',
    },
    DELIVERED: {
      type: 'ORDER_DELIVERED',
      title: `Order Delivered (#${order.orderNumber})`,
      message: 'Your package has been successfully delivered. Thank you for shopping with Ardab Market!',
    },
    CANCELLED: {
      type: 'ORDER_CANCELLED',
      title: `Order Cancelled (#${order.orderNumber})`,
      message: customMessage || 'This order was cancelled.',
    },
    FAILED: {
      type: 'ORDER_CANCELLED',
      title: `Delivery Issue (#${order.orderNumber})`,
      message: customMessage || 'Delivery was attempted but could not be completed.',
    },
  };

  const config = EVENT_CONFIGS[eventStatus] || {
    type: 'ORDER_PROCESSING',
    title: `Order Update (#${order.orderNumber})`,
    message: getCustomerFriendlyStatusMessage(eventStatus, customMessage),
  };

  const deepLink = `/orders/${order.id}`;

  // Check if orderId actually exists in database to satisfy foreign key safely
  let validOrderId = null;
  if (order.id) {
    const oExists = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true },
    });
    if (oExists) validOrderId = oExists.id;
  }

  // 1. Create Notification record
  const notification = await prisma.notification.create({
    data: {
      type: config.type,
      category: 'ORDER',
      title: config.title,
      message: config.message,
      deepLink,
      entityType: 'ORDER',
      entityId: order.id,
      orderId: validOrderId,
      severity: eventStatus === 'CANCELLED' || eventStatus === 'FAILED' ? 'WARNING' : 'INFO',
      priority: 'HIGH',
      isActive: true,
    },
  });

  // 2. Create NotificationRecipient strictly for this customer
  await prisma.notificationRecipient.create({
    data: {
      notificationId: notification.id,
      customerId: order.customerId,
      isRead: false,
    },
  });

  // 3. Dispatch Push Notification if customer has active push tokens
  const shouldSendPush =
    !customer.notificationPreference || customer.notificationPreference.orderUpdatesEnabled;

  if (shouldSendPush && customer.pushTokens.length > 0) {
    const pushItems = customer.pushTokens.map((pt) => ({
      notificationId: notification.id,
      customerPushTokenId: pt.id,
      token: pt.token,
      title: config.title,
      body: config.message,
      data: {
        notificationId: notification.id,
        type: config.type,
        entityType: 'ORDER',
        entityId: order.id,
        deepLink,
      },
      channelId: 'orders',
    }));

    sendPushNotifications(pushItems).catch((err) => {
      logger.warn('[NOTIFICATION SERVICE] Failed to dispatch order push', { error: err.message });
    });
  }

  return notification;
}
