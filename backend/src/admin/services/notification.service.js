// ==============================================================================
// Ardab Market - Notifications & Operational Alerts Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Formats a raw notification with recipient-specific state.
 *
 * @param {object} notification
 * @param {string} [adminId]
 * @returns {object}
 */
export function formatNotificationResponse(notification, adminId = null) {
  if (!notification) return null;

  let recipient = null;
  if (adminId && Array.isArray(notification.recipients)) {
    recipient = notification.recipients.find((r) => r.adminId === adminId);
  }
  if (!recipient && Array.isArray(notification.recipients) && notification.recipients.length > 0) {
    recipient = notification.recipients[0];
  }

  let parsedMetadata = null;
  if (notification.metadata) {
    try {
      parsedMetadata =
        typeof notification.metadata === 'string'
          ? JSON.parse(notification.metadata)
          : notification.metadata;
    } catch {
      parsedMetadata = notification.metadata;
    }
  }

  return {
    id: notification.id,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    priority: notification.priority,
    isAlert: Boolean(notification.isAlert),
    entityType: notification.entityType || null,
    entityId: notification.entityId || null,
    actionUrl: notification.actionUrl || null,
    metadata: parsedMetadata,
    targetRole: notification.targetRole || null,
    adminId: notification.adminId || null,
    createdAt: notification.createdAt ? notification.createdAt.toISOString() : null,
    expiresAt: notification.expiresAt ? notification.expiresAt.toISOString() : null,
    isRead: recipient ? Boolean(recipient.isRead) : false,
    readAt: recipient?.readAt ? recipient.readAt.toISOString() : null,
    isAcknowledged: recipient ? Boolean(recipient.isAcknowledged) : false,
    acknowledgedAt: recipient?.acknowledgedAt ? recipient.acknowledgedAt.toISOString() : null,
    acknowledgedById: recipient?.acknowledgedById || null,
    acknowledgementNotes: recipient?.acknowledgementNotes || null,
    admin: notification.admin
      ? {
          id: notification.admin.id,
          name: notification.admin.name,
          email: notification.admin.email,
        }
      : null,
  };
}

/**
 * Creates a notification or operational alert and distributes to recipient admins.
 *
 * @param {object} params
 * @param {object} [creatorAdmin]
 * @returns {Promise<object>}
 */
export async function createNotification(params, creatorAdmin = null) {
  const {
    type = 'NOTIFICATION',
    category = 'SYSTEM',
    title,
    message,
    severity = 'INFO',
    priority = 'NORMAL',
    isAlert = false,
    entityType = null,
    entityId = null,
    actionUrl = null,
    metadata = null,
    targetRole = null,
    recipientAdminIds = null,
  } = params;

  if (!title || !message) {
    throw ApiError.badRequest('Title and message are required for notification');
  }

  const stringifiedMetadata =
    metadata && typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;

  // Determine target admin recipients
  let targetAdmins = [];
  if (Array.isArray(recipientAdminIds) && recipientAdminIds.length > 0) {
    targetAdmins = await prisma.adminUser.findMany({
      where: {
        id: { in: recipientAdminIds },
        status: 'ACTIVE',
      },
      select: { id: true },
    });
  } else {
    const where = { status: 'ACTIVE' };
    if (targetRole) {
      where.role = targetRole;
    }
    targetAdmins = await prisma.adminUser.findMany({
      where,
      select: { id: true },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const notification = await tx.notification.create({
      data: {
        type,
        category,
        title,
        message,
        severity,
        priority,
        isAlert: Boolean(isAlert),
        entityType,
        entityId,
        actionUrl,
        metadata: stringifiedMetadata,
        targetRole,
        adminId: creatorAdmin?.id || null,
      },
    });

    if (targetAdmins.length > 0) {
      await tx.notificationRecipient.createMany({
        data: targetAdmins.map((admin) => ({
          notificationId: notification.id,
          adminId: admin.id,
          isRead: false,
          isAcknowledged: false,
        })),
        skipDuplicates: true,
      });
    }

    return notification;
  });

  logger.info(`Notification created: [${result.type}] ${result.title}`, {
    notificationId: result.id,
    recipientsCount: targetAdmins.length,
    isAlert: result.isAlert,
    severity: result.severity,
  });

  return formatNotificationResponse(result, creatorAdmin?.id);
}

/**
 * Lists notifications with pagination, tab filtering, and search.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function listNotifications({ adminUser, query = {} }) {
  const {
    page = 1,
    pageSize = 20,
    search,
    category,
    type,
    severity,
    priority,
    isAlert,
    isRead,
    isAcknowledged,
    tab,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // Recipient-level condition
  const recipientWhere = {
    adminId: adminUser.id,
  };

  if (typeof isRead === 'boolean') {
    recipientWhere.isRead = isRead;
  }
  if (typeof isAcknowledged === 'boolean') {
    recipientWhere.isAcknowledged = isAcknowledged;
  }

  // Notification-level condition
  const notificationWhere = {};

  if (category && category !== 'ALL') {
    notificationWhere.category = category;
  }
  if (type && type !== 'ALL') {
    notificationWhere.type = type;
  }
  if (severity && severity !== 'ALL') {
    notificationWhere.severity = severity;
  }
  if (priority && priority !== 'ALL') {
    notificationWhere.priority = priority;
  }
  if (typeof isAlert === 'boolean') {
    notificationWhere.isAlert = isAlert;
  }

  // Tab handling
  if (tab) {
    if (tab === 'ALERTS') {
      notificationWhere.isAlert = true;
    } else if (tab === 'UNREAD') {
      recipientWhere.isRead = false;
    } else if (['ORDER', 'DELIVERY', 'FLEET', 'SECURITY', 'SYSTEM'].includes(tab)) {
      notificationWhere.category = tab;
    }
  }

  // Search filter
  if (search && search.trim()) {
    const term = search.trim();
    notificationWhere.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { message: { contains: term, mode: 'insensitive' } },
      { entityId: { contains: term, mode: 'insensitive' } },
    ];
  }

  // Date range filter
  if (startDate || endDate) {
    notificationWhere.createdAt = {};
    if (startDate) {
      notificationWhere.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      notificationWhere.createdAt.lte = new Date(endDate);
    }
  }

  const combinedWhere = {
    ...recipientWhere,
    notification: notificationWhere,
  };

  // Determine sorting
  const orderBy = [];
  if (sortBy === 'isRead') {
    orderBy.push({ isRead: sortOrder });
  } else if (sortBy === 'severity') {
    orderBy.push({ notification: { severity: sortOrder } });
  } else if (sortBy === 'priority') {
    orderBy.push({ notification: { priority: sortOrder } });
  } else {
    orderBy.push({ notification: { createdAt: sortOrder } });
  }

  const [recipientRecords, total, unreadCount, alertCount] = await Promise.all([
    prisma.notificationRecipient.findMany({
      where: combinedWhere,
      include: {
        notification: {
          include: {
            admin: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      skip,
      take,
      orderBy,
    }),
    prisma.notificationRecipient.count({
      where: combinedWhere,
    }),
    prisma.notificationRecipient.count({
      where: {
        adminId: adminUser.id,
        isRead: false,
      },
    }),
    prisma.notificationRecipient.count({
      where: {
        adminId: adminUser.id,
        notification: { isAlert: true },
        isAcknowledged: false,
      },
    }),
  ]);

  const items = recipientRecords.map((r) => {
    const notif = r.notification;
    notif.recipients = [r];
    return formatNotificationResponse(notif, adminUser.id);
  });

  const totalPages = Math.ceil(total / take) || 1;

  return {
    items,
    pagination: {
      page: Number(page),
      pageSize: take,
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1,
    },
    unreadCount,
    alertCount,
  };
}

/**
 * Fetches metrics and summary counts for the current admin user.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function getNotificationSummary({ adminUser }) {
  const [total, unreadCount, alertCount, criticalCount, byCategoryRaw, recentAlertsRaw] =
    await Promise.all([
      prisma.notificationRecipient.count({
        where: { adminId: adminUser.id },
      }),
      prisma.notificationRecipient.count({
        where: { adminId: adminUser.id, isRead: false },
      }),
      prisma.notificationRecipient.count({
        where: {
          adminId: adminUser.id,
          notification: { isAlert: true },
          isAcknowledged: false,
        },
      }),
      prisma.notificationRecipient.count({
        where: {
          adminId: adminUser.id,
          notification: { isAlert: true, severity: 'CRITICAL' },
          isAcknowledged: false,
        },
      }),
      prisma.notificationRecipient.groupBy({
        by: ['notificationId'],
        where: { adminId: adminUser.id },
      }),
      prisma.notificationRecipient.findMany({
        where: {
          adminId: adminUser.id,
          notification: { isAlert: true },
          isAcknowledged: false,
        },
        include: {
          notification: true,
        },
        orderBy: {
          notification: { createdAt: 'desc' },
        },
        take: 5,
      }),
    ]);

  // Aggregate category breakdown
  const categoryCounts = {
    ORDER: 0,
    DELIVERY: 0,
    FLEET: 0,
    SECURITY: 0,
    SYSTEM: 0,
    PAYMENT: 0,
    CUSTOMER: 0,
  };

  const notificationCategories = await prisma.notification.findMany({
    where: {
      recipients: {
        some: { adminId: adminUser.id },
      },
    },
    select: { category: true },
  });

  for (const item of notificationCategories) {
    if (categoryCounts[item.category] !== undefined) {
      categoryCounts[item.category]++;
    }
  }

  const recentAlerts = recentAlertsRaw.map((r) => {
    const notif = r.notification;
    notif.recipients = [r];
    return formatNotificationResponse(notif, adminUser.id);
  });

  return {
    total,
    unreadCount,
    alertCount,
    criticalCount,
    byCategory: categoryCounts,
    recentAlerts,
  };
}

/**
 * Fetches a single notification by ID.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function getNotificationById({ id, adminUser }) {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: {
      admin: {
        select: { id: true, name: true, email: true },
      },
      recipients: {
        where: { adminId: adminUser.id },
      },
    },
  });

  if (!notification) {
    throw ApiError.notFound(`Notification with ID "${id}" not found`);
  }

  return formatNotificationResponse(notification, adminUser.id);
}

/**
 * Marks a single notification as read for the current admin user.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function markAsRead({ id, adminUser }) {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw ApiError.notFound(`Notification with ID "${id}" not found`);
  }

  const recipient = await prisma.notificationRecipient.upsert({
    where: {
      notificationId_adminId: {
        notificationId: id,
        adminId: adminUser.id,
      },
    },
    update: {
      isRead: true,
      readAt: new Date(),
    },
    create: {
      notificationId: id,
      adminId: adminUser.id,
      isRead: true,
      readAt: new Date(),
      isAcknowledged: false,
    },
  });

  notification.recipients = [recipient];
  return formatNotificationResponse(notification, adminUser.id);
}

/**
 * Marks all unread notifications as read for the current admin user.
 *
 * @param {object} options
 * @returns {Promise<{ updatedCount: number }>}
 */
export async function markAllAsRead({ adminUser, category = null }) {
  const whereClause = {
    adminId: adminUser.id,
    isRead: false,
  };

  if (category && category !== 'ALL') {
    whereClause.notification = { category };
  }

  const result = await prisma.notificationRecipient.updateMany({
    where: whereClause,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: result.count };
}

/**
 * Bulk marks notifications as read.
 *
 * @param {object} options
 * @returns {Promise<{ updatedCount: number }>}
 */
export async function bulkMarkAsRead({ notificationIds, adminUser }) {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw ApiError.badRequest('notificationIds array is required');
  }

  const result = await prisma.notificationRecipient.updateMany({
    where: {
      adminId: adminUser.id,
      notificationId: { in: notificationIds },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { updatedCount: result.count };
}

/**
 * Acknowledges an operational alert.
 *
 * @param {object} options
 * @returns {Promise<object>}
 */
export async function acknowledgeAlert({ id, adminUser, notes = null, ipAddress = null }) {
  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw ApiError.notFound(`Notification with ID "${id}" not found`);
  }

  if (!notification.isAlert) {
    throw ApiError.badRequest(`Notification "${id}" is not designated as an operational alert`);
  }

  const now = new Date();
  const recipient = await prisma.notificationRecipient.upsert({
    where: {
      notificationId_adminId: {
        notificationId: id,
        adminId: adminUser.id,
      },
    },
    update: {
      isAcknowledged: true,
      acknowledgedAt: now,
      acknowledgedById: adminUser.id,
      acknowledgementNotes: notes || null,
      isRead: true,
      readAt: now,
    },
    create: {
      notificationId: id,
      adminId: adminUser.id,
      isAcknowledged: true,
      acknowledgedAt: now,
      acknowledgedById: adminUser.id,
      acknowledgementNotes: notes || null,
      isRead: true,
      readAt: now,
    },
  });

  // Record Audit Log for security and compliance
  try {
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        action: 'ACKNOWLEDGE_OPERATIONAL_ALERT',
        entity: 'NOTIFICATION_ALERT',
        entityId: id,
        ipAddress: ipAddress || null,
        changesSummary: `Operational alert "${notification.title}" [${notification.severity}] acknowledged by ${adminUser.name} (${adminUser.email}). Notes: ${notes || 'None provided'}`,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log for operational alert acknowledgement:', {
      error: err.message,
      alertId: id,
    });
  }

  notification.recipients = [recipient];
  return formatNotificationResponse(notification, adminUser.id);
}

/**
 * Bulk acknowledges multiple operational alerts.
 *
 * @param {object} options
 * @returns {Promise<{ updatedCount: number }>}
 */
export async function bulkAcknowledgeAlerts({
  notificationIds,
  adminUser,
  notes = null,
  ipAddress = null,
}) {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    throw ApiError.badRequest('notificationIds array is required');
  }

  const now = new Date();
  const result = await prisma.notificationRecipient.updateMany({
    where: {
      adminId: adminUser.id,
      notificationId: { in: notificationIds },
      isAcknowledged: false,
    },
    data: {
      isAcknowledged: true,
      acknowledgedAt: now,
      acknowledgedById: adminUser.id,
      acknowledgementNotes: notes || null,
      isRead: true,
      readAt: now,
    },
  });

  try {
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email,
        action: 'BULK_ACKNOWLEDGE_OPERATIONAL_ALERTS',
        entity: 'NOTIFICATION_ALERT',
        entityId: notificationIds.join(', '),
        ipAddress: ipAddress || null,
        changesSummary: `Bulk acknowledged ${result.count} operational alerts by ${adminUser.name}. Notes: ${notes || 'None provided'}`,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log for bulk alert acknowledgement:', {
      error: err.message,
    });
  }

  return { updatedCount: result.count };
}
