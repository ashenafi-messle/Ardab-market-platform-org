// ==============================================================================
// Ardab Market - Customer Code Sequence Generation Service
// ==============================================================================
// Atomically generates the next sequential human-readable customer code using
// the PostgreSQL sequence 'customer_code_seq'.
// Guarantees atomic uniqueness across concurrent registration requests.
// Format: CUST-XXXXXX (e.g. CUST-000001, CUST-000002)

import { prisma } from '../../shared/config/database.js';

/**
 * Atomically generates the next sequential customer code.
 *
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} dbClient
 * @returns {Promise<string>} Sequential customer code (e.g. CUST-000001)
 */
export async function generateNextCustomerCode(dbClient = prisma) {
  const result = await dbClient.$queryRawUnsafe("SELECT nextval('customer_code_seq') AS next_val");
  const nextVal = result[0]?.next_val ?? 1;
  const numStr = String(nextVal);
  const padded = numStr.padStart(6, '0');
  return `CUST-${padded}`;
}
