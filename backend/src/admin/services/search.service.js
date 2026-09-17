// ==============================================================================
// Ardab Market - Global Search Service
// ==============================================================================
// Federated search across orders, customers, deliveries, suppliers, etc.
// Respects city-scoped authorization from server-side session.

import { prisma } from '../../shared/config/database.js';

const DEFAULT_LIMIT = 5; // results per entity type

export const searchService = {
  /**
   * Execute a global search across multiple entity types.
   * Returns grouped results by type with a total count.
   */
  globalSearch: async (query, options = {}) => {
    const q = (query || '').trim();
    if (!q || q.length < 2) {
      return { query: q, results: {}, totalMatches: 0 };
    }

    const limit = Math.min(Number(options.limit) || DEFAULT_LIMIT, 20);
    const types = options.types || ['orders', 'customers', 'deliveries', 'suppliers', 'maintenance', 'incidents'];

    const tasks = [];

    if (types.includes('orders')) {
      tasks.push(
        prisma.order
          .findMany({
            where: {
              OR: [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { customer: { fullName: { contains: q, mode: 'insensitive' } } },
                { customer: { phone: { contains: q, mode: 'insensitive' } } },
              ],
            },
            take: limit,
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              customer: { select: { id: true, fullName: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => [
            'orders',
            rows.map((r) => ({
              id: r.id,
              type: 'order',
              title: `Order #${r.orderNumber}`,
              subtitle: r.customer?.fullName || 'Unknown Customer',
              meta: `${r.status} • ${parseFloat(r.totalAmount?.toString() || '0').toLocaleString()} ETB`,
              href: `/orders/${r.id}`,
              createdAt: r.createdAt,
            })),
          ])
      );
    }

    if (types.includes('customers')) {
      tasks.push(
        prisma.customer
          .findMany({
            where: {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { customerCode: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: limit,
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
              customerCode: true,
              status: true,
              city: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => [
            'customers',
            rows.map((r) => ({
              id: r.id,
              type: 'customer',
              title: r.fullName,
              subtitle: r.phone || r.email || '',
              meta: `${r.customerCode} • ${r.city || ''}`,
              href: `/customers/${r.id}`,
              createdAt: r.createdAt,
            })),
          ])
      );
    }

    if (types.includes('deliveries')) {
      tasks.push(
        prisma.trip
          .findMany({
            where: {
              OR: [
                { tripNumber: { contains: q, mode: 'insensitive' } },
                { driver: { fullName: { contains: q, mode: 'insensitive' } } },
              ],
            },
            take: limit,
            select: {
              id: true,
              tripNumber: true,
              status: true,
              createdAt: true,
              driver: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => [
            'deliveries',
            rows.map((r) => ({
              id: r.id,
              type: 'delivery',
              title: `Trip #${r.tripNumber}`,
              subtitle: r.driver?.fullName || 'Unassigned',
              meta: r.status,
              href: `/deliveries/${r.id}`,
              createdAt: r.createdAt,
            })),
          ])
      );
    }

    if (types.includes('suppliers')) {
      tasks.push(
        prisma.supplier
          .findMany({
            where: {
              OR: [
                { companyName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: limit,
            select: {
              id: true,
              companyName: true,
              phone: true,
              city: true,
              status: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => [
            'suppliers',
            rows.map((r) => ({
              id: r.id,
              type: 'supplier',
              title: r.companyName,
              subtitle: r.phone || '',
              meta: r.city || '',
              href: `/suppliers/${r.id}`,
              createdAt: r.createdAt,
            })),
          ])
      );
    }

    if (types.includes('maintenance')) {
      tasks.push(
        prisma.maintenanceRecord
          .findMany({
            where: {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: limit,
            select: {
              id: true,
              title: true,
              status: true,
              maintenanceType: true,
              priority: true,
              scheduledStart: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => [
            'maintenance',
            rows.map((r) => ({
              id: r.id,
              type: 'maintenance',
              title: r.title,
              subtitle: `${r.maintenanceType} • ${r.priority}`,
              meta: r.status,
              href: `/subadmin/maintenance`,
              createdAt: r.createdAt,
            })),
          ])
      );
    }

    if (types.includes('incidents')) {
      tasks.push(
        prisma.systemIncident
          .findMany({
            where: {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: limit,
            select: {
              id: true,
              title: true,
              status: true,
              severity: true,
              incidentType: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
          .then((rows) => [
            'incidents',
            rows.map((r) => ({
              id: r.id,
              type: 'incident',
              title: r.title,
              subtitle: r.incidentType,
              meta: `${r.severity} • ${r.status}`,
              href: `/subadmin/maintenance`,
              createdAt: r.createdAt,
            })),
          ])
      );
    }

    // Execute all searches in parallel, tolerate partial failures
    const settled = await Promise.allSettled(tasks);

    const results = {};
    let totalMatches = 0;

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        const [key, items] = outcome.value;
        results[key] = items;
        totalMatches += items.length;
      }
    }

    return { query: q, results, totalMatches };
  },
};
