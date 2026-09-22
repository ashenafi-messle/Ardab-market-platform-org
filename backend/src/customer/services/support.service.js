// ==============================================================================
// Ardab Market - Customer Support Service
// ==============================================================================
// Customer-facing service that shares the single source of truth:
// prisma.supportTicket, prisma.supportMessage, and prisma.supportCategory.
// Enforces strict customer authentication, IDOR guards, and input sanitization.

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { generateNextTicketNumber } from '../../admin/services/supportCode.service.js';
import { createNotification } from '../../admin/services/notification.service.js';

/**
 * Basic HTML tag sanitization to prevent stored XSS.
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Lists active categories for customer selection.
 */
export async function listCategories() {
  const categories = await prisma.supportCategory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: 'asc' },
  });

  return categories;
}

/**
 * Lists recent orders belonging to the customer for optional ticket linking.
 */
export async function listCustomerOrders(customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const orders = await prisma.order.findMany({
    where: { customerId },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      status: true,
      paymentStatus: true,
      placedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return orders;
}

/**
 * Lists customer support requests with server-side pagination, status filter, and unread flags.
 */
export async function listCustomerRequests(customerId, query = {}) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const {
    page = 1,
    pageSize = 10,
    status = 'ALL',
    search = '',
  } = query;

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // Authoritative customer filter: prevents IDOR
  const where = { customerId };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { ticketNumber: { contains: term, mode: 'insensitive' } },
      { subject: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [records, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        city: true,
        lastMessageAt: true,
        lastCustomerMessageAt: true,
        lastAgentMessageAt: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true },
        },
        order: {
          select: { id: true, orderNumber: true },
        },
        _count: {
          select: {
            messages: {
              where: { isInternal: false },
            },
          },
        },
      },
      skip,
      take,
      orderBy: { lastMessageAt: 'desc' },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  // Format customer-safe records with unread reply indicator
  const items = records.map((t) => {
    const hasUnreadReply = Boolean(
      t.lastAgentMessageAt &&
        (!t.lastCustomerMessageAt || t.lastAgentMessageAt > t.lastCustomerMessageAt)
    );

    return {
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      category: t.category?.name || 'General',
      categoryId: t.category?.id || null,
      orderNumber: t.order?.orderNumber || null,
      orderId: t.order?.id || null,
      city: t.city,
      lastMessageAt: t.lastMessageAt ? t.lastMessageAt.toISOString() : null,
      createdAt: t.createdAt ? t.createdAt.toISOString() : null,
      messagesCount: t._count?.messages || 0,
      hasUnreadReply,
    };
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
  };
}

/**
 * Retrieves a customer's single support request with conversation messages.
 * Marks unread messages as read automatically.
 */
export async function getCustomerRequestById(requestId, customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  // Authoritative IDOR guard: must match both ticket identifier and customerId
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      OR: [
        { id: requestId },
        { ticketNumber: requestId },
      ],
    },
    include: {
      category: {
        select: { id: true, name: true, description: true },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          placedAt: true,
        },
      },
      messages: {
        where: { isInternal: false }, // CRITICAL: Exclude staff internal notes
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          senderType: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  if (!ticket) {
    throw ApiError.notFound('Support request not found or access denied', 'TICKET_NOT_FOUND');
  }

  // If there are unread staff replies, update lastCustomerMessageAt to now
  const hasUnread = Boolean(
    ticket.lastAgentMessageAt &&
      (!ticket.lastCustomerMessageAt || ticket.lastAgentMessageAt > ticket.lastCustomerMessageAt)
  );

  if (hasUnread) {
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { lastCustomerMessageAt: new Date() },
    });
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    city: ticket.city,
    category: ticket.category?.name || 'General',
    categoryId: ticket.category?.id || null,
    order: ticket.order
      ? {
          id: ticket.order.id,
          orderNumber: ticket.order.orderNumber,
          status: ticket.order.status,
          totalAmount: ticket.order.totalAmount,
          placedAt: ticket.order.placedAt ? ticket.order.placedAt.toISOString() : null,
        }
      : null,
    createdAt: ticket.createdAt ? ticket.createdAt.toISOString() : null,
    lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
    messages: ticket.messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderType: m.senderType,
      isSelf: m.senderType === 'CUSTOMER',
      senderName:
        m.senderType === 'CUSTOMER'
          ? 'You'
          : m.senderType === 'SUBADMIN'
          ? 'Ardab Support'
          : 'System Notification',
      createdAt: m.createdAt ? m.createdAt.toISOString() : null,
    })),
  };
}

/**
 * Creates a new support request by an authenticated customer.
 */
export async function createCustomerRequest(customerId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  // 1. Authoritative Customer verification
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true, email: true, phone: true, city: true, status: true },
  });

  if (!customer) {
    throw ApiError.unauthorized('Customer account does not exist or has been deleted');
  }

  if (customer.status === 'SUSPENDED') {
    throw ApiError.forbidden('Your account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  // 2. Validate category if provided
  let categoryId = null;
  if (data.categoryId) {
    const cat = await prisma.supportCategory.findFirst({
      where: {
        isActive: true,
        OR: [{ id: data.categoryId }, { name: data.categoryId }],
      },
    });
    if (!cat) {
      throw ApiError.badRequest('Selected support category does not exist or is inactive', 'INVALID_CATEGORY');
    }
    categoryId = cat.id;
  }

  // 3. Validate Order ownership if provided
  let orderId = null;
  if (data.orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        customerId: customer.id, // Strictly verify order belongs to authenticated customer
      },
    });
    if (!order) {
      throw ApiError.badRequest(
        'Referenced order was not found or does not belong to your account',
        'UNAUTHORIZED_ORDER_LINK'
      );
    }
    orderId = order.id;
  }

  const sanitizedSubject = sanitizeText(data.subject);
  const sanitizedMessage = sanitizeText(data.message);

  if (!sanitizedSubject || sanitizedSubject.length < 3) {
    throw ApiError.badRequest('Subject must be at least 3 characters long', 'INVALID_SUBJECT');
  }

  if (!sanitizedMessage || sanitizedMessage.length < 2) {
    throw ApiError.badRequest('Message cannot be empty', 'EMPTY_MESSAGE');
  }

  // 4. Resolve assigned subadmin for customer's city
  const targetCity = customer.city || 'Gondar';
  let assignedSubadminId = null;

  let assignedAdmin = await prisma.adminUser.findFirst({
    where: {
      status: 'ACTIVE',
      role: 'SUB_ADMIN',
      OR: [
        { assignedCities: { has: targetCity } },
        { assignedCities: { has: 'All Cities' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!assignedAdmin) {
    assignedAdmin = await prisma.adminUser.findFirst({
      where: {
        status: 'ACTIVE',
        role: 'SUB_ADMIN',
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!assignedAdmin) {
    assignedAdmin = await prisma.adminUser.findFirst({
      where: {
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  if (assignedAdmin) {
    assignedSubadminId = assignedAdmin.id;
  }

  // 5. Generate next sequential ticket number (ARD-SUP-YYYYMMDD-XXXXXX)
  const ticketNumber = await generateNextTicketNumber();
  const now = new Date();

  // 6. Transactionally create ticket, assignment history, and initial customer message
  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.create({
      data: {
        ticketNumber,
        customerId: customer.id,
        assignedSubadminId: assignedSubadminId || null,
        categoryId,
        orderId,
        city: customer.city || 'Gondar',
        priority: data.priority || 'NORMAL',
        status: 'OPEN',
        subject: sanitizedSubject,
        description: sanitizedMessage,
        lastCustomerMessageAt: now,
        lastMessageAt: now,
      },
      include: {
        category: true,
        order: { select: { id: true, orderNumber: true } },
        assignedSubadmin: { select: { id: true, name: true, email: true } },
      },
    });

    if (assignedSubadminId) {
      await tx.supportTicketAssignmentHistory.create({
        data: {
          ticketId: ticket.id,
          assignedToId: assignedSubadminId,
          changedById: assignedSubadminId,
        },
      });
    }

    const initialMessage = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: customer.id,
        senderType: 'CUSTOMER',
        messageType: 'MESSAGE',
        body: sanitizedMessage,
        isInternal: false,
        createdAt: now,
      },
    });

    return { ticket, initialMessage };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  // 6. Record CustomerActivity audit event
  try {
    await prisma.customerActivity.create({
      data: {
        customerId: customer.id,
        action: 'SUPPORT_TICKET_CREATED',
        description: `Created support ticket ${result.ticket.ticketNumber}: ${sanitizedSubject}`,
        actor: 'Customer',
        metadata: JSON.stringify({
          ticketId: result.ticket.id,
          ticketNumber: result.ticket.ticketNumber,
          orderId,
        }),
      },
    });
  } catch (err) {
    logger.warn('[SUPPORT] Failed to record customer activity for ticket creation:', err);
  }

  // 7. Dispatch Sub Admin notification event using existing notification service
  try {
    await createNotification({
      type: 'NOTIFICATION',
      category: 'SUPPORT',
      title: `New Support Request #${result.ticket.ticketNumber}`,
      message: `${customer.fullName || 'Customer'} opened support ticket: ${sanitizedSubject}`,
      severity: 'INFO',
      priority: data.priority === 'HIGH' || data.priority === 'URGENT' ? 'HIGH' : 'NORMAL',
      isAlert: data.priority === 'URGENT',
      entityType: 'SUPPORT_TICKET',
      entityId: result.ticket.id,
      actionUrl: `/subadmin/support?ticket=${result.ticket.ticketNumber}`,
      targetRole: 'SUB_ADMIN',
    });
  } catch (err) {
    logger.warn('[SUPPORT] Failed to dispatch admin notification for support ticket creation:', err);
  }

  return {
    id: result.ticket.id,
    ticketNumber: result.ticket.ticketNumber,
    subject: result.ticket.subject,
    status: result.ticket.status,
    priority: result.ticket.priority,
    category: result.ticket.category?.name || 'General',
    orderNumber: result.ticket.order?.orderNumber || null,
    createdAt: result.ticket.createdAt.toISOString(),
  };
}

/**
 * Replies to an existing support request from the authenticated customer.
 */
export async function replyCustomerRequest(requestId, customerId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  // 1. Authoritative ownership & lifecycle check
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      OR: [
        { id: requestId },
        { ticketNumber: requestId },
      ],
    },
    include: {
      customer: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!ticket) {
    throw ApiError.notFound('Support request not found or access denied', 'TICKET_NOT_FOUND');
  }

  if (ticket.status === 'CLOSED') {
    throw ApiError.badRequest(
      'This support ticket is closed and cannot receive new replies. Please create a new ticket.',
      'TICKET_CLOSED'
    );
  }

  if (ticket.status === 'RESOLVED') {
    throw ApiError.badRequest(
      'This support ticket is already resolved. If you require further assistance, please open a new ticket.',
      'TICKET_RESOLVED'
    );
  }

  // 2. Prevent duplicate replies via idempotency key
  if (data.idempotencyKey) {
    const existing = await prisma.supportMessage.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });
    if (existing) {
      logger.info(`[SUPPORT] Duplicate customer reply suppressed via Idempotency-Key: ${data.idempotencyKey}`);
      return {
        id: existing.id,
        body: existing.body,
        senderType: existing.senderType,
        isSelf: true,
        senderName: 'You',
        createdAt: existing.createdAt.toISOString(),
      };
    }
  }

  const sanitizedMessage = sanitizeText(data.message);
  if (!sanitizedMessage || sanitizedMessage.length < 1) {
    throw ApiError.badRequest('Reply message cannot be empty', 'EMPTY_MESSAGE');
  }

  // 3. Determine lifecycle transition: if status was WAITING_FOR_CUSTOMER, return to IN_PROGRESS
  const shouldTransitionStatus = ticket.status === 'WAITING_FOR_CUSTOMER';
  const now = new Date();

  // 4. Transactionally persist reply and touch metadata
  const createdMessage = await prisma.$transaction(async (tx) => {
    const msg = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: customerId,
        senderType: 'CUSTOMER',
        messageType: 'MESSAGE',
        body: sanitizedMessage,
        isInternal: false,
        idempotencyKey: data.idempotencyKey || null,
        createdAt: now,
      },
    });

    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        lastCustomerMessageAt: now,
        status: shouldTransitionStatus ? 'IN_PROGRESS' : undefined,
      },
    });

    return msg;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  // 5. Record CustomerActivity audit event
  try {
    await prisma.customerActivity.create({
      data: {
        customerId,
        action: 'SUPPORT_TICKET_REPLIED',
        description: `Customer replied to support ticket ${ticket.ticketNumber}`,
        actor: 'Customer',
        metadata: JSON.stringify({
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          messageId: createdMessage.id,
        }),
      },
    });
  } catch (err) {
    logger.warn('[SUPPORT] Failed to record customer activity for ticket reply:', err);
  }

  // 6. Notify assigned subadmin or support team
  try {
    await createNotification({
      type: 'NOTIFICATION',
      category: 'SUPPORT',
      title: `Customer Reply on #${ticket.ticketNumber}`,
      message: `${ticket.customer.fullName || 'Customer'} replied: ${sanitizedMessage.slice(0, 100)}...`,
      severity: 'INFO',
      priority: 'NORMAL',
      entityType: 'SUPPORT_TICKET',
      entityId: ticket.id,
      actionUrl: `/subadmin/support?ticket=${ticket.ticketNumber}`,
      targetRole: 'SUB_ADMIN',
      recipientAdminIds: ticket.assignedSubadminId ? [ticket.assignedSubadminId] : null,
    });
  } catch (err) {
    logger.warn('[SUPPORT] Failed to dispatch admin notification for customer reply:', err);
  }

  return {
    id: createdMessage.id,
    body: createdMessage.body,
    senderType: createdMessage.senderType,
    isSelf: true,
    senderName: 'You',
    createdAt: createdMessage.createdAt.toISOString(),
  };
}

/**
 * Explicitly marks a ticket's unread messages as read by the customer.
 */
export async function markCustomerRequestRead(requestId, customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      OR: [
        { id: requestId },
        { ticketNumber: requestId },
      ],
    },
  });

  if (!ticket) {
    throw ApiError.notFound('Support request not found or access denied', 'TICKET_NOT_FOUND');
  }

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { lastCustomerMessageAt: new Date() },
  });

  return { success: true };
}
