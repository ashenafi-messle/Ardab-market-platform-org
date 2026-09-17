// ==============================================================================
// Ardab Market - Item Code Sequence Generation Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';

/**
 * Atomically generates the next sequential item code using PostgreSQL sequence.
 * Guarantees uniqueness and concurrency safety across multiple processes.
 * Format: ARDAB-XXXXXX (e.g. ARDAB-000001, ARDAB-000002)
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} dbClient
 * @returns {Promise<string>} Sequential item code
 */
export async function generateNextItemCode(dbClient = prisma) {
  const result = await dbClient.$queryRawUnsafe("SELECT nextval('product_item_code_seq') AS next_val");
  const nextVal = result[0]?.next_val ?? 1;
  const numStr = String(nextVal);
  const padded = numStr.padStart(6, '0');
  return `ARDAB-${padded}`;
}
