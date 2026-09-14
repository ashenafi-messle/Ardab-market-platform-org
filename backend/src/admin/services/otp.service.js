// ==============================================================================
// Ardab Market - Reusable Admin OTP Service
// ==============================================================================
// Manages creation, secure SHA-256 storage, attempt tracking, and verification of OTPs.

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { USER_STATUS } from '../../shared/constants/statuses.js';
import { hashToken, generateNumericOtp, timingSafeEqual } from '../../shared/utils/crypto.js';
import { EmailService } from '../../shared/services/email/email.service.js';

const VALID_PURPOSES = [
  'LOGIN_VERIFICATION',
  'PASSWORD_RESET',
  'EMAIL_VERIFICATION',
  'SECURITY_VERIFICATION',
];

export class OtpService {
  /**
   * Generates and dispatches a 6-digit OTP code (Enumeration-safe)
   */
  static async requestOtp({ email, purpose = 'SECURITY_VERIFICATION', ipAddress }) {
    if (!VALID_PURPOSES.includes(purpose)) {
      throw ApiError.badRequest('Invalid OTP verification purpose.', 'INVALID_OTP_PURPOSE');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const genericSuccessResponse = {
      message: 'If an account exists with this email, a verification code has been sent.',
    };

    const admin = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin || admin.status !== USER_STATUS.ACTIVE) {
      logger.info('OTP requested for nonexistent or inactive account:', { email: normalizedEmail, purpose });
      return genericSuccessResponse;
    }

    // Invalidate previous unused OTPs for this admin and purpose
    await prisma.adminOtp.updateMany({
      where: { adminId: admin.id, purpose, usedAt: null },
      data: { usedAt: new Date() },
    }).catch(() => {});

    const otpCode = generateNumericOtp();
    const codeHash = hashToken(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.adminOtp.create({
      data: {
        adminId: admin.id,
        codeHash,
        purpose,
        expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'OTP_REQUESTED',
        entity: 'AdminOtp',
        entityId: admin.id,
        ipAddress,
        changesSummary: `OTP requested for purpose: ${purpose}`,
        status: 'SUCCESS',
      },
    });

    // Asynchronous email dispatch via EmailService (Brevo)
    EmailService.sendOtpEmail({
      toEmail: admin.email,
      name: admin.name,
      otpCode,
      purpose,
      expiresMinutes: 10,
    }).catch((err) => {
      logger.error('Failed to send OTP email via Brevo:', { error: err.message, email: admin.email });
    });

    return genericSuccessResponse;
  }

  /**
   * Verifies a 6-digit OTP code against stored codeHash
   */
  static async verifyOtp({ email, code, purpose = 'SECURITY_VERIFICATION', ipAddress }) {
    if (!VALID_PURPOSES.includes(purpose)) {
      throw ApiError.badRequest('Invalid OTP verification purpose.', 'INVALID_OTP_PURPOSE');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const admin = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin) {
      throw ApiError.badRequest('Invalid or expired verification code.', 'INVALID_OTP');
    }

    // Find latest active OTP record for this admin and purpose
    const otpRecord = await prisma.adminOtp.findFirst({
      where: {
        adminId: admin.id,
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw ApiError.badRequest('Invalid or expired verification code.', 'INVALID_OTP');
    }

    // Check maximum attempts limit (max 5 attempts)
    if (otpRecord.attempts >= 5) {
      await prisma.adminOtp.update({
        where: { id: otpRecord.id },
        data: { usedAt: new Date() },
      });
      throw ApiError.badRequest('Maximum verification attempts exceeded. Please request a new code.', 'OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    // Increment attempt counter
    await prisma.adminOtp.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    const candidateHash = hashToken(cleanCode);
    const isMatch = timingSafeEqual(candidateHash, otpRecord.codeHash);

    if (!isMatch) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'OTP_FAILED',
          entity: 'AdminOtp',
          entityId: otpRecord.id,
          ipAddress,
          changesSummary: `Failed OTP attempt for purpose: ${purpose}`,
          status: 'FAILED',
        },
      }).catch(() => {});

      throw ApiError.badRequest('Invalid verification code.', 'INVALID_OTP');
    }

    // Mark OTP as used on successful verification
    await prisma.adminOtp.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'OTP_VERIFIED',
        entity: 'AdminOtp',
        entityId: otpRecord.id,
        ipAddress,
        changesSummary: `Successfully verified OTP for purpose: ${purpose}`,
        status: 'SUCCESS',
      },
    });

    return {
      verified: true,
      purpose,
      message: 'Verification successful.',
    };
  }
}
