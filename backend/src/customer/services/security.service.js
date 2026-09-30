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
 * Submits an official account deletion request.
 * Does NOT physically delete the database record to preserve historical orders and tax records.
 */
export async function requestCustomerAccountDeletion(customerId, reason = '') {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, fullName: true, customerCode: true, email: true },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  // Create an internal security event / activity log
  await prisma.customerActivity.create({
    data: {
      customerId,
      action: 'ACCOUNT_DELETION_REQUESTED',
      description: `Customer submitted account deletion request. Reason: ${reason || 'User requested'}`,
      actor: 'Customer',
    },
  });

  // Notify Super Admin of deletion request
  await createNotification({
    type: 'NOTIFICATION',
    category: 'CUSTOMER',
    title: `Account Deletion Request: ${customer.customerCode}`,
    message: `Customer ${customer.fullName} (${customer.email || 'Phone account'}) requested account closure.`,
    severity: 'WARNING',
    priority: 'HIGH',
    entityType: 'CUSTOMER',
    entityId: customer.id,
    targetRole: 'SUPER_ADMIN',
  }).catch(() => {});

  return {
    success: true,
    message: 'Your account deletion request has been submitted. Our compliance team will review and process your request within 7 business days.',
  };
}
