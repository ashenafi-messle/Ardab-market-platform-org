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

    // 3. Dispatch OTP via Telegram Bot
    return MobileOtpService.requestOtp({
      target: normalized.e164,
      channel: 'TELEGRAM',
      city: city || 'Gondar',
      purpose: 'SECURITY_VERIFICATION',
    });
  }

  static async verifyTelegramRegistration({ phone, otp }) {
    const normalized = normalizeEthiopianPhone(phone);
    const target = normalized.isValid ? normalized.e164 : phone.trim();

    return MobileOtpService.verifyOtp({
      target,
      channel: 'TELEGRAM',
      otp,
      purpose: 'SECURITY_VERIFICATION',
    });
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
          verificationStatus: 'VERIFIED',
          status: 'ACTIVE',
          lastActivityAt: new Date(),
        },
      });
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

    if (!customer || !customer.passwordHash) {
      throw ApiError.unauthorized('Invalid email, phone, or password.', AuthResponseCode.INVALID_CREDENTIALS);
    }

    if (customer.status === 'SUSPENDED') {
      throw ApiError.forbidden(
        'Your customer account has been suspended. Please contact support.',
        AuthResponseCode.ACCOUNT_SUSPENDED
      );
    }

    if (customer.status === 'INACTIVE') {
      throw ApiError.forbidden('Your customer account is inactive.', AuthResponseCode.ACCOUNT_INACTIVE);
    }

    // Verify bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, customer.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email, phone, or password.', AuthResponseCode.INVALID_CREDENTIALS);
    }

    // Update last activity timestamp
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastActivityAt: new Date() },
    }).catch(() => {});

    // Create session
    return MobileSessionService.createSession(customer.id, deviceInfo);
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
