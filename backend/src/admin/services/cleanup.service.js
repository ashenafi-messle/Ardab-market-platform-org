// ==============================================================================
// Ardab Market - Database Security Token Cleanup Service
// ==============================================================================
// Sweeps database to clean up expired sessions, used reset tokens, and expired OTPs.

import { prisma } from '../../shared/config/database.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Runs database cleanup for expired security tokens and sessions
 */
export async function cleanupExpiredSecurityTokens() {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    const expiredSessions = await prisma.adminSession.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    const deletedResetTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { usedAt: { lt: cutoffTime } },
          { expiresAt: { lt: cutoffTime } },
        ],
      },
    });

    const deletedOtps = await prisma.adminOtp.deleteMany({
      where: {
        OR: [
          { usedAt: { lt: cutoffTime } },
          { expiresAt: { lt: cutoffTime } },
        ],
      },
    });

    logger.info('Security token database cleanup completed:', {
      sessionsExpired: expiredSessions.count,
      resetTokensDeleted: deletedResetTokens.count,
      otpsDeleted: deletedOtps.count,
    });

    return {
      sessionsExpired: expiredSessions.count,
      resetTokensDeleted: deletedResetTokens.count,
      otpsDeleted: deletedOtps.count,
    };
  } catch (error) {
    logger.error('Error executing database security token cleanup:', { error: error.message });
    throw error;
  }
}
