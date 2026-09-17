// ==============================================================================
// Ardab Market - Supplier Management Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { getPaginationParams } from '../../shared/utils/pagination.js';

async function recordSupplierAuditLog({ adminUser, action, supplierId, ipAddress, changesSummary }) {
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
        entity: 'Supplier',
        entityId: supplierId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log for supplier operation', { error: err.message, action });
  }
}

/**
 * List suppliers with pagination, search, and filtering
 */
export async function listSuppliers(query = {}) {
  const { page, pageSize, skip, take, formatMeta } = getPaginationParams(query);

  const where = {};

  // 1. Operational City Hub Filter
  if (query.city && query.city !== 'All Cities' && query.city.trim().length > 0) {
    where.city = {
      equals: query.city.trim(),
      mode: 'insensitive',
    };
  }

  // 2. Status Filter
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  // 3. Verification Status Filter
  if (query.verificationStatus && query.verificationStatus !== 'ALL') {
    where.verificationStatus = query.verificationStatus;
  }

  // 4. Search Filter (Company name, manager name, phone, email, TIN)
  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    where.OR = [
      { companyName: { contains: s, mode: 'insensitive' } },
      { name: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
      { email: { contains: s, mode: 'insensitive' } },
      { tinNumber: { contains: s } },
      {
        paymentMethods: {
          some: {
            OR: [
              { paymentMethod: { contains: s, mode: 'insensitive' } },
              { accountNumber: { contains: s } },
            ],
          },
        },
      },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      include: {
        paymentMethods: {
          select: {
            id: true,
            paymentMethod: true,
            accountNumber: true,
            isPrimary: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        paymentMethod: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return {
    items,
    pagination: formatMeta(total),
  };
}

/**
 * Get supplier details by ID
 */
export async function getSupplierById(id) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      paymentMethods: {
        select: {
          id: true,
          paymentMethod: true,
          accountNumber: true,
          isPrimary: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      paymentMethod: {
        select: {
          id: true,
          name: true,
          provider: true,
          description: true,
        },
      },
    },
  });

  if (!supplier) {
    throw ApiError.notFound(`Supplier with ID '${id}' was not found.`, 'SUPPLIER_NOT_FOUND');
  }

  return supplier;
}

/**
 * Register a new supplier with optional email and optional payment method
 */
export async function createSupplier(data, adminUser = null, ipAddress = null) {
  // 1. Email Normalization: If omitted or empty, strictly normalize to null
  let normalizedEmail = null;
  if (data.email && typeof data.email === 'string' && data.email.trim().length > 0) {
    normalizedEmail = data.email.trim().toLowerCase();
  }

  // 2. Payment Method Validation: If provided, must exist and be ACTIVE
  let validPaymentMethodId = null;
  if (data.paymentMethodId) {
    const pm = await prisma.paymentMethod.findUnique({
      where: { id: data.paymentMethodId },
    });

    if (!pm) {
      throw ApiError.badRequest(
        `Selected payment method '${data.paymentMethodId}' does not exist.`,
        'INVALID_PAYMENT_METHOD'
      );
    }

    if (!pm.isActive) {
      throw ApiError.badRequest(
        `Payment method '${pm.name}' is currently inactive and cannot be assigned.`,
        'INACTIVE_PAYMENT_METHOD'
      );
    }

    validPaymentMethodId = pm.id;
  }

  // 3. Prepare payment methods to create
  const paymentMethodsToCreate = Array.isArray(data.paymentMethods) && data.paymentMethods.length > 0
    ? data.paymentMethods.map((pm, index) => ({
        paymentMethod: pm.paymentMethod.trim(),
        accountNumber: pm.accountNumber.trim(),
        isPrimary: typeof pm.isPrimary === 'boolean' ? pm.isPrimary : (index === 0),
      }))
    : [];

  // 4. Persist supplier record
  const supplier = await prisma.supplier.create({
    data: {
      companyName: data.companyName,
      name: data.name,
      phone: data.phone,
      email: normalizedEmail,
      city: data.city,
      category: data.category || null,
      tinNumber: data.tinNumber || null,
      address: data.address,
      status: data.status || 'ACTIVE',
      verificationStatus: data.verificationStatus || 'PENDING',
      notes: data.notes || null,
      paymentMethodId: validPaymentMethodId,
      ...(paymentMethodsToCreate.length > 0
        ? {
            paymentMethods: {
              create: paymentMethodsToCreate,
            },
          }
        : {}),
    },
    include: {
      paymentMethods: {
        select: {
          id: true,
          paymentMethod: true,
          accountNumber: true,
          isPrimary: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      paymentMethod: {
        select: {
          id: true,
          name: true,
          provider: true,
        },
      },
    },
  });

  logger.info('Supplier registered successfully', {
    supplierId: supplier.id,
    companyName: supplier.companyName,
    city: supplier.city,
  });

  // 4. Audit Log
  await recordSupplierAuditLog({
    adminUser,
    action: 'SUPPLIER_CREATE',
    supplierId: supplier.id,
    ipAddress,
    changesSummary: `Registered supplier: "${supplier.companyName}" (${supplier.city}) by ${adminUser?.name || 'Admin'}`,
  });

  return supplier;
}

/**
 * Update an existing supplier
 */
export async function updateSupplier(id, data, adminUser = null, ipAddress = null) {
  // Ensure supplier exists
  const existing = await getSupplierById(id);

  const updatePayload = {};

  if (data.companyName !== undefined) updatePayload.companyName = data.companyName;
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.city !== undefined) updatePayload.city = data.city;
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.tinNumber !== undefined) updatePayload.tinNumber = data.tinNumber;
  if (data.address !== undefined) updatePayload.address = data.address;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.verificationStatus !== undefined) updatePayload.verificationStatus = data.verificationStatus;
  if (data.notes !== undefined) updatePayload.notes = data.notes;

  // Normalize email
  if (data.email !== undefined) {
    if (data.email && typeof data.email === 'string' && data.email.trim().length > 0) {
      updatePayload.email = data.email.trim().toLowerCase();
    } else {
      updatePayload.email = null;
    }
  }

  // Validate paymentMethodId
  if (data.paymentMethodId !== undefined) {
    if (data.paymentMethodId) {
      const pm = await prisma.paymentMethod.findUnique({
        where: { id: data.paymentMethodId },
      });

      if (!pm) {
        throw ApiError.badRequest(
          `Selected payment method '${data.paymentMethodId}' does not exist.`,
          'INVALID_PAYMENT_METHOD'
        );
      }

      if (!pm.isActive) {
        throw ApiError.badRequest(
          `Payment method '${pm.name}' is currently inactive and cannot be assigned.`,
          'INACTIVE_PAYMENT_METHOD'
        );
      }
      updatePayload.paymentMethodId = pm.id;
    } else {
      updatePayload.paymentMethodId = null;
    }
  }

  if (Array.isArray(data.paymentMethods)) {
    await prisma.supplierPaymentMethod.deleteMany({
      where: { supplierId: id },
    });
    if (data.paymentMethods.length > 0) {
      await prisma.supplierPaymentMethod.createMany({
        data: data.paymentMethods.map((pm, index) => ({
          supplierId: id,
          paymentMethod: pm.paymentMethod.trim(),
          accountNumber: pm.accountNumber.trim(),
          isPrimary: typeof pm.isPrimary === 'boolean' ? pm.isPrimary : (index === 0),
        })),
      });
    }
  }

  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data: updatePayload,
    include: {
      paymentMethods: {
        select: {
          id: true,
          paymentMethod: true,
          accountNumber: true,
          isPrimary: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      paymentMethod: {
        select: {
          id: true,
          name: true,
          provider: true,
        },
      },
    },
  });

  await recordSupplierAuditLog({
    adminUser,
    action: 'SUPPLIER_UPDATE',
    supplierId: updatedSupplier.id,
    ipAddress,
    changesSummary: `Updated supplier details for "${updatedSupplier.companyName}"`,
  });

  return updatedSupplier;
}

/**
 * Toggle or set supplier status (ACTIVE <-> SUSPENDED)
 */
export async function toggleSupplierStatus(id, targetStatus = null, adminUser = null, ipAddress = null) {
  const existing = await getSupplierById(id);

  let nextStatus = targetStatus;
  if (!nextStatus) {
    nextStatus = existing.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  }

  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data: { status: nextStatus },
    include: {
      paymentMethods: {
        select: {
          id: true,
          paymentMethod: true,
          accountNumber: true,
          isPrimary: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      paymentMethod: {
        select: {
          id: true,
          name: true,
          provider: true,
        },
      },
    },
  });

  await recordSupplierAuditLog({
    adminUser,
    action: 'SUPPLIER_STATUS_CHANGE',
    supplierId: updatedSupplier.id,
    ipAddress,
    changesSummary: `Supplier "${updatedSupplier.companyName}" status set to ${nextStatus}`,
  });

  return updatedSupplier;
}
