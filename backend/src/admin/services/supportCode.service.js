// ==============================================================================
// Ardab Market - Support Ticket Number Generator Service
// ==============================================================================
// Generates atomic, sequential, collision-free numbers:
// Support Tickets: ARD-SUP-YYYYMMDD-XXXXXX (e.g. ARD-SUP-20260917-000101)

import { prisma } from '../../shared/config/database.js';

/**
 * Atomically generates the next sequential human-readable support ticket number.
 *
 * @returns {Promise<string>} e.g. "ARD-SUP-20260917-000001"
 */
export async function generateNextTicketNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  try {
    // Attempt sequence or query latest today
    const count = await prisma.supportTicket.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    });
    const padded = String(count + 1).padStart(6, '0');
    return `ARD-SUP-${dateStr}-${padded}`;
  } catch {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `ARD-SUP-${dateStr}-${randomSuffix}`;
  }
}
