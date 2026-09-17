// ==============================================================================
// Ardab Market - Automatic Customer Experience Metrics Service
// ==============================================================================
// CRITICAL BUSINESS REQUIREMENT:
// The metrics:
//   - totalOrders
//   - totalSpent
//   - totalScore
// are strictly SYSTEM-GENERATED from authoritative platform records (Orders,
// Payments/Transactions, Score Events).
// They are NEVER manually entered, edited, or supplied by Super Admin or frontend.
//
// This service provides high-performance batched database aggregation to
// completely eliminate N+1 query bottlenecks on the Customers page.

import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/config/database.js';

/**
 * Calculates system-generated experience metrics for a single customer.
 *
 * @param {string} customerId - Customer UUID
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} dbClient
 * @returns {Promise<{ totalOrders: number, completedOrders: number, cancelledOrders: number, totalSpent: string, totalScore: number }>}
 */
export async function getCustomerMetrics(customerId, dbClient = prisma) {
  if (!customerId) {
    return {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpent: '0.00',
      totalScore: 0,
    };
  }

  const [orderStatsResult, scoreResult] = await Promise.all([
    dbClient.$queryRaw`
      SELECT 
        COUNT(*)::int AS "totalOrders",
        COUNT(CASE WHEN "status" = 'DELIVERED' THEN 1 END)::int AS "completedOrders",
        COUNT(CASE WHEN "status" = 'CANCELLED' THEN 1 END)::int AS "cancelledOrders",
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' AND "status" != 'CANCELLED' THEN "totalAmount" ELSE 0 END), 0)::numeric(12,2)::text AS "totalSpent"
      FROM "orders"
      WHERE "customerId" = ${customerId}
    `,
    dbClient.$queryRaw`
      SELECT 
        COALESCE(SUM("points"), 0)::int AS "totalScore"
      FROM "customer_score_events"
      WHERE "customerId" = ${customerId}
    `,
  ]);

  const orderStats = orderStatsResult[0] || {};
  const scoreStats = scoreResult[0] || {};

  return {
    totalOrders: orderStats.totalOrders || 0,
    completedOrders: orderStats.completedOrders || 0,
    cancelledOrders: orderStats.cancelledOrders || 0,
    totalSpent: orderStats.totalSpent || '0.00',
    totalScore: scoreStats.totalScore || 0,
  };
}

/**
 * Batched aggregation to calculate experience metrics for a list of customers.
 * Completely eliminates N+1 query patterns:
 * Instead of (N * 3) queries, executes exactly 2 SQL grouped queries across all IDs.
 *
 * @param {string[]} customerIds - Array of customer UUIDs
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} dbClient
 * @returns {Promise<Map<string, { totalOrders: number, completedOrders: number, cancelledOrders: number, totalSpent: string, totalScore: number }>>}
 */
export async function getCustomerListMetrics(customerIds, dbClient = prisma) {
  const metricsMap = new Map();

  if (!customerIds || customerIds.length === 0) {
    return metricsMap;
  }

  // Pre-fill defaults for every requested customerId
  for (const id of customerIds) {
    metricsMap.set(id, {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalSpent: '0.00',
      totalScore: 0,
    });
  }

  const [orderStatsList, scoreStatsList] = await Promise.all([
    dbClient.$queryRaw`
      SELECT 
        "customerId",
        COUNT(*)::int AS "totalOrders",
        COUNT(CASE WHEN "status" = 'DELIVERED' THEN 1 END)::int AS "completedOrders",
        COUNT(CASE WHEN "status" = 'CANCELLED' THEN 1 END)::int AS "cancelledOrders",
        COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAID' AND "status" != 'CANCELLED' THEN "totalAmount" ELSE 0 END), 0)::numeric(12,2)::text AS "totalSpent"
      FROM "orders"
      WHERE "customerId" IN (${Prisma.join(customerIds)})
      GROUP BY "customerId"
    `,
    dbClient.$queryRaw`
      SELECT 
        "customerId",
        COALESCE(SUM("points"), 0)::int AS "totalScore"
      FROM "customer_score_events"
      WHERE "customerId" IN (${Prisma.join(customerIds)})
      GROUP BY "customerId"
    `,
  ]);

  for (const row of orderStatsList) {
    const existing = metricsMap.get(row.customerId) || {};
    metricsMap.set(row.customerId, {
      ...existing,
      totalOrders: row.totalOrders || 0,
      completedOrders: row.completedOrders || 0,
      cancelledOrders: row.cancelledOrders || 0,
      totalSpent: row.totalSpent || '0.00',
    });
  }

  for (const row of scoreStatsList) {
    const existing = metricsMap.get(row.customerId) || {};
    metricsMap.set(row.customerId, {
      ...existing,
      totalScore: row.totalScore || 0,
    });
  }

  return metricsMap;
}

/**
 * Calculates dynamic aggregate summary stats for the top summary cards on the Customers page.
 * Uses a single aggregated SQL query for maximum efficiency.
 *
 * @param {import('@prisma/client').PrismaClient} dbClient
 * @returns {Promise<{ totalCustomers: number, activeCustomers: number, newCustomers: number, verifiedCustomers: number }>}
 */
export async function getCustomerSummary(dbClient = prisma) {
  const result = await dbClient.$queryRaw`
    SELECT 
      COUNT(*)::int AS "totalCustomers",
      COUNT(CASE WHEN "status" = 'ACTIVE' THEN 1 END)::int AS "activeCustomers",
      COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END)::int AS "newCustomers",
      COUNT(CASE WHEN "verificationStatus" = 'VERIFIED' THEN 1 END)::int AS "verifiedCustomers"
    FROM "customers"
  `;

  const summary = result[0] || {};
  return {
    totalCustomers: summary.totalCustomers || 0,
    activeCustomers: summary.activeCustomers || 0,
    newCustomers: summary.newCustomers || 0,
    verifiedCustomers: summary.verifiedCustomers || 0,
  };
}
