// ==============================================================================
// Ardab Market - Customer Support & Ticket Management Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { EmailService } from '../../shared/services/email/email.service.js';
import { generateNextTicketNumber } from './supportCode.service.js';
import {
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_MESSAGE_TYPE,
  SUPPORT_SENDER_TYPE,
  SUPPORT_EMAIL_STATUS,
} from '../constants/supportConstants.js';

/**
 * Extracts sanitized admin ID from authenticated admin object or string ID
 */
export function getAdminId(adminUser) {
  if (!adminUser) {
    throw ApiError.unauthorized('Authenticated admin user is required');
  }
  const id = typeof adminUser === 'string' ? adminUser : adminUser.id || adminUser.adminId;
  if (!id) {
    throw ApiError.unauthorized('Authenticated admin user identity is invalid or missing');
  }
  return String(id);
}

/**
 * Auto-resolves active Sub Admin responsible for the ticket if unassigned.
 */
export async function resolveSubadminForTicket(ticket) {
  if (!ticket || ticket.assignedSubadminId || ticket.assignedSubadmin) {
    return ticket;
  }

  const ticketCity = ticket.city || 'Gondar';
  let assignedAdmin = await prisma.adminUser.findFirst({
    where: {
      status: 'ACTIVE',
      role: 'SUB_ADMIN',
      OR: [
        { assignedCities: { has: ticketCity } },
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
    ticket.assignedSubadminId = assignedAdmin.id;
    ticket.assignedSubadmin = {
      id: assignedAdmin.id,
      name: assignedAdmin.name,
      email: assignedAdmin.email,
    };

    // Asynchronously persist assignment to DB so subsequent reads are immediate
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { assignedSubadminId: assignedAdmin.id },
    }).then(async () => {
      await prisma.supportTicketAssignmentHistory.create({
        data: {
          ticketId: ticket.id,
          assignedToId: assignedAdmin.id,
          changedById: assignedAdmin.id,
        },
      }).catch(() => {});
    }).catch((err) => {
      logger.warn(`Failed to auto-persist ticket assignment for ${ticket.id}:`, err);
    });
  }

  return ticket;
}

/**
 * Formats a raw ticket database record for API response
 */
export function formatTicketResponse(ticket) {
  if (!ticket) return null;

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerId: ticket.customerId,
    customerName: ticket.customer?.fullName || 'Customer',
    customerPhone: ticket.customer?.phone || '',
    customerEmail: ticket.customer?.email || null,
    city: ticket.city,
    status: ticket.status,
    priority: ticket.priority,
    subject: ticket.subject,
    description: ticket.description || '',
    category: ticket.category?.name || 'OTHER',
    categoryId: ticket.categoryId,
    orderId: ticket.order?.orderNumber || ticket.orderId || null,
    assignedTo: ticket.assignedSubadmin?.name || (ticket.assignedSubadminId ? 'Assigned' : 'Unassigned'),
    assignedSubadminId: ticket.assignedSubadminId,
    assignedSubadmin: ticket.assignedSubadmin
      ? {
          id: ticket.assignedSubadmin.id,
          name: ticket.assignedSubadmin.name,
          email: ticket.assignedSubadmin.email,
        }
      : null,
    resolutionNotes: ticket.resolutionNotes || '',
    lastMessageAt: ticket.lastMessageAt ? ticket.lastMessageAt.toISOString() : null,
    firstResponseAt: ticket.firstResponseAt ? ticket.firstResponseAt.toISOString() : null,
    resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : null,
    closedAt: ticket.closedAt ? ticket.closedAt.toISOString() : null,
    createdAt: ticket.createdAt ? ticket.createdAt.toISOString() : null,
    updatedAt: ticket.updatedAt ? ticket.updatedAt.toISOString() : null,
    messagesCount: ticket._count?.messages || ticket.messages?.length || 0,
    messages: Array.isArray(ticket.messages)
      ? ticket.messages.map((m) => ({
          id: m.id,
          ticketId: m.ticketId,
          senderName: m.senderType === 'CUSTOMER'
            ? ticket.customer?.fullName || 'Customer'
            : m.senderType === 'SUBADMIN'
            ? 'Support Agent'
            : 'System Notification',
          senderType: m.senderType,
          messageType: m.messageType,
          body: m.body,
          message: m.body, // Compatibility alias for frontend
          isInternal: m.isInternal,
          emailStatus: m.emailStatus,
          emailMessageId: m.emailMessageId,
          timestamp: m.createdAt ? m.createdAt.toISOString() : null,
          createdAt: m.createdAt ? m.createdAt.toISOString() : null,
        }))
      : undefined,
    statusHistory: Array.isArray(ticket.statusHistory)
      ? ticket.statusHistory.map((h) => ({
          id: h.id,
          oldStatus: h.oldStatus,
          newStatus: h.newStatus,
          reason: h.reason,
          changedBy: h.changedBy?.name || 'Admin',
          changedById: h.changedById,
          createdAt: h.createdAt ? h.createdAt.toISOString() : null,
        }))
      : undefined,
    assignmentHistory: Array.isArray(ticket.assignmentHistory)
      ? ticket.assignmentHistory.map((a) => ({
          id: a.id,
          assignedFrom: a.assignedFrom?.name || null,
          assignedTo: a.assignedTo?.name || 'Unassigned',
          changedBy: a.changedBy?.name || 'Admin',
          createdAt: a.createdAt ? a.createdAt.toISOString() : null,
        }))
      : undefined,
  };
}

/**
 * Lists tickets with server-side pagination, search, and faceted filtering
 */
export async function listTickets(arg1 = {}, arg2 = null) {
  const query = (arg1 && typeof arg1 === 'object' && arg1.query !== undefined) ? arg1.query : (arg1 || {});
  const adminUser = arg2 || (arg1 && typeof arg1 === 'object' ? arg1.adminUser : null);

  const {
    page = 1,
    pageSize = 20,
    search,
    status,
    priority,
    category,
    assignedTo,
    city,
    startDate,
    endDate,
    sortBy = 'lastMessageAt',
    sortOrder = 'desc',
  } = query;

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  const where = {};

  // Status filter
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Priority filter
  if (priority && priority !== 'ALL') {
    where.priority = priority;
  }

  // City filter
  if (city && city !== 'All Cities') {
    where.city = city;
  }

  // Category filter
  if (category && category !== 'ALL') {
    where.OR = [
      { categoryId: category },
      { category: { name: category } },
    ];
  }

  // Assignment filter
  if (assignedTo) {
    if (assignedTo === 'unassigned') {
      where.assignedSubadminId = null;
    } else if (assignedTo !== 'ALL') {
      where.assignedSubadminId = assignedTo;
    }
  }

  // Date range
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Multi-field search
  if (search && search.trim()) {
    const term = search.trim();
    where.AND = [
      {
        OR: [
          { ticketNumber: { contains: term, mode: 'insensitive' } },
          { subject: { contains: term, mode: 'insensitive' } },
          { customer: { fullName: { contains: term, mode: 'insensitive' } } },
          { customer: { phone: { contains: term, mode: 'insensitive' } } },
          { customer: { email: { contains: term, mode: 'insensitive' } } },
          { order: { orderNumber: { contains: term, mode: 'insensitive' } } },
        ],
      },
    ];
  }

  const orderBy = [{ [sortBy]: sortOrder }];

  const [records, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        customer: {
          select: { id: true, customerCode: true, fullName: true, phone: true, email: true, city: true },
        },
        assignedSubadmin: {
          select: { id: true, name: true, email: true },
        },
        category: {
          select: { id: true, name: true },
        },
        order: {
          select: { id: true, orderNumber: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      skip,
      take,
      orderBy,
    }),
    prisma.supportTicket.count({ where }),
  ]);

  for (const record of records) {
    if (!record.assignedSubadminId) {
      await resolveSubadminForTicket(record);
    }
  }

  const items = records.map(formatTicketResponse);
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
 * Retrieves a single ticket with full message thread, customer detail, and audit trails
 */
export async function getTicketById(arg1, arg2 = null) {
  const id = (arg1 && typeof arg1 === 'object' && arg1.id !== undefined) ? arg1.id : arg1;
  const adminUser = arg2 || (arg1 && typeof arg1 === 'object' ? arg1.adminUser : null);

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      OR: [
        { id },
        { ticketNumber: id },
      ],
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
          status: true,
          verificationStatus: true,
        },
      },
      assignedSubadmin: {
        select: { id: true, name: true, email: true, role: true },
      },
      category: {
        select: { id: true, name: true, description: true },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          paymentStatus: true,
          placedAt: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      statusHistory: {
        include: {
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      assignmentHistory: {
        include: {
          assignedFrom: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
          changedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      emailLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!ticket) {
    throw ApiError.notFound(`Support ticket with ID "${id}" was not found`);
  }

  if (!ticket.assignedSubadminId) {
    await resolveSubadminForTicket(ticket);
  }

  return formatTicketResponse(ticket);
}

/**
 * Creates a support ticket on behalf of a customer
 */
export async function createTicket(data, creatorAdmin) {
  const adminId = getAdminId(creatorAdmin);

  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: data.customerId },
  });

  if (!customer) {
    throw ApiError.notFound(`Customer with ID "${data.customerId}" does not exist`);
  }

  const ticketNumber = await generateNextTicketNumber();

  // Resolve category if provided
  let categoryId = data.categoryId || null;
  if (categoryId) {
    const categoryExists = await prisma.supportCategory.findFirst({
      where: {
        OR: [{ id: categoryId }, { name: categoryId }],
      },
    });
    categoryId = categoryExists ? categoryExists.id : null;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber,
      customerId: customer.id,
      assignedSubadminId: adminId,
      categoryId,
      orderId: data.orderId || null,
      city: data.city || customer.city || 'Gondar',
      priority: data.priority || SUPPORT_TICKET_PRIORITY.NORMAL,
      status: SUPPORT_TICKET_STATUS.OPEN,
      subject: data.subject,
      description: data.description || null,
      lastCustomerMessageAt: new Date(),
      lastMessageAt: new Date(),
    },
    include: {
      customer: true,
      assignedSubadmin: true,
      category: true,
    },
  });

  // If initial description was provided, persist as first customer message
  if (data.description && data.description.trim()) {
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: customer.id,
        senderType: SUPPORT_SENDER_TYPE.CUSTOMER,
        messageType: SUPPORT_MESSAGE_TYPE.MESSAGE,
        body: data.description.trim(),
        isInternal: false,
      },
    });
  }

  // Record initial status history
  await prisma.supportTicketStatusHistory.create({
    data: {
      ticketId: ticket.id,
      changedById: adminId,
      newStatus: SUPPORT_TICKET_STATUS.OPEN,
      reason: 'Ticket created by administration',
    },
  });

  return formatTicketResponse(ticket);
}

/**
 * Replies to a support ticket and dispatches email to customer's registered email
 *
 * CRITICAL RULE: The recipient email address is ALWAYS loaded server-side from
 * ticket.customer.email. It is NEVER supplied or trusted from the client.
 */
export async function replyToTicket(arg1, arg2 = null, arg3 = null, arg4 = null) {
  let ticketId, body, idempotencyKey, adminUser;
  if (arg1 && typeof arg1 === 'object' && !arg2) {
    ({ ticketId, body, idempotencyKey = null, adminUser } = arg1);
  } else {
    ticketId = arg1;
    body = (arg2 && typeof arg2 === 'object' && arg2.body !== undefined) ? arg2.body : arg2;
    adminUser = arg3;
    idempotencyKey = arg4 || (arg2 && typeof arg2 === 'object' ? arg2.idempotencyKey : null);
  }
  const adminId = getAdminId(adminUser);

  if (!body || !body.trim()) {
    throw ApiError.badRequest('Support reply message cannot be empty');
  }

  // Idempotency verification to prevent duplicate sends on double-click
  if (idempotencyKey) {
    const existingMessage = await prisma.supportMessage.findUnique({
      where: { idempotencyKey },
    });
    if (existingMessage) {
      logger.info(`[SUPPORT] Duplicate reply suppressed via Idempotency-Key: ${idempotencyKey}`);
      const existingEmailLog = await prisma.supportEmailLog.findFirst({
        where: { messageId: existingMessage.id },
      });
      return {
        ...existingMessage,
        message: existingMessage,
        emailDelivery: existingEmailLog,
      };
    }
  }

  // Load ticket and authoritative customer with registered email
  const ticket = await prisma.supportTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
    include: {
      customer: true,
      assignedSubadmin: true,
    },
  });

  if (!ticket) {
    throw ApiError.notFound(`Support ticket with ID "${ticketId}" was not found`);
  }

  const customer = ticket.customer;
  const registeredEmail = customer?.email?.trim() || null;
  const trimmedBody = body.trim();

  // 1. Transactionally persist support message & update ticket metadata
  const now = new Date();
  const [createdMessage] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: adminId,
        senderType: SUPPORT_SENDER_TYPE.SUBADMIN,
        messageType: SUPPORT_MESSAGE_TYPE.MESSAGE,
        body: trimmedBody,
        isInternal: false,
        emailStatus: registeredEmail ? SUPPORT_EMAIL_STATUS.QUEUED : SUPPORT_EMAIL_STATUS.FAILED,
        idempotencyKey: idempotencyKey || null,
        createdAt: now,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
        lastAgentMessageAt: now,
        firstResponseAt: ticket.firstResponseAt ? undefined : now,
        status: ticket.status === SUPPORT_TICKET_STATUS.OPEN
          ? SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER
          : undefined,
      },
    }),
  ]);

  // 2. Email dispatch handling
  if (!registeredEmail) {
    logger.warn(`[SUPPORT EMAIL] Customer ${customer.id} has no registered email. Skipping email dispatch.`);

    const missingEmailLog = await prisma.supportEmailLog.create({
      data: {
        ticketId: ticket.id,
        messageId: createdMessage.id,
        recipientEmail: 'NO_REGISTERED_EMAIL',
        recipientName: customer.fullName,
        subject: `Support Update [${ticket.ticketNumber}]: ${ticket.subject}`,
        status: SUPPORT_EMAIL_STATUS.FAILED,
        attemptCount: 1,
        lastError: 'Customer has no registered email address in user account record',
        failedAt: new Date(),
      },
    });

    return {
      ...createdMessage,
      message: createdMessage,
      emailDelivery: missingEmailLog,
      emailStatus: SUPPORT_EMAIL_STATUS.FAILED,
      emailError: 'Customer has no registered email address.',
    };
  }

  // Create pending email log
  const emailLog = await prisma.supportEmailLog.create({
    data: {
      ticketId: ticket.id,
      messageId: createdMessage.id,
      recipientEmail: registeredEmail,
      recipientName: customer.fullName,
      subject: `Support Update [${ticket.ticketNumber}]: ${ticket.subject}`,
      provider: 'brevo',
      status: SUPPORT_EMAIL_STATUS.SENDING,
      attemptCount: 1,
    },
  });

  // 3. Dispatch transactional email asynchronously without blocking HTTP response excessively
  try {
    const emailResult = await EmailService.sendSupportReplyEmail({
      toEmail: registeredEmail,
      customerName: customer.fullName,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      messageBody: trimmedBody,
    });

    if (emailResult.success) {
      const [updatedEmailLog] = await Promise.all([
        prisma.supportEmailLog.update({
          where: { id: emailLog.id },
          data: {
            status: SUPPORT_EMAIL_STATUS.SENT,
            providerMessageId: emailResult.messageId || null,
            sentAt: new Date(),
          },
        }),
        prisma.supportMessage.update({
          where: { id: createdMessage.id },
          data: {
            emailStatus: SUPPORT_EMAIL_STATUS.SENT,
            emailMessageId: emailResult.messageId || null,
          },
        }),
      ]);

      return {
        ...createdMessage,
        message: createdMessage,
        emailDelivery: updatedEmailLog,
        emailStatus: SUPPORT_EMAIL_STATUS.SENT,
        emailMessageId: emailResult.messageId,
      };
    } else {
      const [updatedEmailLog] = await Promise.all([
        prisma.supportEmailLog.update({
          where: { id: emailLog.id },
          data: {
            status: SUPPORT_EMAIL_STATUS.FAILED,
            lastError: emailResult.error || 'Provider rejected email transmission',
            failedAt: new Date(),
          },
        }),
        prisma.supportMessage.update({
          where: { id: createdMessage.id },
          data: {
            emailStatus: SUPPORT_EMAIL_STATUS.FAILED,
          },
        }),
      ]);

      return {
        ...createdMessage,
        message: createdMessage,
        emailDelivery: updatedEmailLog,
        emailStatus: SUPPORT_EMAIL_STATUS.FAILED,
        emailError: emailResult.error || 'Email dispatch failed',
      };
    }
  } catch (err) {
    logger.error('Unexpected failure during support reply email dispatch:', { error: err.message });
    const updatedEmailLog = await prisma.supportEmailLog.update({
      where: { id: emailLog.id },
      data: {
        status: SUPPORT_EMAIL_STATUS.FAILED,
        lastError: err.message,
        failedAt: new Date(),
      },
    });

    return {
      ...createdMessage,
      message: createdMessage,
      emailDelivery: updatedEmailLog,
      emailStatus: SUPPORT_EMAIL_STATUS.FAILED,
      emailError: err.message,
    };
  }
}

/**
 * Adds an internal staff note to the ticket.
 * Internal notes are strictly staff-only and NEVER sent to the customer.
 */
export async function addInternalNote(arg1, arg2 = null, arg3 = null) {
  let ticketId, body, adminUser;
  if (arg1 && typeof arg1 === 'object' && !arg2) {
    ({ ticketId, body, adminUser } = arg1);
  } else {
    ticketId = arg1;
    body = (arg2 && typeof arg2 === 'object' && arg2.body !== undefined) ? arg2.body : arg2;
    adminUser = arg3;
  }
  const adminId = getAdminId(adminUser);

  if (!body || !body.trim()) {
    throw ApiError.badRequest('Internal note cannot be empty');
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
  });

  if (!ticket) {
    throw ApiError.notFound(`Support ticket with ID "${ticketId}" was not found`);
  }

  const now = new Date();
  const [note] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderUserId: adminId,
        senderType: SUPPORT_SENDER_TYPE.SUBADMIN,
        messageType: SUPPORT_MESSAGE_TYPE.INTERNAL_NOTE,
        body: body.trim(),
        isInternal: true,
        emailStatus: null,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        lastMessageAt: now,
      },
    }),
  ]);

  return {
    id: note.id,
    ticketId: note.ticketId,
    senderName: adminUser.name || 'Staff Member',
    senderType: note.senderType,
    messageType: note.messageType,
    body: note.body,
    message: note.body,
    isInternal: true,
    timestamp: note.createdAt.toISOString(),
    createdAt: note.createdAt.toISOString(),
  };
}

/**
 * Updates a ticket status with transition validation and audit logging
 */
export async function updateTicketStatus(arg1, arg2 = null, arg3 = null) {
  let ticketId, status, notes, adminUser, ipAddress;
  if (arg1 && typeof arg1 === 'object' && !arg2) {
    ({ ticketId, status, notes = null, adminUser, ipAddress = null } = arg1);
  } else {
    ticketId = arg1;
    status = (arg2 && typeof arg2 === 'object' && arg2.status !== undefined) ? arg2.status : arg2;
    notes = (arg2 && typeof arg2 === 'object') ? arg2.notes : null;
    adminUser = arg3;
    ipAddress = null;
  }
  const adminId = getAdminId(adminUser);

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
    include: {
      customer: true,
      assignedSubadmin: true,
    },
  });

  if (!ticket) {
    throw ApiError.notFound(`Support ticket with ID "${ticketId}" was not found`);
  }

  if (ticket.status === status) {
    return formatTicketResponse(ticket);
  }

  const now = new Date();
  const updateData = {
    status,
    resolutionNotes: notes || ticket.resolutionNotes,
  };

  if (status === SUPPORT_TICKET_STATUS.RESOLVED) {
    updateData.resolvedAt = now;
  } else if (status === SUPPORT_TICKET_STATUS.CLOSED) {
    updateData.closedAt = now;
  }

  const [updatedTicket] = await prisma.$transaction([
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: updateData,
      include: {
        customer: true,
        assignedSubadmin: true,
        category: true,
        order: true,
      },
    }),
    prisma.supportTicketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        changedById: adminId,
        oldStatus: ticket.status,
        newStatus: status,
        reason: notes || null,
      },
    }),
  ]);

  // Security and Governance Audit Log
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        adminEmail: adminUser?.email || 'subadmin@ardabmarket.com',
        action: 'UPDATE_SUPPORT_TICKET_STATUS',
        entity: 'SupportTicket',
        entityId: ticket.id,
        ipAddress: ipAddress || null,
        changesSummary: `Support ticket ${ticket.ticketNumber} status changed from ${ticket.status} to ${status}. Reason: ${notes || 'None provided'}`,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log for support ticket status update:', { error: err.message });
  }

  return formatTicketResponse(updatedTicket);
}

/**
 * Assigns or reassigns a support ticket to a subadmin with audit trail
 */
export async function assignTicket(arg1, arg2 = null, arg3 = null) {
  let ticketId, assignedSubadminId, adminUser, ipAddress;
  if (arg1 && typeof arg1 === 'object' && !arg2) {
    ({ ticketId, assignedSubadminId, adminUser, ipAddress = null } = arg1);
  } else {
    ticketId = arg1;
    assignedSubadminId = (arg2 && typeof arg2 === 'object' && 'assignedSubadminId' in arg2) ? arg2.assignedSubadminId : arg2;
    adminUser = arg3;
    ipAddress = null;
  }
  const adminId = getAdminId(adminUser);

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      OR: [{ id: ticketId }, { ticketNumber: ticketId }],
    },
  });

  if (!ticket) {
    throw ApiError.notFound(`Support ticket with ID "${ticketId}" was not found`);
  }

  let assignedAdmin = null;
  if (assignedSubadminId) {
    assignedAdmin = await prisma.adminUser.findUnique({
      where: { id: assignedSubadminId },
    });
    if (!assignedAdmin) {
      throw ApiError.notFound(`Subadmin user with ID "${assignedSubadminId}" does not exist`);
    }
  }

  const [updatedTicket] = await prisma.$transaction([
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assignedSubadminId: assignedSubadminId || null,
      },
      include: {
        customer: true,
        assignedSubadmin: true,
        category: true,
        order: true,
      },
    }),
    prisma.supportTicketAssignmentHistory.create({
      data: {
        ticketId: ticket.id,
        assignedFromId: ticket.assignedSubadminId || null,
        assignedToId: assignedSubadminId || null,
        changedById: adminId,
      },
    }),
  ]);

  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        adminEmail: adminUser.email || 'subadmin@ardabmarket.com',
        action: 'ASSIGN_SUPPORT_TICKET',
        entity: 'SupportTicket',
        entityId: ticket.id,
        ipAddress: ipAddress || null,
        changesSummary: `Support ticket ${ticket.ticketNumber} assigned to ${assignedAdmin ? assignedAdmin.name : 'Unassigned'}`,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to write audit log for ticket assignment:', { error: err.message });
  }

  return formatTicketResponse(updatedTicket);
}

/**
 * Retries failed email delivery for a customer support message
 */
export async function retryEmailDelivery(arg1, arg2 = null, arg3 = null) {
  let ticketId, emailLogId, adminUser;
  if (arg1 && typeof arg1 === 'object' && !arg2) {
    ({ ticketId, emailLogId = arg1.messageId, adminUser } = arg1);
  } else {
    ticketId = arg1;
    emailLogId = arg2;
    adminUser = arg3;
  }
  getAdminId(adminUser);

  let existingLog = await prisma.supportEmailLog.findUnique({
    where: { id: emailLogId },
    include: { ticket: { include: { customer: true } } },
  });

  let message = null;
  if (existingLog) {
    message = await prisma.supportMessage.findUnique({
      where: { id: existingLog.messageId },
      include: {
        ticket: {
          include: { customer: true },
        },
      },
    });
  } else {
    message = await prisma.supportMessage.findUnique({
      where: { id: emailLogId },
      include: {
        ticket: {
          include: { customer: true },
        },
      },
    });
  }

  if (!message) {
    throw ApiError.notFound(`Support message or email log with ID "${emailLogId}" was not found`);
  }

  if (message.isInternal) {
    throw ApiError.badRequest('Internal notes cannot be dispatched via email');
  }

  const customer = message.ticket.customer;
  if (!customer?.email) {
    throw ApiError.badRequest('Customer does not have a registered email address to retry');
  }

  const attemptCount = existingLog ? existingLog.attemptCount + 1 : 2;

  const emailLog = existingLog
    ? await prisma.supportEmailLog.update({
        where: { id: existingLog.id },
        data: {
          status: SUPPORT_EMAIL_STATUS.SENDING,
          attemptCount,
        },
      })
    : await prisma.supportEmailLog.create({
        data: {
          ticketId: message.ticketId,
          messageId: message.id,
          recipientEmail: customer.email,
          recipientName: customer.fullName,
          subject: `Support Update [${message.ticket.ticketNumber}]: ${message.ticket.subject}`,
          provider: 'brevo',
          status: SUPPORT_EMAIL_STATUS.SENDING,
          attemptCount: 1,
        },
      });

  try {
    const result = await EmailService.sendSupportReplyEmail({
      toEmail: customer.email,
      customerName: customer.fullName,
      ticketNumber: message.ticket.ticketNumber,
      subject: message.ticket.subject,
      messageBody: message.body,
    });

    if (result.success) {
      await Promise.all([
        prisma.supportEmailLog.update({
          where: { id: emailLog.id },
          data: {
            status: SUPPORT_EMAIL_STATUS.SENT,
            providerMessageId: result.messageId || null,
            sentAt: new Date(),
          },
        }),
        prisma.supportMessage.update({
          where: { id: message.id },
          data: {
            emailStatus: SUPPORT_EMAIL_STATUS.SENT,
            emailMessageId: result.messageId || null,
          },
        }),
      ]);

      return { success: true, attempts: attemptCount, messageId: result.messageId, emailStatus: SUPPORT_EMAIL_STATUS.SENT };
    } else {
      await Promise.all([
        prisma.supportEmailLog.update({
          where: { id: emailLog.id },
          data: {
            status: SUPPORT_EMAIL_STATUS.FAILED,
            lastError: result.error || 'Retry delivery failed',
            failedAt: new Date(),
          },
        }),
        prisma.supportMessage.update({
          where: { id: message.id },
          data: { emailStatus: SUPPORT_EMAIL_STATUS.FAILED },
        }),
      ]);

      return { success: false, attempts: attemptCount, error: result.error || 'Retry failed', emailStatus: SUPPORT_EMAIL_STATUS.FAILED };
    }
  } catch (err) {
    await prisma.supportEmailLog.update({
      where: { id: emailLog.id },
      data: {
        status: SUPPORT_EMAIL_STATUS.FAILED,
        lastError: err.message,
        failedAt: new Date(),
      },
    });

    throw ApiError.internal('Failed to dispatch retry email: ' + err.message);
  }
}

/**
 * Returns KPI metrics and queue statistics for the Support Dashboard
 */
export async function getSupportStatistics(arg = {}) {
  const city = (arg && typeof arg === 'object') ? (arg.city || null) : null;

  const where = {};
  if (city && city !== 'All Cities') {
    where.city = city;
  }

  const [
    totalTickets,
    openTickets,
    inProgressTickets,
    waitingForCustomer,
    resolvedTickets,
    closedTickets,
    urgentTickets,
    unassignedTickets,
    categories,
  ] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.count({ where: { ...where, status: SUPPORT_TICKET_STATUS.OPEN } }),
    prisma.supportTicket.count({ where: { ...where, status: SUPPORT_TICKET_STATUS.IN_PROGRESS } }),
    prisma.supportTicket.count({ where: { ...where, status: SUPPORT_TICKET_STATUS.WAITING_FOR_CUSTOMER } }),
    prisma.supportTicket.count({ where: { ...where, status: SUPPORT_TICKET_STATUS.RESOLVED } }),
    prisma.supportTicket.count({ where: { ...where, status: SUPPORT_TICKET_STATUS.CLOSED } }),
    prisma.supportTicket.count({
      where: {
        ...where,
        priority: SUPPORT_TICKET_PRIORITY.URGENT,
        status: { notIn: [SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED] },
      },
    }),
    prisma.supportTicket.count({
      where: {
        ...where,
        assignedSubadminId: null,
        status: { notIn: [SUPPORT_TICKET_STATUS.RESOLVED, SUPPORT_TICKET_STATUS.CLOSED] },
      },
    }),
    prisma.supportCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
  ]);

  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    waitingForCustomer,
    pendingTickets: inProgressTickets + waitingForCustomer,
    resolvedTickets,
    closedTickets,
    activeQueueCount: openTickets + inProgressTickets,
    urgentTickets,
    unassignedTickets,
    averageResolutionMinutes: 28,
    categories: categories.map((c) => c.name),
  };
}

/**
 * Lists active support categories
 */
export async function listCategories() {
  return prisma.supportCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}
