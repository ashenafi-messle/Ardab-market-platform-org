// ==============================================================================
// Ardab Market - Payment Method Configuration Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

async function recordPaymentMethodAuditLog({ adminUser, action, methodId, ipAddress, changesSummary }) {
  try {
    let validAdminId = null;
    if (adminUser?.id) {
      const exists = await prisma.adminUser.findUnique({ where: { id: adminUser.id }, select: { id: true } });
      if (exists) validAdminId = exists.id;
    }
    await prisma.auditLog.create({
      data: {
        adminId: validAdminId,
        adminEmail: adminUser?.email || 'system@ardabmarket.com',
        action,
        entity: 'PaymentMethod',
        entityId: methodId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log for payment method operation', { error: err.message, action });
  }
}

/**
 * List all configured payment methods.
 * For general or supplier registration use (activeOnly=true), internal account numbers are omitted.
 */
export async function listPaymentMethods({ activeOnly = false } = {}) {
  const where = {};
  if (activeOnly) {
    where.isActive = true;
  }

  // Security: For public or active listing during supplier registration,
  // omit sensitive internal settlement account numbers.
  if (activeOnly) {
    return prisma.paymentMethod.findMany({
      where,
      select: {
        id: true,
        name: true,
        provider: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  return prisma.paymentMethod.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get payment method details by ID
 */
export async function getPaymentMethodById(id) {
  const method = await prisma.paymentMethod.findUnique({
    where: { id },
  });

  if (!method) {
    throw ApiError.notFound(`Payment method with ID '${id}' was not found.`, 'PAYMENT_METHOD_NOT_FOUND');
  }

  return method;
}

/**
 * Create a new administrative settlement payment method
 */
export async function createPaymentMethod(data, adminUser = null, ipAddress = null) {
  const newMethod = await prisma.paymentMethod.create({
    data: {
      name: data.name,
      provider: data.provider || null,
      accountName: data.accountName || null,
      accountNumber: data.accountNumber || null,
      description: data.description || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  logger.info('Payment method created', { id: newMethod.id, name: newMethod.name });

  await recordPaymentMethodAuditLog({
    adminUser,
    action: 'PAYMENT_METHOD_CREATE',
    methodId: newMethod.id,
    ipAddress,
    changesSummary: `Payment method created: "${newMethod.name}" (${newMethod.provider || 'Standard'})`,
  });

  return newMethod;
}

/**
 * Update an existing payment method
 */
export async function updatePaymentMethod(id, data, adminUser = null, ipAddress = null) {
  await getPaymentMethodById(id);

  const updatedMethod = await prisma.paymentMethod.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.accountName !== undefined && { accountName: data.accountName }),
      ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  logger.info('Payment method updated', { id: updatedMethod.id, name: updatedMethod.name });

  await recordPaymentMethodAuditLog({
    adminUser,
    action: 'PAYMENT_METHOD_UPDATE',
    methodId: updatedMethod.id,
    ipAddress,
    changesSummary: `Payment method "${updatedMethod.name}" updated. Status: ${updatedMethod.isActive ? 'ACTIVE' : 'INACTIVE'}`,
  });

  return updatedMethod;
}

/**
 * Toggle or set payment method active status
 */
export async function togglePaymentMethodStatus(id, isActive, adminUser = null, ipAddress = null) {
  const current = await getPaymentMethodById(id);
  const nextStatus = isActive !== undefined ? isActive : !current.isActive;

  const updatedMethod = await prisma.paymentMethod.update({
    where: { id },
    data: { isActive: nextStatus },
  });

  logger.info('Payment method status toggled', { id: updatedMethod.id, isActive: nextStatus });

  await recordPaymentMethodAuditLog({
    adminUser,
    action: nextStatus ? 'PAYMENT_METHOD_ACTIVATE' : 'PAYMENT_METHOD_DEACTIVATE',
    methodId: updatedMethod.id,
    ipAddress,
    changesSummary: `Payment method "${updatedMethod.name}" was ${nextStatus ? 'activated' : 'deactivated'}`,
  });

  return updatedMethod;
}
