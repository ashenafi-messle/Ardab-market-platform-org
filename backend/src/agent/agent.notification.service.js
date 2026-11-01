// ==============================================================================
// Ardab Market - Agent Notification & Push Dispatch Service
// ==============================================================================

import { prisma } from '../shared/config/database.js';
import { logger } from '../shared/utils/logger.js';
import { ApiError } from '../shared/utils/apiResponse.js';
import {
  isExpoPushToken,
  sendPushNotifications,
} from '../shared/services/pushNotification.service.js';

export class AgentNotificationService {
  /**
   * Retrieves paginated notifications for an agent
   */
  static async getNotifications(agentId, { page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [total, unreadCount, items] = await Promise.all([
      prisma.agentNotification.count({
        where: { agentId },
      }),
      prisma.agentNotification.count({
        where: { agentId, isRead: false },
      }),
      prisma.agentNotification.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const formattedItems = items.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      orderId: n.orderId,
      order: n.order
        ? {
            id: n.order.id,
            orderNumber: n.order.orderNumber,
            totalAmount: Number(n.order.totalAmount),
            status: n.order.status,
          }
        : null,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
      createdAt: n.createdAt.toISOString(),
    }));

    return {
      notifications: formattedItems,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Returns unread notification count
   */
  static async getUnreadCount(agentId) {
    const unreadCount = await prisma.agentNotification.count({
      where: { agentId, isRead: false },
    });
    return { unreadCount };
  }

  /**
   * Marks a notification as read
   */
  static async markAsRead(agentId, notificationId) {
    const notification = await prisma.agentNotification.findFirst({
      where: { id: notificationId, agentId },
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found.', 'NOT_FOUND');
    }

    if (!notification.isRead) {
      await prisma.agentNotification.update({
        where: { id: notificationId },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    }

    return { message: 'Notification marked as read.' };
  }

  /**
   * Marks all notifications belonging to an agent as read
   */
  static async markAllAsRead(agentId) {
    await prisma.agentNotification.updateMany({
      where: { agentId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: 'All notifications marked as read.' };
  }

  /**
   * Registers or updates an Expo push token for an agent device
   */
  static async registerDevice(agentId, { expoPushToken, platform, deviceId }) {
    if (!isExpoPushToken(expoPushToken)) {
      throw ApiError.badRequest('Invalid Expo push token format.', 'INVALID_PUSH_TOKEN');
    }

    const tokenRecord = await prisma.agentPushToken.upsert({
      where: {
        agentId_expoPushToken: {
          agentId,
          expoPushToken,
        },
      },
      create: {
        agentId,
        expoPushToken,
        platform: platform || 'android',
        deviceId: deviceId || null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        platform: platform || 'android',
        deviceId: deviceId || null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });

    return {
      message: 'Device registered for push notifications.',
      tokenId: tokenRecord.id,
    };
  }

  /**
   * Removes / deactivates an Expo push token on logout
   */
  static async removeDevice(agentId, identifier) {
    await prisma.agentPushToken.updateMany({
      where: {
        agentId,
        OR: [{ expoPushToken: identifier }, { deviceId: identifier }, { id: identifier }],
      },
      data: { isActive: false },
    });

    return { message: 'Device unregistered successfully.' };
  }

  /**
   * Dispatches Order Accepted Notification (In-App Notification + Expo Push)
   * Transactional and idempotent.
   */
  static async dispatchOrderAcceptedNotification(order, attributedAgent) {
    if (!attributedAgent || !order) return;

    const customerName = order.customer?.fullName || 'Customer';
    const orderNumber = order.orderNumber || order.id;
    const title = 'New Accepted Order!';
    const message = `Your integrated customer, ${customerName}, has placed order #${orderNumber} which has been accepted by Ardab Market.`;

    try {
      // 1. Idempotently create AgentNotification record
      let notifRecord = await prisma.agentNotification.findFirst({
        where: {
          agentId: attributedAgent.id,
          orderId: order.id,
          type: 'ORDER_ACCEPTED',
        },
      });

      if (!notifRecord) {
        notifRecord = await prisma.agentNotification.create({
          data: {
            agentId: attributedAgent.id,
            orderId: order.id,
            type: 'ORDER_ACCEPTED',
            title,
            message,
            metadata: JSON.stringify({
              orderId: order.id,
              orderNumber,
              customerName,
              totalAmount: Number(order.totalAmount),
              acceptedAt: new Date().toISOString(),
            }),
          },
        });
      }

      // 2. Fetch active push tokens for this agent
      const activeTokens = await prisma.agentPushToken.findMany({
        where: {
          agentId: attributedAgent.id,
          isActive: true,
        },
      });

      if (activeTokens.length === 0) {
        logger.info('[AgentPush] No active push tokens registered for agent', { agentId: attributedAgent.id });
        return;
      }

      // 3. Prepare Expo push items
      const pushItems = activeTokens.map((t) => ({
        token: t.expoPushToken,
        title,
        body: message,
        sound: 'default',
        badge: 1,
        channelId: 'agent-orders',
        data: {
          screen: 'OrderDetails',
          orderId: order.id,
          orderNumber,
          notificationId: notifRecord.id,
        },
      }));

      // 4. Dispatch push via shared Expo dispatcher
      sendPushNotifications(pushItems).catch((err) => {
        logger.warn('[AgentPush] Background push dispatch failed', { error: err.message, agentId: attributedAgent.id });
      });

      logger.info('[AgentNotification] Order accepted notification sent to agent', {
        agentId: attributedAgent.id,
        orderId: order.id,
        devicesCount: activeTokens.length,
      });
    } catch (err) {
      logger.error('[AgentNotification] Error in dispatchOrderAcceptedNotification', {
        error: err.message,
        orderId: order.id,
        agentId: attributedAgent.id,
      });
    }
  }
}

