// ==============================================================================
// Ardab Market - Agent Core Business Service
// ==============================================================================

import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../shared/config/database.js';
import { ApiError } from '../shared/utils/apiResponse.js';

export class AgentService {
  /**
   * 1. Dashboard Overview & Financial Summary
   */
  static async getDashboard(agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { credentials: true },
    });

    if (!agent) {
      throw ApiError.notFound('Agent not found.', 'AGENT_NOT_FOUND');
    }

    // Run parallel aggregated queries for performance
    const [
      commissions,
      totalCustomers,
      activeCustomers,
      totalOrders,
      acceptedOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      recentOrders,
    ] = await Promise.all([
      // Financials
      prisma.agentCommission.findMany({
        where: { agentId },
        select: {
          commissionAmount: true,
          status: true,
        },
      }),
      // Customer counts
      prisma.customerAgentRelationship.count({
        where: { agentId },
      }),
      prisma.customerAgentRelationship.count({
        where: {
          agentId,
          customer: { status: 'ACTIVE' },
        },
      }),
      // Order counts
      prisma.order.count({
        where: { attributedAgentId: agentId },
      }),
      prisma.order.count({
        where: {
          attributedAgentId: agentId,
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'] },
        },
      }),
      prisma.order.count({
        where: {
          attributedAgentId: agentId,
          status: 'PENDING',
        },
      }),
      prisma.order.count({
        where: {
          attributedAgentId: agentId,
          status: { in: ['DELIVERED', 'COMPLETED'] },
        },
      }),
      prisma.order.count({
        where: {
          attributedAgentId: agentId,
          status: { in: ['CANCELLED', 'REJECTED', 'FAILED'] },
        },
      }),
      // Recent orders activity
      prisma.order.findMany({
        where: { attributedAgentId: agentId },
        orderBy: { placedAt: 'desc' },
        take: 5,
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true },
          },
          commissions: {
            where: { agentId },
            select: { commissionAmount: true, status: true },
          },
        },
      }),
    ]);

    // Precise Decimal arithmetic for financials
    let totalEarned = new Decimal(0);
    let pendingCommission = new Decimal(0);
    let approvedCommission = new Decimal(0);
    let paidCommission = new Decimal(0);

    for (const c of commissions) {
      const amount = new Decimal(c.commissionAmount || 0);
      if (c.status === 'PENDING') {
        pendingCommission = pendingCommission.add(amount);
      } else if (c.status === 'PAYABLE') {
        approvedCommission = approvedCommission.add(amount);
        totalEarned = totalEarned.add(amount);
      } else if (c.status === 'PAID') {
        paidCommission = paidCommission.add(amount);
        totalEarned = totalEarned.add(amount);
      }
    }

    return {
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        status: agent.status,
        commissionRate: Number(agent.commissionRate),
        commissionType: agent.commissionType,
        isActivated: agent.credentials?.isActivated ?? false,
      },
      financialSummary: {
        totalEarned: Number(totalEarned.toFixed(2)),
        pendingCommission: Number(pendingCommission.toFixed(2)),
        approvedCommission: Number(approvedCommission.toFixed(2)),
        paidCommission: Number(paidCommission.toFixed(2)),
        currency: 'ETB',
      },
      customerSummary: {
        totalCustomers,
        activeCustomers,
      },
      orderSummary: {
        totalOrders,
        acceptedOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
      },
      recentActivity: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.fullName || 'Customer',
        totalAmount: Number(o.totalAmount),
        status: o.status,
        placedAt: (o.placedAt || o.createdAt).toISOString(),
        commissionAmount: o.commissions[0] ? Number(o.commissions[0].commissionAmount) : 0,
        commissionStatus: o.commissions[0] ? o.commissions[0].status : null,
      })),
    };
  }

  /**
   * 2. Integrated Customers List
   */
  static async getCustomers(agentId, { page = 1, limit = 20, search } = {}) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      agentId,
    };

    if (search && search.trim()) {
      const term = search.trim();
      where.customer = {
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
          { customerCode: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const [total, relationships] = await Promise.all([
      prisma.customerAgentRelationship.count({ where }),
      prisma.customerAgentRelationship.findMany({
        where,
        orderBy: { approvedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
              email: true,
              phone: true,
              city: true,
              profileImageUrl: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    // For each customer, gather order count and total commission generated for this agent
    const customerIds = relationships.map((r) => r.customerId);

    const [orderStats, commissionStats] = await Promise.all([
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          attributedAgentId: agentId,
          customerId: { in: customerIds },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.agentCommission.groupBy({
        by: ['agentId'],
        where: {
          agentId,
          order: { customerId: { in: customerIds } },
        },
        _sum: { commissionAmount: true },
      }),
    ]);

    const orderStatsMap = new Map();
    orderStats.forEach((s) => {
      orderStatsMap.set(s.customerId, {
        orderCount: s._count.id || 0,
        totalOrderValue: s._sum.totalAmount ? Number(s._sum.totalAmount) : 0,
      });
    });

    const customers = relationships.map((rel) => {
      const stats = orderStatsMap.get(rel.customerId) || { orderCount: 0, totalOrderValue: 0 };
      return {
        id: rel.customer.id,
        customerCode: rel.customer.customerCode,
        fullName: rel.customer.fullName,
        email: rel.customer.email,
        phone: rel.customer.phone,
        city: rel.customer.city,
        profileImageUrl: rel.customer.profileImageUrl,
        status: rel.customer.status,
        integrationDate: rel.approvedAt.toISOString(),
        orderCount: stats.orderCount,
        totalOrderValue: stats.totalOrderValue,
      };
    });

    return {
      customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * 3. Customer Details (Scoped strictly to this agent)
   */
  static async getCustomerById(agentId, customerId) {
    const relationship = await prisma.customerAgentRelationship.findUnique({
      where: { customerId },
      include: {
        customer: {
          include: {
            addresses: {
              where: { isDefault: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!relationship || relationship.agentId !== agentId) {
      throw ApiError.notFound('Customer not found in your integrated client list.', 'CUSTOMER_NOT_FOUND');
    }

    const { customer } = relationship;

    // Attributed orders stats
    const [orderStats, commissions] = await Promise.all([
      prisma.order.aggregate({
        where: {
          attributedAgentId: agentId,
          customerId,
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
      prisma.agentCommission.findMany({
        where: {
          agentId,
          order: { customerId },
        },
        select: {
          commissionAmount: true,
          status: true,
        },
      }),
    ]);

    let generatedCommission = new Decimal(0);
    commissions.forEach((c) => {
      if (c.status === 'PAYABLE' || c.status === 'PAID') {
        generatedCommission = generatedCommission.add(new Decimal(c.commissionAmount || 0));
      }
    });

    const defaultAddress = customer.addresses[0] || null;

    return {
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone,
        city: customer.city,
        profileImageUrl: customer.profileImageUrl,
        status: customer.status,
        integrationDate: relationship.approvedAt.toISOString(),
        address: defaultAddress
          ? {
              addressLine1: defaultAddress.addressLine1,
              city: defaultAddress.city,
              zone: defaultAddress.zone,
            }
          : null,
        metrics: {
          totalOrders: orderStats._count.id || 0,
          totalSpent: orderStats._sum.totalAmount ? Number(orderStats._sum.totalAmount) : 0,
          totalCommissionEarned: Number(generatedCommission.toFixed(2)),
          currency: 'ETB',
        },
      },
    };
  }

  /**
   * 4. Customer's Attributed Orders
   */
  static async getCustomerOrders(agentId, customerId, { page = 1, limit = 20 } = {}) {
    // Verify relationship
    const relationship = await prisma.customerAgentRelationship.findUnique({
      where: { customerId },
    });

    if (!relationship || relationship.agentId !== agentId) {
      throw ApiError.notFound('Customer not found in your integrated client list.', 'CUSTOMER_NOT_FOUND');
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      attributedAgentId: agentId,
      customerId,
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          commissions: {
            where: { agentId },
            select: { commissionAmount: true, status: true },
          },
        },
      }),
    ]);

    const formattedOrders = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalAmount: Number(o.totalAmount),
      status: o.status,
      placedAt: (o.placedAt || o.createdAt).toISOString(),
      commissionAmount: o.commissions[0] ? Number(o.commissions[0].commissionAmount) : 0,
      commissionStatus: o.commissions[0] ? o.commissions[0].status : null,
    }));

    return {
      orders: formattedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * 5. Agent Attributed Orders List
   */
  static async getOrders(agentId, { page = 1, limit = 20, status, search } = {}) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      attributedAgentId: agentId,
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { customer: { fullName: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term } } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          customer: {
            select: { id: true, fullName: true, phone: true, city: true },
          },
          items: {
            select: { id: true, quantity: true, unitPrice: true, productName: true },
          },
          commissions: {
            where: { agentId },
            select: { commissionAmount: true, status: true, rateSnapshot: true },
          },
        },
      }),
    ]);

    const formattedOrders = orders.map((o) => {
      const commission = o.commissions[0] || null;
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer?.fullName || 'Customer',
        customerPhone: o.customer?.phone || null,
        city: o.city,
        totalAmount: Number(o.totalAmount),
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        status: o.status,
        paymentMethod: o.paymentMethod,
        placedAt: (o.placedAt || o.createdAt).toISOString(),
        commissionAmount: commission ? Number(commission.commissionAmount) : 0,
        commissionStatus: commission ? commission.status : null,
      };
    });

    return {
      orders: formattedOrders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * 6. Order Details (Read-only, strictly scoped to this agent)
   */
  static async getOrderById(agentId, orderId) {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        attributedAgentId: agentId,
      },
      include: {
        customer: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            city: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                primaryImage: true,
                sku: true,
              },
            },
          },
        },
        deliveryAddressSnapshot: true,
        commissions: {
          where: { agentId },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found or not attributed to your agent account.', 'ORDER_NOT_FOUND');
    }

    const commission = order.commissions[0] || null;

    return {
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: (order.placedAt || order.createdAt).toISOString(),
        confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
        deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
        cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        totalAmount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customer: {
          id: order.customer.id,
          fullName: order.customer.fullName,
          phone: order.customer.phone,
          city: order.customer.city,
        },
        deliveryAddress: order.deliveryAddressSnapshot
          ? {
              addressLine1: order.deliveryAddressSnapshot.addressLine1,
              city: order.deliveryAddressSnapshot.city,
              zone: order.deliveryAddressSnapshot.zone,
            }
          : {
              addressLine1: order.deliveryAddress,
              city: order.city,
              zone: order.deliveryZone,
            },
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          totalPrice: Number(i.totalPrice),
          imageUrl: i.product?.primaryImage || null,
        })),
        commission: commission
          ? {
              id: commission.id,
              baseAmount: Number(commission.baseAmount),
              rateSnapshot: Number(commission.rateSnapshot),
              policyType: commission.policyType,
              commissionAmount: Number(commission.commissionAmount),
              status: commission.status,
              payableAt: commission.payableAt ? commission.payableAt.toISOString() : null,
              paidAt: commission.paidAt ? commission.paidAt.toISOString() : null,
            }
          : null,
      },
    };
  }

  /**
   * 7. Commission Summary
   */
  static async getCommissionSummary(agentId) {
    const commissions = await prisma.agentCommission.findMany({
      where: { agentId },
      select: {
        commissionAmount: true,
        status: true,
      },
    });

    let totalEarned = new Decimal(0);
    let pending = new Decimal(0);
    let approved = new Decimal(0);
    let paid = new Decimal(0);

    for (const c of commissions) {
      const amount = new Decimal(c.commissionAmount || 0);
      if (c.status === 'PENDING') {
        pending = pending.add(amount);
      } else if (c.status === 'PAYABLE') {
        approved = approved.add(amount);
        totalEarned = totalEarned.add(amount);
      } else if (c.status === 'PAID') {
        paid = paid.add(amount);
        totalEarned = totalEarned.add(amount);
      }
    }

    return {
      totalEarned: Number(totalEarned.toFixed(2)),
      pendingCommission: Number(pending.toFixed(2)),
      approvedCommission: Number(approved.toFixed(2)),
      paidCommission: Number(paid.toFixed(2)),
      currency: 'ETB',
    };
  }

  /**
   * 8. Paginated Commission Ledger History
   */
  static async getCommissions(agentId, { page = 1, limit = 20, status, startDate, endDate } = {}) {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = { agentId };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, commissions] = await Promise.all([
      prisma.agentCommission.count({ where }),
      prisma.agentCommission.findMany({
        where,
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
              placedAt: true,
              customer: {
                select: { id: true, fullName: true },
              },
            },
          },
        },
      }),
    ]);

    const formattedCommissions = commissions.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      orderNumber: c.order?.orderNumber || null,
      customerName: c.order?.customer?.fullName || 'Customer',
      baseAmount: Number(c.baseAmount),
      rateSnapshot: Number(c.rateSnapshot),
      policyType: c.policyType,
      commissionAmount: Number(c.commissionAmount),
      currency: c.currency,
      status: c.status,
      payableAt: c.payableAt ? c.payableAt.toISOString() : null,
      paidAt: c.paidAt ? c.paidAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    }));

    return {
      commissions: formattedCommissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems: total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * 9. Get Agent Profile
   */
  static async getProfile(agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { credentials: true },
    });

    if (!agent) {
      throw ApiError.notFound('Agent not found.', 'AGENT_NOT_FOUND');
    }

    return {
      profile: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        status: agent.status,
        commissionRate: Number(agent.commissionRate),
        commissionType: agent.commissionType,
        isActivated: agent.credentials?.isActivated ?? false,
        activatedAt: agent.credentials?.activatedAt ? agent.credentials.activatedAt.toISOString() : null,
        createdAt: agent.createdAt.toISOString(),
      },
    };
  }

  /**
   * 10. Update Permitted Profile Fields
   */
  static async updateProfile(agentId, data) {
    const allowed = {};
    if (data.phone) {
      allowed.phone = data.phone.trim();
    }

    if (Object.keys(allowed).length === 0) {
      throw ApiError.badRequest('No modifiable fields supplied.', 'NO_FIELDS_TO_UPDATE');
    }

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: allowed,
    });

    return {
      message: 'Profile updated successfully.',
      agent: {
        id: updated.id,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
      },
    };
  }
}

