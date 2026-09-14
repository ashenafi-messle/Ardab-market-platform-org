// ==============================================================================
// Ardab Market - Centralized Prisma Database Client
// ==============================================================================
// Singleton Prisma Client instance designed for PostgreSQL hosted on Neon.
// Prevents connection pool exhaustion in development and serverless environments.

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Global variable cache for development hot-reloading
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      env.IS_DEVELOPMENT
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : ['error'],
  });

if (env.IS_DEVELOPMENT) {
  // Query performance logging in development
  prisma.$on('query', (e) => {
    // Only log slower queries or general activity in debug mode
    if (e.duration > 200) {
      logger.warn(`Slow Database Query (${e.duration}ms)`, { query: e.query });
    }
  });

  globalForPrisma.prisma = prisma;
}

/**
 * Cleanly disconnects the database client on shutdown
 */
export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
    logger.info('Database client disconnected cleanly.');
  } catch (error) {
    logger.error('Error disconnecting database client:', { error: error.message });
  }
}
