// ==============================================================================
// Ardab Market - Customer Mobile Authentication Service
// ==============================================================================
// Isolated mobile customer authentication logic operating on shared Customer database.

import bcrypt from 'bcryptjs';
import { prisma } from '../../shared/config/database.js';
import { normalizeEthiopianPhone } from '../../shared/utils/phone.util.js';
import { generateNextCustomerCode } from '../../admin/services/customerCode.service.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { AuthResponseCode } from '../utils/responseCodes.js';
import { MobileOtpService } from './otp.service.js';
import { MobileSessionService } from './session.service.js';
import {
  hashToken,
  generateRandomToken,
  generateNumericOtp,
  timingSafeEqual,
} from '../../shared/utils/crypto.js';
import { TelegramService } from '../../shared/services/telegram/telegram.service.js';
import { logger } from '../../shared/utils/logger.js';
import { startBackendPerf } from '../../shared/utils/perfTracker.js';

const BCRYPT_SALT_ROUNDS = 12;

export class MobileAuthService {
  /**
   * Safe customer projection excluding sensitive hashes
   */
  static formatSafeCustomer(customer) {
    return {
      id: customer.id,
      customerCode: customer.customerCode,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      city: customer.city,
      deliveryZone: customer.deliveryZone,
      profileImageUrl: customer.profileImageUrl,
      telegramUserId: customer.telegramUserId,
      status: customer.status,
      verificationStatus: customer.verificationStatus,
      emailVerified: customer.verificationStatus === 'VERIFIED' && Boolean(customer.email),
      phoneVerified: customer.verificationStatus === 'VERIFIED' && Boolean(customer.phone),
      createdAt: customer.createdAt,
      lastActivityAt: customer.lastActivityAt,
    };
  }

  // ----------------------------------------------------------------------------
  // Registration Method A — Email
  // ----------------------------------------------------------------------------

  static async startEmailRegistration({ email, city, deliveryZone }) {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if email already belongs to an existing Customer
    const existingCustomer = await prisma.customer.findFirst({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (existingCustomer) {
      throw ApiError.conflict(
        'An account with this email address already exists. Please sign in.',
        AuthResponseCode.EMAIL_ALREADY_EXISTS
      );
    }

    // 2. Dispatch 6-digit OTP
    return MobileOtpService.requestOtp({
      target: cleanEmail,
      channel: 'EMAIL',
      city: city || 'Gondar',
      purpose: 'EMAIL_VERIFICATION',
    });
  }

  static async verifyEmailRegistration({ email, otp }) {
    const cleanEmail = email.trim().toLowerCase();
    return MobileOtpService.verifyOtp({
      target: cleanEmail,
      channel: 'EMAIL',
      otp,
      purpose: 'EMAIL_VERIFICATION',
    });
  }

  // ----------------------------------------------------------------------------
  // Registration Method B — Telegram
  // ----------------------------------------------------------------------------

  static async startTelegramRegistration({ phone, city, telegramUserId, deliveryZone }) {
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized.isValid) {
      throw ApiError.badRequest('Please enter a valid Ethiopian phone number.', AuthResponseCode.INVALID_PHONE);
    }

    // 1. Check if phone number already belongs to an existing Customer
    const existingPhone = await prisma.customer.findFirst({
      where: {
        phone: { in: normalized.variants },
      },
      select: { id: true },
    });

    if (existingPhone) {
      throw ApiError.conflict(
        'An account with this phone number already exists. Please sign in.',
        AuthResponseCode.PHONE_ALREADY_EXISTS
      );
    }

    // 2. Check if telegramUserId is already linked to another Customer
    if (telegramUserId) {
      const existingTg = await prisma.customer.findUnique({
        where: { telegramUserId: String(telegramUserId) },
        select: { id: true },
      });
      if (existingTg) {
        throw ApiError.conflict(
          'This Telegram account is already associated with an Ardab Market account.',
          AuthResponseCode.TELEGRAM_ALREADY_EXISTS
        );
      }
    }

    // 3. Cooldown check: prevent duplicate rapid button double-tapping
    const recentSession = await prisma.telegramSignupSession.findFirst({
      where: {
        phone: normalized.e164,
        status: { in: ['PENDING_BOT_START', 'BOT_STARTED', 'OTP_SENT'] },
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentSession) {
      const lastCreated = new Date(recentSession.createdAt).getTime();
      const secondsLeft = Math.ceil(60 - (Date.now() - lastCreated) / 1000);
      throw ApiError.tooManyRequests(
        `Please wait ${secondsLeft > 0 ? secondsLeft : 1}s before requesting another session.`,
        AuthResponseCode.OTP_RATE_LIMITED
      );
    }

    // 4. Invalidate older pending sessions for this target phone
    await prisma.telegramSignupSession.updateMany({
      where: {
        phone: normalized.e164,
        status: { in: ['PENDING_BOT_START', 'BOT_STARTED', 'OTP_SENT'] },
      },
      data: { status: 'EXPIRED' },
    }).catch(() => {});

    // 5. Generate cryptographically secure random token (64 hex characters)
    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes to start bot

    const session = await prisma.telegramSignupSession.create({
      data: {
        phone: normalized.e164,
        city: city || 'Gondar',
        tokenHash,
        status: 'PENDING_BOT_START',
        expiresAt: sessionExpiresAt,
        otpAttempts: 0,
      },
    });

    const botInfo = TelegramService.getBotInfo();
    const deepLinkUrl = `${botInfo.url}?start=${rawToken}`;

    logger.info('[Telegram Signup] pendingSessionCreated=true', {
      sessionId: session.id,
      phone: normalized.e164,
      city,
    });

    return {
      success: true,
      sessionId: session.id,
      telegramUrl: deepLinkUrl,
      botUrl: deepLinkUrl,
      botUsername: botInfo.username,
      expiresInSeconds: 15 * 60,
      status: 'PENDING_BOT_START',
      message: "Open the Ardab Telegram Bot and tap 'Start' to receive your verification code.",
    };
  }

  static async getTelegramSignupStatus(sessionId) {
    if (!sessionId) {
      throw ApiError.badRequest('Session ID is required', AuthResponseCode.MISSING_REQUIRED_FIELD);
    }

    const session = await prisma.telegramSignupSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw ApiError.notFound('Telegram signup session not found', AuthResponseCode.NOT_FOUND);
    }

    const now = new Date();
    let currentStatus = session.status;
    if (now > new Date(session.expiresAt) && currentStatus !== 'VERIFIED') {
      currentStatus = 'EXPIRED';
      if (session.status !== 'EXPIRED') {
        await prisma.telegramSignupSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        }).catch(() => {});
      }
    }

    return {
      sessionId: session.id,
      status: currentStatus,
      phone: session.phone,
      city: session.city,
      expiresAt: session.expiresAt,
    };
  }

  static async resendTelegramOtp({ sessionId, phone }) {
    let session = null;
    if (sessionId) {
      session = await prisma.telegramSignupSession.findUnique({
        where: { id: sessionId },
      });
    }

    if (!session && phone) {
      const normalized = normalizeEthiopianPhone(phone);
      const searchTarget = normalized.isValid ? normalized.e164 : phone.trim();
      session = await prisma.telegramSignupSession.findFirst({
        where: {
          phone: searchTarget,
          status: { in: ['OTP_SENT', 'BOT_STARTED'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!session || session.status === 'VERIFIED') {
      throw ApiError.badRequest(
        'No active Telegram verification session found. Please start registration again.',
        AuthResponseCode.INVALID_OTP
      );
    }

    if (new Date() > new Date(session.expiresAt)) {
      throw ApiError.badRequest(
        'Verification session has expired. Please restart registration.',
        AuthResponseCode.OTP_EXPIRED
      );
    }

    if (!session.telegramChatId) {
      throw ApiError.badRequest(
        "Please open the Telegram bot and tap 'Start' first to receive your verification code.",
        AuthResponseCode.BOT_NOT_STARTED
      );
    }

    const now = Date.now();
    const lastAction = session.lastResentAt
      ? new Date(session.lastResentAt).getTime()
      : new Date(session.updatedAt).getTime();
    const secondsSince = (now - lastAction) / 1000;

    if (secondsSince < 60) {
      const waitSec = Math.ceil(60 - secondsSince);
      throw ApiError.tooManyRequests(
        `Please wait ${waitSec}s before requesting a new code.`,
        AuthResponseCode.OTP_RATE_LIMITED
      );
    }

    const rawOtp = generateNumericOtp();
    const otpHash = hashToken(rawOtp);
    const otpExpiresAt = new Date(now + 10 * 60 * 1000);

    await prisma.telegramSignupSession.update({
      where: { id: session.id },
      data: {
        otpHash,
        otpExpiresAt,
        otpAttempts: 0,
        status: 'OTP_SENT',
        lastResentAt: new Date(),
      },
    });

    const sendRes = await TelegramService.sendOtpMessage(session.telegramChatId, rawOtp, 10);
    if (!sendRes.success) {
      logger.error('[Telegram Signup] resendOtpFailed', {
        chatId: session.telegramChatId,
        error: sendRes.error,
      });
      throw ApiError.internal('Unable to send code to Telegram. Please check Telegram bot.');
    }

    logger.info('[Telegram Signup] resendOtpSent=true', {
      chatId: session.telegramChatId,
      sessionId: session.id,
    });

    return {
      success: true,
      message: 'Verification code resent to your Telegram account.',
      status: 'OTP_SENT',
    };
  }

  static async verifyTelegramRegistration({ sessionId, phone, otp, fullName, password, deviceInfo }) {
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp) {
      throw ApiError.badRequest('Verification code is required.', AuthResponseCode.MISSING_REQUIRED_FIELD);
    }

    let session = null;
    if (sessionId) {
      session = await prisma.telegramSignupSession.findUnique({
        where: { id: sessionId },
      });
    }

    if (!session && phone) {
      const normalized = normalizeEthiopianPhone(phone);
      const searchTarget = normalized.isValid ? normalized.e164 : phone.trim();
      session = await prisma.telegramSignupSession.findFirst({
        where: {
          phone: searchTarget,
          status: { in: ['OTP_SENT', 'BOT_STARTED', 'PENDING_BOT_START'] },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Fallback: If not found in telegramSignupSession, check legacy customerMobileOtp
    if (!session) {
      const normalized = normalizeEthiopianPhone(phone || '');
      const target = normalized.isValid ? normalized.e164 : (phone ? phone.trim() : '');
      if (target) {
        return MobileOtpService.verifyOtp({
          target,
          channel: 'TELEGRAM',
          otp: cleanOtp,
          purpose: 'SECURITY_VERIFICATION',
        });
      }
      throw ApiError.badRequest(
        'No active verification code found. Please request a new code.',
        AuthResponseCode.INVALID_OTP
      );
    }

    if (session.status === 'VERIFIED') {
      const customer = await prisma.customer.findFirst({
        where: { phone: session.phone },
      });
      if (customer) {
        const sessionData = await MobileSessionService.createSession(customer.id, deviceInfo);
        return {
          verified: true,
          customer: sessionData.customer,
          user: sessionData.customer,
          accessToken: sessionData.accessToken,
          refreshToken: sessionData.refreshToken,
          token: sessionData.accessToken,
          verificationToken: `vtok_${generateRandomToken()}`,
          message: 'Telegram verified successfully.',
        };
      }
    }

    const now = new Date();
    if (now > new Date(session.expiresAt) || (session.otpExpiresAt && now > new Date(session.otpExpiresAt))) {
      await prisma.telegramSignupSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      }).catch(() => {});
      throw ApiError.badRequest('Verification code has expired. Please request a new code.', AuthResponseCode.OTP_EXPIRED);
    }

    if (session.otpAttempts >= 5) {
      await prisma.telegramSignupSession.update({
        where: { id: session.id },
        data: { status: 'FAILED' },
      }).catch(() => {});
      throw ApiError.badRequest(
        'Too many incorrect attempts. Please request a new code.',
        AuthResponseCode.OTP_TOO_MANY_ATTEMPTS
      );
    }

    if (!session.otpHash) {
      throw ApiError.badRequest(
        "Please open the Telegram bot and tap 'Start' first.",
        AuthResponseCode.BOT_NOT_STARTED
      );
    }

    const submittedHash = hashToken(cleanOtp);
    const isMatch = timingSafeEqual(submittedHash, session.otpHash);

    if (!isMatch) {
      const nextAttempts = session.otpAttempts + 1;
      const isExhausted = nextAttempts >= 5;

      await prisma.telegramSignupSession.update({
        where: { id: session.id },
        data: {
          otpAttempts: nextAttempts,
          ...(isExhausted ? { status: 'FAILED' } : {}),
        },
      });

      if (isExhausted) {
        throw ApiError.badRequest(
          'Too many incorrect attempts. Please request a new code.',
          AuthResponseCode.OTP_TOO_MANY_ATTEMPTS
        );
      }

      throw ApiError.badRequest(
        `Invalid verification code. ${5 - nextAttempts} attempts remaining.`,
        AuthResponseCode.INVALID_OTP
      );
    }

    // Step 16-18: Verification Succeeded -> Atomically create customer + auth session
    const passwordHash = password ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS) : null;
    const customerName = fullName?.trim() || session.telegramUsername || `Customer ${session.phone.slice(-4)}`;

    const customer = await prisma.$transaction(async (tx) => {
      const norm = normalizeEthiopianPhone(session.phone);
      const searchPhones = norm.isValid ? norm.variants : [session.phone];

      let existingCustomer = await tx.customer.findFirst({
        where: { phone: { in: searchPhones } },
      });

      if (!existingCustomer && session.telegramUserId) {
        existingCustomer = await tx.customer.findUnique({
          where: { telegramUserId: session.telegramUserId },
        });
      }

      if (existingCustomer) {
        if (session.telegramUserId && !existingCustomer.telegramUserId) {
          existingCustomer = await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              telegramUserId: session.telegramUserId,
              verificationStatus: 'VERIFIED',
              lastActivityAt: new Date(),
            },
          });
        }
      } else {
        const customerCode = await generateNextCustomerCode(tx);

        existingCustomer = await tx.customer.create({
          data: {
            customerCode,
            fullName: customerName,
            phone: session.phone,
            city: session.city || 'Gondar',
            telegramUserId: session.telegramUserId || null,
            passwordHash,
            verificationStatus: 'VERIFIED',
            status: 'ACTIVE',
            lastActivityAt: new Date(),
          },
        });
      }

      await tx.telegramSignupSession.update({
        where: { id: session.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });

      return existingCustomer;
    }, {
      maxWait: 10000, // 10 seconds max wait to acquire connection from pool
      timeout: 25000, // 25 seconds timeout to allow for network latency with remote Neon DB
    });

    const sessionData = await MobileSessionService.createSession(customer.id, deviceInfo);
    const verificationToken = `vtok_${generateRandomToken()}`;
    const verificationTokenHash = hashToken(verificationToken);

    await prisma.customerMobileOtp.create({
      data: {
        target: session.phone,
        channel: 'TELEGRAM',
        codeHash: verificationTokenHash,
        city: session.city || 'Gondar',
        purpose: 'SECURITY_VERIFICATION',
        attempts: 0,
        isVerified: true,
        telegramChatId: session.telegramChatId || null,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    }).catch(() => {});

    return {
      verified: true,
      customer: sessionData.customer,
      user: sessionData.customer,
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      token: sessionData.accessToken,
      verificationToken,
      message: 'Telegram identity verified successfully.',
    };
  }

  // ----------------------------------------------------------------------------
  // Password Creation & Permanent Customer Creation
  // ----------------------------------------------------------------------------

  static async setPasswordAndCreateAccount({
    verificationToken,
    password,
    fullName,
    deliveryZone,
    deviceInfo,
  }) {
    // 1. Consume temporary verification ticket
    const ticket = await MobileOtpService.consumeVerificationTicket(verificationToken);

    // 2. Hash password securely using bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // 3. Determine registration identity attributes
    const isEmail = ticket.channel === 'EMAIL';
    const email = isEmail ? ticket.target : null;
    const phone = isEmail ? `+2519${Date.now().toString().slice(-8)}` : ticket.target;

    // Derived display name
    const customerName = fullName?.trim() || (
      isEmail
        ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : `Customer ${phone.slice(-4)}`
    );

    // 4. Atomically verify uniqueness and insert permanent Customer record
    const customer = await prisma.$transaction(async (tx) => {
      // Re-verify uniqueness inside transaction to prevent race conditions
      if (email) {
        const dupEmail = await tx.customer.findFirst({ where: { email } });
        if (dupEmail) {
          throw ApiError.conflict('An account with this email already exists.', AuthResponseCode.EMAIL_ALREADY_EXISTS);
        }
      }

      if (!isEmail) {
        const norm = normalizeEthiopianPhone(phone);
        const dupPhone = await tx.customer.findFirst({
          where: { phone: { in: norm.variants } },
        });
        if (dupPhone) {
          if (!dupPhone.passwordHash) {
            return tx.customer.update({
              where: { id: dupPhone.id },
              data: {
                passwordHash,
                fullName: fullName?.trim() || dupPhone.fullName,
                deliveryZone: deliveryZone?.trim() || dupPhone.deliveryZone,
                lastActivityAt: new Date(),
              },
            });
          }
          throw ApiError.conflict('An account with this phone already exists.', AuthResponseCode.PHONE_ALREADY_EXISTS);
        }
      }

      const customerCode = await generateNextCustomerCode(tx);

      return tx.customer.create({
        data: {
          customerCode,
          fullName: customerName,
          email,
          phone,
          passwordHash,
          city: ticket.city || 'Gondar',
          deliveryZone: deliveryZone?.trim() || null,
          telegramUserId: ticket.telegramChatId || null,
          verificationStatus: 'VERIFIED',
          status: 'ACTIVE',
          lastActivityAt: new Date(),
        },
      });
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    // 5. Create mobile session with access and refresh tokens
    const session = await MobileSessionService.createSession(customer.id, deviceInfo);

    return {
      message: 'Account created successfully.',
      ...session,
    };
  }

  // ----------------------------------------------------------------------------
  // Mobile Sign In (Email OR Phone + Password)
  // ----------------------------------------------------------------------------

  static async login({ identifier, password, deviceInfo }) {
    const perf = startBackendPerf('auth/login');
    const cleanId = String(identifier).trim();
    const isEmail = cleanId.includes('@');

    const customerSelect = {
      id: true,
      customerCode: true,
      fullName: true,
      phone: true,
      email: true,
      passwordHash: true,
      city: true,
      profileImageUrl: true,
      status: true,
      verificationStatus: true,
      createdAt: true,
    };

    let customer = null;
    if (isEmail) {
      customer = await prisma.customer.findFirst({
        where: { email: cleanId.toLowerCase() },
        select: customerSelect,
      });
    } else {
      const normalized = normalizeEthiopianPhone(cleanId);
      const searchPhones = normalized.isValid ? normalized.variants : [cleanId];
      customer = await prisma.customer.findFirst({
        where: { phone: { in: searchPhones } },
        select: customerSelect,
      });
    }

    perf.checkpoint('db_lookup');

    if (!customer || !customer.passwordHash) {
      perf.end({ status: 'invalid_credentials' });
      throw ApiError.unauthorized('Invalid email, phone, or password.', AuthResponseCode.INVALID_CREDENTIALS);
    }

    if (customer.status === 'SUSPENDED') {
      perf.end({ status: 'suspended' });
      throw ApiError.forbidden(
        'Your customer account has been suspended. Please contact support.',
        AuthResponseCode.ACCOUNT_SUSPENDED
      );
    }

    if (customer.status === 'INACTIVE') {
      perf.end({ status: 'inactive' });
      throw ApiError.forbidden('Your customer account is inactive.', AuthResponseCode.ACCOUNT_INACTIVE);
    }

    // Verify bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, customer.passwordHash);
    perf.checkpoint('bcrypt_verify');

    if (!isPasswordValid) {
      perf.end({ status: 'invalid_password' });
      throw ApiError.unauthorized('Invalid email, phone, or password.', AuthResponseCode.INVALID_CREDENTIALS);
    }

    // Update last activity timestamp asynchronously without blocking session response
    prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    }).catch(() => {});

    // Create session passing pre-queried customer directly to eliminate duplicate findUnique
    const sessionResult = await MobileSessionService.createSession(customer, deviceInfo, { isLogin: true });
    perf.checkpoint('session_create');
    perf.end({ customerId: customer.id, success: true });

    return sessionResult;
  }

  // ----------------------------------------------------------------------------
  // Token Refresh & Sign Out
  // ----------------------------------------------------------------------------

  static async refresh(refreshToken, deviceInfo) {
    return MobileSessionService.refreshSession(refreshToken, deviceInfo);
  }

  static async logout(refreshToken) {
    return MobileSessionService.revokeSession(refreshToken);
  }

  // ----------------------------------------------------------------------------
  // Authenticated Current Customer (/me)
  // ----------------------------------------------------------------------------

  static async getMe(customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        customerCode: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        deliveryZone: true,
        profileImageUrl: true,
        telegramUserId: true,
        status: true,
        verificationStatus: true,
        createdAt: true,
        lastActivityAt: true,
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found', AuthResponseCode.CUSTOMER_NOT_FOUND);
    }

    return this.formatSafeCustomer(customer);
  }

  // ----------------------------------------------------------------------------
  // Forgot Password & Reset
  // ----------------------------------------------------------------------------

  static async forgotPassword({ identifier }) {
    const cleanId = String(identifier).trim();
    const isEmail = cleanId.includes('@');

    let customer = null;
    if (isEmail) {
      customer = await prisma.customer.findFirst({
        where: { email: cleanId.toLowerCase() },
      });
    } else {
      const normalized = normalizeEthiopianPhone(cleanId);
      const searchPhones = normalized.isValid ? normalized.variants : [cleanId];
      customer = await prisma.customer.findFirst({
        where: { phone: { in: searchPhones } },
      });
    }

    // If customer exists, dispatch OTP
    if (customer && customer.email) {
      await MobileOtpService.requestOtp({
        target: customer.email,
        channel: 'EMAIL',
        city: customer.city,
        purpose: 'PASSWORD_RESET',
      });
    }

    // Always return success to protect against account enumeration
    return {
      success: true,
      message: 'If an account exists, a 6-digit verification code has been dispatched.',
      code: AuthResponseCode.PASSWORD_RESET_SENT,
    };
  }

  static async resetPassword({ identifier, otp, newPassword }) {
    const cleanId = String(identifier).trim();
    const isEmail = cleanId.includes('@');

    let customer = null;
    if (isEmail) {
      customer = await prisma.customer.findFirst({
        where: { email: cleanId.toLowerCase() },
      });
    } else {
      const normalized = normalizeEthiopianPhone(cleanId);
      const searchPhones = normalized.isValid ? normalized.variants : [cleanId];
      customer = await prisma.customer.findFirst({
        where: { phone: { in: searchPhones } },
      });
    }

    if (!customer) {
      throw ApiError.badRequest('Invalid request.', AuthResponseCode.INVALID_CREDENTIALS);
    }

    // 1. Verify OTP for password reset
    const target = customer.email || customer.phone;
    const channel = customer.email ? 'EMAIL' : 'TELEGRAM';

    await MobileOtpService.verifyOtp({
      target,
      channel,
      otp,
      purpose: 'PASSWORD_RESET',
    });

    // 2. Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // 3. Update customer password & revoke existing sessions for security
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          passwordHash: newPasswordHash,
          lastActivityAt: new Date(),
        },
      }),
      prisma.customerMobileSession.updateMany({
        where: { customerId: customer.id, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      }),
    ]);

    return {
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.',
      code: AuthResponseCode.PASSWORD_RESET_SUCCESS,
    };
  }
}
