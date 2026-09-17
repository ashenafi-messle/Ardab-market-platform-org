// ==============================================================================
// Ardab Market - Deliveries Operational Metrics & KPI Aggregation Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';

/**
 * Computes live, dynamic delivery operational summary statistics.
 * Aggregated directly at the database level for performance.
 *
 * @param {string|null} city City name filter or null/All Cities
 * @returns {Promise<object>} Summary metrics
 */
export async function getDeliverySummary(city = null) {
  const cityFilter = city && city !== 'All Cities' ? { city: { equals: city, mode: 'insensitive' } } : {};

  // Compute start of current day in UTC/local context
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalDeliveries,
    pendingDeliveries,
    readyDeliveries,
    assignedDeliveries,
    outForDelivery,
    deliveredToday,
    failedDeliveries,
    cancelledDeliveries,
  ] = await Promise.all([
    // 1. Total Deliveries
    prisma.delivery.count({
      where: { ...cityFilter },
    }),

    // 2. Pending Fulfillment
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'PENDING',
      },
    }),

    // 3. Ready for Trip Assignment
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'READY_FOR_ASSIGNMENT',
      },
    }),

    // 4. Assigned to Trip
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'ASSIGNED',
      },
    }),

    // 5. Out for Delivery / In Transit
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'OUT_FOR_DELIVERY',
      },
    }),

    // 6. Delivered Today
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'DELIVERED',
        deliveredAt: { gte: startOfToday },
      },
    }),

    // 7. Failed Deliveries
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'FAILED',
      },
    }),

    // 8. Cancelled Deliveries
    prisma.delivery.count({
      where: {
        ...cityFilter,
        status: 'CANCELLED',
      },
    }),
  ]);

  return {
    totalDeliveries,
    pendingDeliveries,
    readyDeliveries,
    assignedDeliveries,
    outForDelivery,
    deliveredToday,
    failedDeliveries,
    cancelledDeliveries,
  };
}
