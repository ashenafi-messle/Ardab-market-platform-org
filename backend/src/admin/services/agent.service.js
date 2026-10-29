// ==============================================================================
// Ardab Market - Agent Management Service
// ==============================================================================
// Handles agent registration, profile edits, secure national ID attachment,
// list & detail queries, and statistics aggregation.
// ==============================================================================

import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import {
  savePrivateDocument,
  deletePrivateDocument,
} from '../../shared/services/agentDocument.service.js';

/**
 * Normalizes email addresses for case-insensitive uniqueness
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Registers a new agent with authorized Super Admin audit trail
 */
export async function createAgent(payload, file, adminUser = null) {
  const normalizedEmail = normalizeEmail(payload.email);

  // 1. Database-enforced case-insensitive uniqueness check
  const existingAgent = await prisma.agent.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
    },
  });

  if (existingAgent) {
    throw ApiError.conflict(
      `An agent with email "${normalizedEmail}" is already registered.`,
      'AGENT_EMAIL_EXISTS'
    );
  }

  // 2. Validate mandatory national ID document
  if (!file || !file.buffer) {
    throw ApiError.badRequest(
      'A scanned national identity document (PDF, JPG, PNG, WEBP) is required.',
      'NATIONAL_ID_REQUIRED'
    );
  }

  // 3. Securely store document in private storage
  const docInfo = await savePrivateDocument(
    file.buffer,
    file.originalname,
    file.verifiedMimeType || file.mimetype
  );

  const commissionRate = new Decimal(payload.commissionRate !== undefined ? payload.commissionRate : 5.00);

  // 4. Create Agent atomically in database
  const agent = await prisma.agent.create({
    data: {
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: normalizedEmail,
      nationalIdKey: docInfo.storageKey,
      nationalIdOriginalName: docInfo.originalName,
      nationalIdMimeType: docInfo.mimeType,
      status: payload.status || 'ACTIVE',
      commissionRate,
      commissionType: payload.commissionType || 'PERCENTAGE',
      registeredById: adminUser?.id || null,
      notes: payload.notes ? payload.notes.trim() : null,
    },
  });

  // 5. Audit Log
  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email || 'superadmin@ardabmarket.com',
        action: 'AGENT_REGISTERED',
        entity: 'Agent',
        entityId: agent.id,
        changesSummary: `Agent "${agent.name}" (${agent.email}) registered by Super Admin.`,
        status: 'SUCCESS',
      },
    }).catch((err) => logger.warn('[AgentAudit] Failed to record log:', err));
  }

  logger.info(`[Agent] Registered new agent ${agent.name} (${agent.id})`);

  return formatAgentResponse(agent);
}

/**
 * Updates an agent profile, status, commission policy, or national ID document
 */
export async function updateAgent(id, payload, file, adminUser = null) {
  const existing = await prisma.agent.findUnique({
    where: { id },
  });

  if (!existing) {
    throw ApiError.notFound(`Agent with ID "${id}" was not found.`);
  }

  const updates = {};

  if (payload.name) updates.name = payload.name.trim();
  if (payload.phone) updates.phone = payload.phone.trim();
  if (payload.status) updates.status = payload.status;
  if (payload.notes !== undefined) updates.notes = payload.notes ? payload.notes.trim() : null;

  if (payload.commissionRate !== undefined) {
    updates.commissionRate = new Decimal(payload.commissionRate);
  }
  if (payload.commissionType) {
    updates.commissionType = payload.commissionType;
  }

  if (payload.email) {
    const normalizedEmail = normalizeEmail(payload.email);
    if (normalizedEmail !== existing.email.toLowerCase()) {
      const emailConflict = await prisma.agent.findFirst({
        where: {
          email: { equals: normalizedEmail, mode: 'insensitive' },
          NOT: { id },
        },
      });

      if (emailConflict) {
        throw ApiError.conflict(
          `Email "${normalizedEmail}" is already in use by another agent.`,
          'AGENT_EMAIL_EXISTS'
        );
      }
      updates.email = normalizedEmail;
    }
  }

  // Handle national ID replacement if new file is supplied
  let oldKeyToDelete = null;
  if (file && file.buffer) {
    const docInfo = await savePrivateDocument(
      file.buffer,
      file.originalname,
      file.verifiedMimeType || file.mimetype
    );
    updates.nationalIdKey = docInfo.storageKey;
    updates.nationalIdOriginalName = docInfo.originalName;
    updates.nationalIdMimeType = docInfo.mimeType;
    oldKeyToDelete = existing.nationalIdKey;
  }

  const updatedAgent = await prisma.agent.update({
    where: { id },
    data: updates,
  });

  if (oldKeyToDelete) {
    deletePrivateDocument(oldKeyToDelete).catch(() => {});
  }

  // Audit Log
  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        adminEmail: adminUser.email || 'superadmin@ardabmarket.com',
        action: 'AGENT_UPDATED',
        entity: 'Agent',
        entityId: id,
        changesSummary: `Updated agent fields: ${Object.keys(updates).join(', ')}`,
        status: 'SUCCESS',
      },
    }).catch((err) => logger.warn('[AgentAudit] Failed to record log:', err));
  }

  return formatAgentResponse(updatedAgent);
}

/**
 * Returns paginated, searchable, filterable list of agents with relevant metrics
 */
export async function listAgents({
  page = 1,
  limit = 20,
  search = '',
  status = null,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
    where.status = status.toUpperCase();
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
    ];
  }

  const orderBy = {};
  if (['name', 'email', 'status', 'createdAt'].includes(sortBy)) {
    orderBy[sortBy] = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [total, rawAgents] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      include: {
        _count: {
          select: {
            customerRelationships: true,
            integrationRequests: { where: { status: 'PENDING' } },
            attributedOrders: true,
            commissions: true,
          },
        },
        commissions: {
          select: {
            commissionAmount: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const agents = rawAgents.map((agent) => {
    let pendingCommissions = new Decimal(0);
    let payableCommissions = new Decimal(0);
    let paidCommissions = new Decimal(0);

    for (const c of agent.commissions) {
      if (c.status === 'PENDING') pendingCommissions = pendingCommissions.add(c.commissionAmount);
      else if (c.status === 'PAYABLE') payableCommissions = payableCommissions.add(c.commissionAmount);
      else if (c.status === 'PAID') paidCommissions = paidCommissions.add(c.commissionAmount);
    }

    return {
      ...formatAgentResponse(agent),
      approvedCustomerCount: agent._count.customerRelationships,
      pendingRequestsCount: agent._count.integrationRequests,
      attributedOrdersCount: agent._count.attributedOrders,
      commissionTotals: {
        pending: parseFloat(pendingCommissions.toFixed(2)),
        payable: parseFloat(payableCommissions.toFixed(2)),
        paid: parseFloat(paidCommissions.toFixed(2)),
        total: parseFloat(pendingCommissions.add(payableCommissions).add(paidCommissions).toFixed(2)),
      },
    };
  });

  return {
    agents,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Returns single agent details including customer count, orders, and commissions
 */
export async function getAgentById(id) {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      registeredBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          customerRelationships: true,
          integrationRequests: true,
          attributedOrders: true,
          commissions: true,
        },
      },
      commissions: {
        select: {
          commissionAmount: true,
          status: true,
        },
      },
    },
  });

  if (!agent) {
    throw ApiError.notFound(`Agent with ID "${id}" was not found.`);
  }

  let pendingCommissions = new Decimal(0);
  let payableCommissions = new Decimal(0);
  let paidCommissions = new Decimal(0);

  for (const c of agent.commissions) {
    if (c.status === 'PENDING') pendingCommissions = pendingCommissions.add(c.commissionAmount);
    else if (c.status === 'PAYABLE') payableCommissions = payableCommissions.add(c.commissionAmount);
    else if (c.status === 'PAID') paidCommissions = paidCommissions.add(c.commissionAmount);
  }

  return {
    ...formatAgentResponse(agent),
    registeredBy: agent.registeredBy,
    approvedCustomerCount: agent._count.customerRelationships,
    totalRequestsCount: agent._count.integrationRequests,
    attributedOrdersCount: agent._count.attributedOrders,
    commissionTotals: {
      pending: parseFloat(pendingCommissions.toFixed(2)),
      payable: parseFloat(payableCommissions.toFixed(2)),
      paid: parseFloat(paidCommissions.toFixed(2)),
      total: parseFloat(pendingCommissions.add(payableCommissions).add(paidCommissions).toFixed(2)),
    },
  };
}

/**
 * Returns customers connected to this agent
 */
export async function getAgentCustomers(agentId, { page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, relationships] = await Promise.all([
    prisma.customerAgentRelationship.count({ where: { agentId } }),
    prisma.customerAgentRelationship.findMany({
      where: { agentId },
      skip,
      take: limitNum,
      orderBy: { approvedAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            city: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  return {
    customers: relationships.map((r) => ({
      relationshipId: r.id,
      approvedAt: r.approvedAt,
      customer: r.customer,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Returns orders attributed to this agent
 */
export async function getAgentOrders(agentId, { page = 1, limit = 20 }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { attributedAgentId: agentId } }),
    prisma.order.findMany({
      where: { attributedAgentId: agentId },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, customerCode: true, fullName: true, phone: true },
        },
        commissions: {
          where: { agentId },
          select: {
            id: true,
            commissionAmount: true,
            status: true,
            rateSnapshot: true,
          },
        },
      },
    }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customer: o.customer,
      subtotal: parseFloat(o.subtotal.toString()),
      totalAmount: parseFloat(o.totalAmount.toString()),
      status: o.status,
      paymentStatus: o.paymentStatus,
      placedAt: o.placedAt,
      attributedAt: o.attributedAt,
      commission: o.commissions[0] || null,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Returns commission ledger entries for an agent
 */
export async function getAgentCommissions(agentId, { page = 1, limit = 20, status = null }) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where = { agentId };
  if (status) {
    where.status = status.toUpperCase();
  }

  const [total, commissions] = await Promise.all([
    prisma.agentCommission.count({ where }),
    prisma.agentCommission.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { id: true, orderNumber: true, totalAmount: true, status: true },
        },
      },
    }),
  ]);

  return {
    commissions: commissions.map((c) => ({
      id: c.id,
      orderNumber: c.order?.orderNumber,
      orderId: c.orderId,
      baseAmount: parseFloat(c.baseAmount.toString()),
      rateSnapshot: parseFloat(c.rateSnapshot.toString()),
      policyType: c.policyType,
      commissionAmount: parseFloat(c.commissionAmount.toString()),
      currency: c.currency,
      status: c.status,
      payableAt: c.payableAt,
      paidAt: c.paidAt,
      paymentReference: c.paymentReference,
      createdAt: c.createdAt,
    })),
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Returns comprehensive agent system statistics for the Super Admin dashboard
 */
export async function getAgentDashboardStats() {
  const [
    totalAgents,
    activeAgents,
    inactiveAgents,
    approvedIntegrations,
    pendingRequests,
    attributedOrders,
    commissions,
  ] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { status: 'ACTIVE' } }),
    prisma.agent.count({ where: { status: 'INACTIVE' } }),
    prisma.customerAgentRelationship.count(),
    prisma.agentIntegrationRequest.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { attributedAgentId: { not: null } } }),
    prisma.agentCommission.findMany({
      select: {
        commissionAmount: true,
        status: true,
      },
    }),
  ]);

  let pendingCommissions = new Decimal(0);
  let payableCommissions = new Decimal(0);
  let paidCommissions = new Decimal(0);

  for (const c of commissions) {
    if (c.status === 'PENDING') pendingCommissions = pendingCommissions.add(c.commissionAmount);
    else if (c.status === 'PAYABLE') payableCommissions = payableCommissions.add(c.commissionAmount);
    else if (c.status === 'PAID') paidCommissions = paidCommissions.add(c.commissionAmount);
  }

  return {
    totalAgents,
    activeAgents,
    inactiveAgents,
    approvedIntegrations,
    pendingRequests,
    attributedOrders,
    commissions: {
      pending: parseFloat(pendingCommissions.toFixed(2)),
      payable: parseFloat(payableCommissions.toFixed(2)),
      paid: parseFloat(paidCommissions.toFixed(2)),
      total: parseFloat(pendingCommissions.add(payableCommissions).add(paidCommissions).toFixed(2)),
    },
  };
}

/**
 * Formats an agent record for safe API delivery
 * NOTE: nationalIdKey is NEVER leaked to clients; secure access is via dedicated endpoint
 */
function formatAgentResponse(agent) {
  return {
    id: agent.id,
    name: agent.name,
    phone: agent.phone,
    email: agent.email,
    status: agent.status,
    commissionRate: parseFloat(agent.commissionRate.toString()),
    commissionType: agent.commissionType,
    hasNationalIdDocument: Boolean(agent.nationalIdKey),
    nationalIdMimeType: agent.nationalIdMimeType,
    notes: agent.notes,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}
