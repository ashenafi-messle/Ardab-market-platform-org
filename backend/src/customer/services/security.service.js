// ==============================================================================
// Ardab Market - Customer Security & Privacy Service
// ==============================================================================
// Manages password changes, session revocation, privacy statements, and account lifecycle.
// ==============================================================================

import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { EmailService } from '../../shared/services/email/email.service.js';
import { createNotification } from '../../admin/services/notification.service.js';
import { logPlatformSecurityEvent } from '../../shared/services/platformSecurity.service.js';
import { generateNextTicketNumber } from '../../admin/services/supportCode.service.js';
import { resolveSubadminForTicket } from '../../admin/services/support.service.js';
import { createCustomerSupportNotification } from './notification.service.js';

/**
 * Changes authenticated customer password
 */
export async function changeCustomerPassword(customerId, currentPassword, newPassword, ipAddress = null) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    throw ApiError.badRequest('New password must be at least 6 characters long', 'INVALID_NEW_PASSWORD');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      passwordHash: true,
      status: true,
    },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  if (customer.status !== 'ACTIVE') {
    throw ApiError.forbidden('Cannot modify credentials of an inactive or suspended account', 'ACCOUNT_INACTIVE');
  }

  // Verify current password if customer has an existing password set
  if (customer.passwordHash) {
    if (!currentPassword) {
      throw ApiError.badRequest('Current password is required', 'CURRENT_PASSWORD_REQUIRED');
    }
    const isMatch = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect', 'INCORRECT_CURRENT_PASSWORD');
    }
  }

  // Prevent reusing the identical password
  if (customer.passwordHash) {
    const isSame = await bcrypt.compare(newPassword, customer.passwordHash);
    if (isSame) {
      throw ApiError.badRequest('New password cannot be identical to current password', 'SAME_PASSWORD');
    }
  }

  // Hash new password securely
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password in database
  await prisma.customer.update({
    where: { id: customerId },
    data: { passwordHash: newPasswordHash },
  });

  // Record audit activity
  await prisma.customerActivity.create({
    data: {
      customerId,
      action: 'PASSWORD_CHANGED',
      description: 'Customer changed account password via mobile security settings',
      actor: 'Customer',
    },
  }).catch(() => {});

  // Platform Security Telemetry
  await logPlatformSecurityEvent({
    eventType: 'CUSTOMER_PASSWORD_CHANGED',
    severity: 'INFO',
    source: 'CUSTOMER_MOBILE',
    actorType: 'CUSTOMER',
    actorId: customer.id,
    actorEmail: customer.email,
    targetType: 'Customer',
    targetId: customer.id,
    ipAddress,
  }).catch(() => {});

  // Send security email alert if email is available
  if (customer.email && customer.email.includes('@')) {
    EmailService.sendPasswordChangedNotification({
      toEmail: customer.email,
      name: customer.fullName || 'Customer',
    }).catch(() => {});
  }

  // Create in-app security notification
  createNotification({
    type: 'SECURITY',
    category: 'SECURITY',
    title: 'Password Updated',
    message: 'Your account password was successfully changed. If this was not you, contact support immediately.',
    severity: 'WARNING',
    priority: 'HIGH',
    entityType: 'CUSTOMER',
    entityId: customerId,
    targetCustomerIds: [customerId],
  }).catch(() => {});

  return { success: true, message: 'Password changed successfully' };
}

/**
 * Lists active sessions for the customer
 */
export async function listCustomerSessions(customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const sessions = await prisma.customerMobileSession.findMany({
    where: {
      customerId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceInfo: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
    },
  });

  return sessions.map((s, idx) => ({
    id: s.id,
    deviceInfo: s.deviceInfo || 'Mobile Device (Expo/React Native)',
    createdAt: s.createdAt.toISOString(),
    lastActive: s.updatedAt.toISOString(),
    isCurrent: idx === 0, // Most recent session is active device
  }));
}

/**
 * Revokes a specific session
 */
export async function revokeCustomerSession(customerId, sessionId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const session = await prisma.customerMobileSession.findFirst({
    where: {
      id: sessionId,
      customerId,
    },
  });

  if (!session) {
    throw ApiError.notFound('Session not found or already expired', 'SESSION_NOT_FOUND');
  }

  await prisma.customerMobileSession.update({
    where: { id: sessionId },
    data: { status: 'REVOKED' },
  });

  return { success: true, message: 'Session revoked successfully' };
}

/**
 * Revokes all other sessions except current
 */
export async function revokeOtherCustomerSessions(customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  // Keep the most recent session, revoke all others
  const activeSessions = await prisma.customerMobileSession.findMany({
    where: {
      customerId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeSessions.length > 1) {
    const [current, ...others] = activeSessions;
    const idsToRevoke = others.map((s) => s.id);

    await prisma.customerMobileSession.updateMany({
      where: {
        id: { in: idsToRevoke },
      },
      data: { status: 'REVOKED' },
    });
  }

  return { success: true, message: 'Other sessions have been signed out' };
}

/**
 * Retrieves the customer's current account deletion request status.
 */
export async function getCustomerAccountDeletionStatus(customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const activeTicket = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      subject: { contains: 'Account Deletion' },
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      subject: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (activeTicket) {
    let clientStatus = 'PENDING';
    let statusLabel = 'Pending Review';
    if (activeTicket.status === 'IN_PROGRESS') {
      clientStatus = 'UNDER_REVIEW';
      statusLabel = 'Under Review';
    } else if (activeTicket.status === 'WAITING_FOR_CUSTOMER') {
      clientStatus = 'WAITING_FOR_CUSTOMER';
      statusLabel = 'Action Required';
    }

    return {
      hasPendingRequest: true,
      status: clientStatus,
      statusLabel,
      ticketNumber: activeTicket.ticketNumber,
      requestedAt: activeTicket.createdAt.toISOString(),
      message: 'Your account deletion request has been sent to Ardab Market Customer Support.',
    };
  }

  return {
    hasPendingRequest: false,
    status: null,
    statusLabel: null,
    ticketNumber: null,
    requestedAt: null,
    message: null,
  };
}

/**
 * Submits an official account deletion request.
 * Creates an ACCOUNT_DELETION support ticket for Sub Admin review.
 * Does NOT physically delete the database record to preserve historical orders and tax records.
 */
export async function requestCustomerAccountDeletion(customerId, reason = '') {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true, customerCode: true, email: true, phone: true, city: true },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  // 1. Check for duplicate pending requests (Requirement 14)
  const existingTicket = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      subject: { contains: 'Account Deletion' },
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingTicket) {
    const statusLabel = existingTicket.status === 'IN_PROGRESS' ? 'Under Review' : 'Pending Review';
    return {
      success: true,
      duplicate: true,
      message: 'Your account deletion request is already under review.',
      status: existingTicket.status === 'IN_PROGRESS' ? 'UNDER_REVIEW' : 'PENDING',
      statusLabel,
      ticketNumber: existingTicket.ticketNumber,
      requestedAt: existingTicket.createdAt.toISOString(),
    };
  }

  // 2. Resolve Support Category
  let category = await prisma.supportCategory.findFirst({
    where: { name: 'ACCOUNT_DELETION' },
  });
  if (!category) {
    category = await prisma.supportCategory.findFirst({
      where: { name: 'ACCOUNT' },
    });
  }
  if (!category) {
    category = await prisma.supportCategory.findFirst({
      where: { isActive: true },
    });
  }

  // 3. Generate sequential ticket number
  const ticketNumber = await generateNextTicketNumber();
  const ticketSubject = 'Account Deletion Request';
  const sanitizedReason = reason?.trim() || 'Customer requested account deletion from mobile security settings.';

  // 4. Create SupportTicket & initial SupportMessage in transaction
  const ticket = await prisma.$transaction(async (tx) => {
    const newTicket = await tx.supportTicket.create({
      data: {
        ticketNumber,
        customerId: customer.id,
        categoryId: category?.id || null,
        city: customer.city || 'Gondar',
        status: 'OPEN',
        priority: 'HIGH',
        subject: ticketSubject,
        description: sanitizedReason,
        lastMessageAt: new Date(),
        lastCustomerMessageAt: new Date(),
      },
    });

    await tx.supportMessage.create({
      data: {
        ticketId: newTicket.id,
        senderUserId: customer.id,
        senderType: 'CUSTOMER',
        messageType: 'MESSAGE',
        body: `Customer submitted account deletion request.\nReason: ${sanitizedReason}\nPhone: ${customer.phone}\nEmail: ${customer.email || 'None'}`,
      },
    });

    return newTicket;
  });

  // 5. Auto-resolve assigned Sub Admin
  resolveSubadminForTicket(ticket).catch(() => {});

  // 6. Create internal customer activity audit log (Requirement 25)
  await prisma.customerActivity.create({
    data: {
      customerId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      description: `Customer submitted account deletion request (Ticket #${ticket.ticketNumber}). Reason: ${sanitizedReason}`,
      actor: 'Customer',
    },
  }).catch(() => {});

  // 7. Create customer in-app notification & push (Requirement 19)
  await createCustomerSupportNotification({
    customerId: customer.id,
    ticketId: ticket.id,
    type: 'ACCOUNT_DELETION_REQUEST',
    title: 'Account deletion request received',
    message: 'Your account deletion request has been received and sent to Ardab Market Customer Support for review.',
    deepLink: '/profile/security',
  }).catch(() => {});

  // 8. Notify Sub Admin operations team (Requirement 15)
  await createNotification({
    type: 'NOTIFICATION',
    category: 'CUSTOMER',
    title: `Account Deletion Request: ${customer.customerCode}`,
    message: `Customer ${customer.fullName} (${customer.email || customer.phone}) requested account closure. Ticket #${ticket.ticketNumber}`,
    severity: 'WARNING',
    priority: 'HIGH',
    entityType: 'SUPPORT_TICKET',
    entityId: ticket.id,
    actionUrl: `/subadmin/support?ticket=${ticket.ticketNumber}`,
    targetRole: 'SUB_ADMIN',
  }).catch(() => {});

  return {
    success: true,
    message: 'Your account deletion request has been sent to Ardab Market Customer Support.',
    status: 'PENDING',
    statusLabel: 'Pending Review',
    ticketNumber: ticket.ticketNumber,
    requestedAt: ticket.createdAt.toISOString(),
  };
}
