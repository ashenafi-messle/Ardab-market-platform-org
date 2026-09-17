// ==============================================================================
// Ardab Market - Incoming Orders Metrics & Aggregations Service
// ==============================================================================
// Executes high-performance, single-query aggregations for Super Admin KPI cards.
// Strictly avoids N+1 query overhead.

import { prisma } from '../../shared/config/database.js';

/**
 * Retrieves dynamic summary metrics for Incoming Orders.
 * Supports filtering by operational city.
 *
 * @param {string|null} city e.g. "Gondar", "Bahir Dar", "Addis Ababa" or null/"All Cities"
 * @returns {Promise<{ totalOrders: number, pendingOrders: number, processingOrders: number, todayOrders: number, confirmedOrders: number, readyOrders: number }>}
 */
export async function getOrderSummary(city = null) {
  const cityFilter = city && city !== 'All Cities' ? city : null;

  const results = await prisma.$queryRaw`
    SELECT 
      COUNT(*)::int AS "totalOrders",
      COUNT(CASE WHEN "status" = 'PENDING' THEN 1 END)::int AS "pendingOrders",
      COUNT(CASE WHEN "status" = 'PROCESSING' THEN 1 END)::int AS "processingOrders",
      COUNT(CASE WHEN "placedAt" >= DATE_TRUNC('day', NOW()) THEN 1 END)::int AS "todayOrders",
      COUNT(CASE WHEN "status" = 'CONFIRMED' THEN 1 END)::int AS "confirmedOrders",
      COUNT(CASE WHEN "status" = 'READY_FOR_DELIVERY' THEN 1 END)::int AS "readyOrders"
    FROM "orders"
    WHERE (${cityFilter}::text IS NULL OR "city" = ${cityFilter}::text)
  `;

  const row = results[0] || {};

  return {
    totalOrders: row.totalOrders || 0,
    pendingOrders: row.pendingOrders || 0,
    processingOrders: row.processingOrders || 0,
    todayOrders: row.todayOrders || 0,
    confirmedOrders: row.confirmedOrders || 0,
    readyOrders: row.readyOrders || 0,
  };
}
