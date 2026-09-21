// ==============================================================================
// Ardab Market - Customer Management & Operations Service
// ==============================================================================

import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { getPaginationParams } from '../../shared/utils/pagination.js';
import { generateNextCustomerCode } from './customerCode.service.js';
import {
  getCustomerMetrics,
  getCustomerListMetrics,
  getCustomerSummary as getSummaryMetrics,
} from './customer.metrics.service.js';
import { logPlatformSecurityEvent } from '../../shared/services/platformSecurity.service.js';

/**
 * Records an administrative audit log for customer operations.
 */
async function recordCustomerAuditLog({ adminUser, action, customerId, ipAddress, changesSummary }) {
  try {
    let validAdminId = null;
    if (adminUser?.id) {
      const exists = await prisma.adminUser.findUnique({
        where: { id: adminUser.id },
        select: { id: true },
      });
      if (exists) validAdminId = exists.id;
    }

    await prisma.auditLog.create({
      data: {
        adminId: validAdminId,
        adminEmail: adminUser?.email || 'system@ardabmarket.com',
        action,
        entity: 'Customer',
        entityId: customerId,
        ipAddress: ipAddress || null,
        changesSummary: changesSummary || null,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Failed to create audit log for customer operation', { error: err.message, action });
  }
}

/**
 * List customers with server-side pagination, search, filtering, and batched metrics.
 */
export async function listCustomers(query = {}) {
  const { page, pageSize, skip, take, formatMeta } = getPaginationParams(query);

  const where = {};

  // 1. City Filter
  if (query.city && query.city !== 'All Cities' && query.city.trim().length > 0) {
    where.city = {
      equals: query.city.trim(),
      mode: 'insensitive',
    };
  }

  // 2. Delivery Zone Filter
  if (query.deliveryZone && query.deliveryZone !== 'ALL' && query.deliveryZone.trim().length > 0) {
    where.deliveryZone = {
      equals: query.deliveryZone.trim(),
      mode: 'insensitive',
    };
  }

  // 3. Status Filter
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  // 4. Verification Status Filter
  if (query.verificationStatus && query.verificationStatus !== 'ALL') {
    where.verificationStatus = query.verificationStatus;
  }

  // 5. Server-side Search Filter (Code, Full Name, Phone, Email)
  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    where.OR = [
      { customerCode: { contains: s, mode: 'insensitive' } },
      { fullName: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
      { email: { contains: s, mode: 'insensitive' } },
    ];
  }

  // 6. Whitelisted Sorting
  const allowedSortFields = ['createdAt', 'fullName', 'customerCode', 'lastActivityAt', 'status'];
  const sortBy = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const orderBy = { [sortBy]: sortOrder };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        customerCode: true,
        fullName: true,
        phone: true,
        email: true,
        profileImageUrl: true,
        city: true,
        deliveryZone: true,
        status: true,
        verificationStatus: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  // N+1 Prevention: Batch-fetch all metrics for this page's customers in 2 grouped queries
  const customerIds = customers.map((c) => c.id);
  const metricsMap = await getCustomerListMetrics(customerIds);

  const items = customers.map((c) => ({
    ...c,
    metrics: metricsMap.get(c.id) || {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpent: '0.00',
      totalScore: 0,
    },
  }));

  return {
    items,
    pagination: formatMeta(total),
  };
}

/**
 * Returns dynamic aggregated summary counters for the top dashboard summary cards.
 */
export async function getCustomerSummary() {
  return getSummaryMetrics(prisma);
}

/**
 * Retrieves full customer detail by UUID with associated metrics, addresses, recent orders, and recent activity.
 */
export async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: {
        where: { isActive: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      },
      orders: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      activities: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found or has been deactivated', 'CUSTOMER_NOT_FOUND');
  }

  // Calculate authoritative experience metrics
  const metrics = await getCustomerMetrics(customer.id);

  // Exclude sensitive internal credentials
  const { passwordHash, ...safeCustomer } = customer;

  return {
    ...safeCustomer,
    metrics,
  };
}

/**
 * Retrieves paginated historical orders for a specific customer.
 */
export async function getCustomerOrders(customerId, query = {}) {
  const customerExists = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });

  if (!customerExists) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  const { page, pageSize, skip, take, formatMeta } = getPaginationParams(query);

  const where = { customerId };
  if (query.status && query.status !== 'ALL') {
    where.status = query.status;
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    items: orders,
    pagination: formatMeta(total),
  };
}

/**
 * Retrieves paginated chronological activity trail for a specific customer.
 */
export async function getCustomerActivity(customerId, query = {}) {
  const customerExists = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });

  if (!customerExists) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  const { page, pageSize, skip, take, formatMeta } = getPaginationParams(query);

  const [total, activities] = await Promise.all([
    prisma.customerActivity.count({ where: { customerId } }),
    prisma.customerActivity.findMany({
      where: { customerId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    items: activities,
    pagination: formatMeta(total),
  };
}

/**
 * Super Admin customer profile update.
 * Strictly whitelists allowed fields. Disallows modifying system-generated metrics.
 */
export async function updateCustomerProfile(id, updateData, adminUser, ipAddress) {
  const existing = await prisma.customer.findUnique({
    where: { id },
  });

  if (!existing) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  // Explicit field whitelist: protected metrics are completely stripped/disallowed
  const allowedData = {};
  if (updateData.fullName !== undefined) allowedData.fullName = updateData.fullName.trim();
  if (updateData.phone !== undefined) allowedData.phone = updateData.phone.trim();
  if (updateData.email !== undefined) allowedData.email = updateData.email;
  if (updateData.city !== undefined) allowedData.city = updateData.city.trim();
  if (updateData.deliveryZone !== undefined) allowedData.deliveryZone = updateData.deliveryZone?.trim() || null;
  if (updateData.profileImageUrl !== undefined) allowedData.profileImageUrl = updateData.profileImageUrl;
  if (updateData.verificationStatus !== undefined) allowedData.verificationStatus = updateData.verificationStatus;

  // Check phone uniqueness conflict if changed
  if (allowedData.phone && allowedData.phone !== existing.phone) {
    const conflict = await prisma.customer.findFirst({
      where: { phone: allowedData.phone, id: { not: id } },
    });
    if (conflict) {
      throw ApiError.conflict('Another customer is already registered with this phone number', 'PHONE_EXISTS');
    }
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...allowedData,
      lastActivityAt: new Date(),
    },
  });

  // Record Audit Log & Activity Trail
  await Promise.all([
    recordCustomerAuditLog({
      adminUser,
      action: 'CUSTOMER_UPDATED',
      customerId: id,
      ipAddress,
      changesSummary: `Customer profile updated: ${Object.keys(allowedData).join(', ')}`,
    }),
    prisma.customerActivity.create({
      data: {
        customerId: id,
        action: 'PROFILE_UPDATED',
        description: `Profile information updated by Super Admin (${adminUser?.email || 'Admin'})`,
        actor: 'Super Admin',
      },
    }),
  ]);

  const metrics = await getCustomerMetrics(updated.id);
  const { passwordHash, ...safeCustomer } = updated;

  return {
    ...safeCustomer,
    metrics,
  };
}

/**
 * Toggles or sets customer account status (ACTIVE, SUSPENDED, INACTIVE).
 */
export async function updateCustomerStatus(id, newStatus, adminUser, ipAddress) {
  const existing = await prisma.customer.findUnique({
    where: { id },
  });

  if (!existing) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      status: newStatus,
      lastActivityAt: new Date(),
    },
  });

  await Promise.all([
    recordCustomerAuditLog({
      adminUser,
      action: 'CUSTOMER_STATUS_CHANGED',
      customerId: id,
      ipAddress,
      changesSummary: `Status changed from ${existing.status} to ${newStatus}`,
    }),
    prisma.customerActivity.create({
      data: {
        customerId: id,
        action: 'STATUS_CHANGED',
        description: `Account status set to ${newStatus} by Super Admin (${adminUser?.email || 'Admin'})`,
        actor: 'Super Admin',
      },
    }),
    logPlatformSecurityEvent({
      eventType: newStatus === 'SUSPENDED' ? 'CUSTOMER_SUSPENDED' : 'CUSTOMER_STATUS_CHANGED',
      severity: newStatus === 'SUSPENDED' ? 'MEDIUM' : 'INFO',
      source: 'SUPERADMIN_WEB',
      actorType: 'SUPER_ADMIN',
      actorId: adminUser?.id,
      actorEmail: adminUser?.email,
      targetType: 'Customer',
      targetId: id,
      ipAddress,
      metadata: { previousStatus: existing.status, newStatus, customerPhone: existing.phone },
    }),
  ]);

  const metrics = await getCustomerMetrics(updated.id);
  const { passwordHash, ...safeCustomer } = updated;

  return {
    ...safeCustomer,
    metrics,
  };
}

/**
 * Performs bulk account status updates across multiple selected customers.
 */
export async function bulkUpdateCustomerStatus(ids, newStatus, adminUser, ipAddress) {
  const result = await prisma.customer.updateMany({
    where: { id: { in: ids } },
    data: {
      status: newStatus,
      lastActivityAt: new Date(),
    },
  });

  await recordCustomerAuditLog({
    adminUser,
    action: 'CUSTOMER_BULK_STATUS_CHANGED',
    customerId: null,
    ipAddress,
    changesSummary: `Bulk status update to ${newStatus} for ${result.count} customers`,
  });

  return {
    affectedCount: result.count,
    status: newStatus,
  };
}

/**
 * Foundation for future Customer Mobile App Registration:
 * Validates, checks duplicates, generates sequential customerCode, and creates customer profile.
 */
export async function registerCustomer(input, ipAddress) {
  const phone = input.phone.trim();
  const email = input.email || null;

  // Check duplicate phone
  const existingPhone = await prisma.customer.findFirst({
    where: { phone },
  });
  if (existingPhone) {
    throw ApiError.conflict('A customer with this phone number is already registered', 'PHONE_EXISTS');
  }

  let passwordHash = null;
  if (input.password) {
    passwordHash = await bcrypt.hash(input.password, 10);
  }

  let fullName = input.fullName?.trim();
  if (!fullName) {
    if (email) {
      const localPart = email.split('@')[0];
      // Convert dotted or underscore separated names e.g. abebe.kebede -> Abebe Kebede
      fullName = localPart
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    if (!fullName || fullName.length < 2) {
      fullName = 'Customer ' + phone.slice(-4);
    }
  }

  const customerCode = await generateNextCustomerCode(prisma);

  const customer = await prisma.$transaction(async (tx) => {
    const newCustomer = await tx.customer.create({
      data: {
        customerCode,
        fullName,
        phone,
        email,
        passwordHash,
        city: input.city?.trim() || 'Gondar',
        deliveryZone: input.deliveryZone?.trim() || null,
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        lastActivityAt: new Date(),
      },
    });

    // Initial Registration Activity
    await tx.customerActivity.create({
      data: {
        customerId: newCustomer.id,
        action: 'CUSTOMER_REGISTERED',
        description: 'Customer registered account on Ardab Market mobile platform',
        actor: 'Customer',
      },
    });

    // Initial Welcome Loyalty Score Event
    await tx.customerScoreEvent.create({
      data: {
        customerId: newCustomer.id,
        type: 'ACCOUNT_REGISTRATION',
        points: 50,
        source: 'LOYALTY_PROGRAM',
        metadata: JSON.stringify({ event: 'Welcome bonus points' }),
      },
    });

    return newCustomer;
  });

  const metrics = await getCustomerMetrics(customer.id);
  const { passwordHash: _, ...safeCustomer } = customer;

  return {
    ...safeCustomer,
    metrics,
  };
}

/**
 * Super Admin: Complete customer deletion and data cleanup.
 * Atomically cleanses all customer-owned information (addresses, activities, loyalty score events,
 * reviews, pending registrations) and anonymizes orders/deliveries to preserve historical accounting integrity.
 * If any step fails, rolls back completely.
 */
export async function deleteCustomerCompletely(customerId, adminUser, ipAddress) {
  const existing = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      customerCode: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
    },
  });

  if (!existing) {
    throw ApiError.notFound('Customer not found or already deleted', 'CUSTOMER_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    // 1. Delete customer-owned delivery addresses
    await tx.customerAddress.deleteMany({
      where: { customerId },
    });

    // 2. Delete customer-owned loyalty score events
    await tx.customerScoreEvent.deleteMany({
      where: { customerId },
    });

    // 3. Delete customer-owned activity audit items
    await tx.customerActivity.deleteMany({
      where: { customerId },
    });

    // 4. Delete customer reviews
    await tx.customerReview.deleteMany({
      where: { customerId },
    });

    // 5. Unlink customer feedback (set customerId to null, anonymize author name)
    await tx.feedback.updateMany({
      where: { customerId },
      data: {
        customerId: null,
        authorName: '[Deleted Customer]',
        isAnonymous: true,
      },
    });

    // 6. Delete any pending registrations matching this customer's email or phone
    const orPending = [];
    if (existing.email) orPending.push({ email: existing.email });
    if (existing.phone) orPending.push({ phone: existing.phone });
    if (orPending.length > 0) {
      await tx.pendingCustomerRegistration.deleteMany({
        where: { OR: orPending },
      });
    }

    // 7. Delete delivery activities and deliveries linked to the customer's orders or directly to customer
    const customerOrders = await tx.order.findMany({
      where: { customerId },
      select: { id: true },
    });
    const orderIds = customerOrders.map((o) => o.id);

    // Find deliveries linked to this customer or to the customer's orders
    const deliveries = await tx.delivery.findMany({
      where: {
        OR: [
          { customerId },
          ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
        ],
      },
      select: { id: true },
    });
    const deliveryIds = deliveries.map((d) => d.id);

    if (deliveryIds.length > 0) {
      await tx.deliveryActivity.deleteMany({
        where: { deliveryId: { in: deliveryIds } },
      });
      await tx.delivery.deleteMany({
        where: { id: { in: deliveryIds } },
      });
    }

    // 8. Delete all order children (activities, delivery address, items) then orders
    if (orderIds.length > 0) {
      await tx.orderActivity.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await tx.orderDeliveryAddress.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await tx.orderItem.deleteMany({
        where: { orderId: { in: orderIds } },
      });
      await tx.order.deleteMany({
        where: { id: { in: orderIds } },
      });
    }

    // 9. Delete support tickets & ticket history
    const customerTickets = await tx.supportTicket.findMany({
      where: { customerId },
      select: { id: true },
    });
    const ticketIds = customerTickets.map((t) => t.id);
    if (ticketIds.length > 0) {
      await tx.supportMessage.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      await tx.supportTicketStatusHistory.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      await tx.supportTicketAssignmentHistory.deleteMany({
        where: { ticketId: { in: ticketIds } },
      });
      await tx.supportTicket.deleteMany({
        where: { id: { in: ticketIds } },
      });
    }

    // 10. Unconditionally delete the Customer row from the database
    await tx.customer.delete({
      where: { id: customerId },
    });
  });

  // 10. Audit Log & Central Security Event (recorded outside transaction on commit)
  await Promise.all([
    recordCustomerAuditLog({
      adminUser,
      action: 'CUSTOMER_DELETED',
      customerId,
      ipAddress,
      changesSummary: `Customer account ${existing.customerCode} permanently deleted/cleansed by Super Admin`,
    }),
    logPlatformSecurityEvent({
      eventType: 'CUSTOMER_DELETED',
      severity: 'HIGH',
      source: 'SUPERADMIN_WEB',
      actorType: 'SUPER_ADMIN',
      actorId: adminUser?.id,
      actorEmail: adminUser?.email,
      targetType: 'Customer',
      targetId: customerId,
      ipAddress,
      metadata: {
        customerCode: existing.customerCode,
        action: 'PERMANENT_DELETION',
      },
    }),
  ]);

  return {
    success: true,
    deletedId: customerId,
    customerCode: existing.customerCode,
  };
}

