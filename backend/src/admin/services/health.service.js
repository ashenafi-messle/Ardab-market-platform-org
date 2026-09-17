// ==============================================================================
// Ardab Market - Admin Health & Readiness Service
// ==============================================================================
// Performs liveness and Neon PostgreSQL connectivity readiness checks.

import { prisma } from '../../shared/config/database.js';
import { logger } from '../../shared/utils/logger.js';

export async function checkSystemHealth() {
  const healthData = {
    api: 'ok',
    database: 'unknown',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  try {
    // Ping database with lightweight query and safe 3s timeout
    const pingPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timed out (6000ms)')), 6000)
    );

    await Promise.race([pingPromise, timeoutPromise]);
    healthData.database = 'connected';
    return {
      healthy: true,
      data: healthData,
    };
  } catch (err) {
    // Log the error securely without exposing credentials
    logger.error('Database health ping failed:', { error: err.message });
    healthData.database = 'unreachable';
    return {
      healthy: false,
      data: healthData,
      error: 'Database connection failed',
    };
  }
}

export function checkLiveness() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}

export async function checkReadiness() {
  const health = await checkSystemHealth();
  return {
    ready: health.healthy,
    database: health.data.database,
    timestamp: health.data.timestamp,
  };
}
