// ==============================================================================
// Ardab Market - Customer Mobile OTP Service
// ==============================================================================
// Manages 6-digit OTP generation, SHA-256 persistence, rate limiting, and verification.

import { prisma } from '../../shared/config/database.js';
import {
  generateNumericOtp,
  hashToken,
  generateRandomToken,
  timingSafeEqual,
} from '../../shared/utils/crypto.js';
import { EmailService } from '../../shared/services/email/email.service.js';
import { TelegramService } from '../../shared/services/telegram/telegram.service.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { AuthResponseCode } from '../utils/responseCodes.js';
import { logger } from '../../shared/utils/logger.js';

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export class MobileOtpService {
  /**
   * Generates and dispatches a 6-digit OTP to Email or Telegram
   */
  static async requestOtp({ target, channel, city = 'Gondar', purpose = 'EMAIL_VERIFICATION' }) {
    const cleanTarget = String(target).trim().toLowerCase();

    // 1. Resend Cooldown Check: Ensure last OTP for this target was requested at least 60s ago
    const recentOtp = await prisma.customerMobileOtp.findFirst({
      where: {
        target: cleanTarget,
        channel,
        purpose,
        createdAt: {
          gt: new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      throw ApiError.tooManyRequests(
        'Please wait before requesting another verification code.',
        AuthResponseCode.OTP_RATE_LIMITED
      );
    }

    // 2. Generate secure 6-digit OTP
    const rawOtp = generateNumericOtp();
    const codeHash = hashToken(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 3. Invalidate any existing active OTPs for this target & purpose
    await prisma.customerMobileOtp.updateMany({
      where: {
        target: cleanTarget,
        channel,
        purpose,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    }).catch(() => {});

    // 4. Save new OTP record
    const otpRecord = await prisma.customerMobileOtp.create({
      data: {
        target: cleanTarget,
        channel,
        codeHash,
        city,
        purpose,
        expiresAt,
        attempts: 0,
        isVerified: false,
      },
    });

    // 5. Dispatch OTP via requested channel
    if (channel === 'EMAIL') {
      try {
        await EmailService.sendOtpEmail({
          toEmail: cleanTarget,
          name: 'Ardab Customer',
          otpCode: rawOtp,
          purpose,
          expiresMinutes: OTP_EXPIRY_MINUTES,
        });
      } catch (err) {
        logger.error('Failed to send OTP email via Brevo:', { error: err.message, target: cleanTarget });
        // Clean up OTP record on delivery failure
        await prisma.customerMobileOtp.delete({ where: { id: otpRecord.id } }).catch(() => {});
        throw ApiError.internal('Unable to send verification email. Please try again later.');
      }
    } else if (channel === 'TELEGRAM') {
      // For Telegram, route through dedicated session handler
      return this.requestTelegramOtpSession({
        phone: cleanTarget,
        city,
        purpose,
      });
    }

    const botInfo = TelegramService.getBotInfo();

    return {
      success: true,
      target: cleanTarget,
      channel,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      botUsername: botInfo.username,
      botUrl: botInfo.url,
      ...(process.env.NODE_ENV === 'test' ? { devOtp: rawOtp } : {}),
    };
  }

  /**
   * Initiates or resends Telegram OTP session with deep-link start token
   */
  static async requestTelegramOtpSession({ phone, city = 'Gondar', purpose = 'SECURITY_VERIFICATION' }) {
    const cleanPhone = String(phone).trim();
    const now = Date.now();

    // 1. Locate active unconsumed session for this target
    const existingSession = await prisma.customerMobileOtp.findFirst({
      where: {
        target: cleanPhone,
        channel: 'TELEGRAM',
        purpose,
        consumedAt: null,
        isVerified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Enforce 60-second resend cooldown
    if (existingSession) {
      const lastAction = existingSession.updatedAt
        ? new Date(existingSession.updatedAt).getTime()
        : new Date(existingSession.createdAt).getTime();
      const secondsSince = (now - lastAction) / 1000;

      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        throw ApiError.tooManyRequests(
          'Please wait before requesting another verification code.',
          AuthResponseCode.OTP_RATE_LIMITED
        );
      }

      // If Telegram chat is already linked (customer tapped Start earlier and is now requesting resend):
      if (existingSession.telegramChatId) {
        const rawOtp = generateNumericOtp();
        const codeHash = hashToken(rawOtp);
        const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);

        await prisma.customerMobileOtp.update({
          where: { id: existingSession.id },
          data: {
            codeHash,
            expiresAt,
            attempts: 0,
            updatedAt: new Date(),
          },
        });

        // Dispatch directly to user's Telegram chat
        await TelegramService.sendOtpMessage(existingSession.telegramChatId, rawOtp, OTP_EXPIRY_MINUTES);

        const botInfo = TelegramService.getBotInfo();
        const botUrl = existingSession.telegramToken
          ? `${botInfo.url}?start=${existingSession.telegramToken}`
          : botInfo.url;

        logger.info('[Telegram Signup] resendOtpDispatchedDirectly=true', {
          chatId: existingSession.telegramChatId,
          target: cleanPhone,
        });

        return {
          success: true,
          target: cleanPhone,
          channel: 'TELEGRAM',
          expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
          cooldownSeconds: RESEND_COOLDOWN_SECONDS,
          botUsername: botInfo.username,
          botUrl,
          message: 'A new verification code has been sent to your Telegram bot.',
        };
      }
    }

    // 3. Invalidate previous pending sessions for this target & purpose
    await prisma.customerMobileOtp
      .updateMany({
        where: {
          target: cleanPhone,
          channel: 'TELEGRAM',
          purpose,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      })
      .catch(() => {});

    // 4. Create new pending Telegram verification session with opaque start token
    // Telegram start parameter accepts up to 64 alphanumeric characters
    const startToken = `tg_${generateRandomToken().slice(0, 32)}`;
    const placeholderHash = hashToken(`pending_${startToken}`);
    const sessionExpiresAt = new Date(now + 15 * 60 * 1000); // 15 minutes to start bot

    await prisma.customerMobileOtp.create({
      data: {
        target: cleanPhone,
        channel: 'TELEGRAM',
        codeHash: placeholderHash,
        city,
        purpose,
        telegramToken: startToken,
        expiresAt: sessionExpiresAt,
        attempts: 0,
        isVerified: false,
      },
    });

    const botInfo = TelegramService.getBotInfo();
    const deepLinkUrl = `${botInfo.url}?start=${startToken}`;

    logger.info('[Telegram Signup] pendingSessionCreated=true', {
      target: cleanPhone,
      city,
    });

    return {
      success: true,
      target: cleanPhone,
      channel: 'TELEGRAM',
      expiresInSeconds: 15 * 60,
      cooldownSeconds: RESEND_COOLDOWN_SECONDS,
      botUsername: botInfo.username,
      botUrl: deepLinkUrl,
      startToken,
      message: 'Telegram verification session created. Open the bot to receive your code.',
    };
  }

  /**
   * Verifies 6-digit OTP code submitted by customer
   */
  static async verifyOtp({ target, channel, otp, purpose }) {
    const cleanTarget = String(target).trim().toLowerCase();
    const cleanOtp = String(otp).trim();
    const resolvedPurpose = purpose || (channel === 'TELEGRAM' ? 'SECURITY_VERIFICATION' : 'EMAIL_VERIFICATION');

    // 1. Locate active OTP record
    const otpRecord = await prisma.customerMobileOtp.findFirst({
      where: {
        target: cleanTarget,
        channel,
        purpose: resolvedPurpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw ApiError.badRequest(
        'No active verification code found. Please request a new code.',
        AuthResponseCode.INVALID_OTP
      );
    }

    // 2. Check Expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await prisma.customerMobileOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      }).catch(() => {});
      throw ApiError.badRequest('Verification code has expired. Please request a new code.', AuthResponseCode.OTP_EXPIRED);
    }

    // 3. Check Attempt Limit
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.customerMobileOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      }).catch(() => {});
      throw ApiError.badRequest(
        'Too many incorrect attempts. Please request a new code.',
        AuthResponseCode.OTP_TOO_MANY_ATTEMPTS
      );
    }

    // 4. Verify Code via timing-safe hash comparison
    const submittedHash = hashToken(cleanOtp);
    const isMatch = timingSafeEqual(submittedHash, otpRecord.codeHash);

    if (!isMatch) {
      const nextAttempts = otpRecord.attempts + 1;
      const isExhausted = nextAttempts >= OTP_MAX_ATTEMPTS;

      await prisma.customerMobileOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts: nextAttempts,
          ...(isExhausted ? { consumedAt: new Date() } : {}),
        },
      });

      if (isExhausted) {
        throw ApiError.badRequest(
          'Too many incorrect attempts. Please request a new code.',
          AuthResponseCode.OTP_TOO_MANY_ATTEMPTS
        );
      }

      throw ApiError.badRequest(
        `Invalid verification code. ${OTP_MAX_ATTEMPTS - nextAttempts} attempts remaining.`,
        AuthResponseCode.INVALID_OTP
      );
    }

    // 5. Code is correct! Generate single-use verificationToken for password creation step
    const verificationToken = `vtok_${generateRandomToken()}`;
    const verificationTokenHash = hashToken(verificationToken);

    await prisma.customerMobileOtp.update({
      where: { id: otpRecord.id },
      data: {
        isVerified: true,
        consumedAt: new Date(),
        // Store verification ticket hash in codeHash field
        codeHash: verificationTokenHash,
        // Allow 15 minutes to set password
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    return {
      verified: true,
      target: cleanTarget,
      channel,
      city: otpRecord.city,
      verificationToken,
    };
  }

  /**
   * Consumes and verifies the temporary password creation ticket
   */
  static async consumeVerificationTicket(verificationToken) {
    if (!verificationToken || typeof verificationToken !== 'string') {
      throw ApiError.badRequest('Invalid verification token', AuthResponseCode.INVALID_TOKEN);
    }

    const tokenHash = hashToken(verificationToken.trim());

    const ticket = await prisma.customerMobileOtp.findFirst({
      where: {
        codeHash: tokenHash,
        isVerified: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!ticket) {
      throw ApiError.badRequest(
        'Verification session is invalid or has already been used.',
        AuthResponseCode.REGISTRATION_EXPIRED
      );
    }

    if (new Date() > new Date(ticket.expiresAt)) {
      throw ApiError.badRequest(
        'Verification session has expired. Please verify again.',
        AuthResponseCode.REGISTRATION_EXPIRED
      );
    }

    // Mark ticket consumed
    await prisma.customerMobileOtp.update({
      where: { id: ticket.id },
      data: {
        isVerified: false, // Invalidate ticket
        consumedAt: new Date(),
      },
    }).catch(() => {});

    return {
      target: ticket.target,
      channel: ticket.channel,
      city: ticket.city,
      purpose: ticket.purpose,
      telegramChatId: ticket.telegramChatId,
    };
  }
}
