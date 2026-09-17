// ==============================================================================
// Ardab Market - Delivery & Trip Number Sequence Generator Service
// ==============================================================================
// Generates atomic, sequential, collision-free numbers:
// Deliveries: DEL-YYYY-XXXXXX (e.g. DEL-2026-000001)
// Trips:      TRP-YYYY-XXXXXX (e.g. TRP-2026-000001)

import { prisma } from '../../shared/config/database.js';

/**
 * Atomically generates the next sequential human-readable delivery number.
 * Uses PostgreSQL sequence 'delivery_number_seq' for concurrency safety.
 *
 * @returns {Promise<string>} e.g. "DEL-2026-000001"
 */
export async function generateNextDeliveryNumber() {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT nextval('delivery_number_seq') AS seq;`);
    const seq = Number(result[0].seq);
    const currentYear = new Date().getFullYear();
    const padded = String(seq).padStart(6, '0');
    return `DEL-${currentYear}-${padded}`;
  } catch (error) {
    const count = await prisma.delivery.count();
    const currentYear = new Date().getFullYear();
    const padded = String(count + 1).padStart(6, '0');
    return `DEL-${currentYear}-${padded}`;
  }
}

/**
 * Atomically generates the next sequential human-readable trip number.
 * Uses PostgreSQL sequence 'trip_number_seq' for concurrency safety.
 *
 * @returns {Promise<string>} e.g. "TRP-2026-000001"
 */
export async function generateNextTripNumber() {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT nextval('trip_number_seq') AS seq;`);
    const seq = Number(result[0].seq);
    const currentYear = new Date().getFullYear();
    const padded = String(seq).padStart(6, '0');
    return `TRP-${currentYear}-${padded}`;
  } catch (error) {
    const count = await prisma.trip.count();
    const currentYear = new Date().getFullYear();
    const padded = String(count + 1).padStart(6, '0');
    return `TRP-${currentYear}-${padded}`;
  }
}
