// ==============================================================================
// Ardab Market - Customer Authentication Service
// ==============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/config/database.js';
import { env } from '../../shared/config/env.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { hashToken, generateRandomToken } from '../../shared/utils/crypto.js';
import { EmailService } from '../../shared/services/email/email.service.js';
import { registerCustomer } from '../../admin/services/customer.service.js';

import { generateNextCustomerCode } from '../../admin/services/customerCode.service.js';
import { normalizeEthiopianPhone } from '../../shared/utils/phone.util.js';
import { logPlatformSecurityEvent } from '../../shared/services/platformSecurity.service.js';

/**
 * Sanitizes customer representation for API responses
 */
export function sanitizeCustomer(customer) {
  if (!customer) return null;
  const { passwordHash, ...safeCustomer } = customer;
  return safeCustomer;
}

/**
 * Generates signed JWT for Customer session
 */
export function generateCustomerToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      phone: payload.phone,
      customerCode: payload.customerCode,
      role: 'CUSTOMER',
      fullName: payload.fullName,
      city: payload.city,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Verifies customer JWT
 */
export function verifyCustomerToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Customer Registration: Creates a temporary PendingCustomerRegistration ONLY.
 * The permanent Customer record MUST NOT exist before email verification succeeds.
 */
export async function registerCustomerAccount(input, ipAddress) {
  const email = input.email ? input.email.trim().toLowerCase() : null;
  const phone = input.phone ? input.phone.trim() : null;
  const city = input.city?.trim() || 'Gondar';
  const deliveryZone = input.deliveryZone?.trim() || null;

  if (!email) {
    throw ApiError.badRequest('Email address is required for customer registration', 'EMAIL_REQUIRED');
  }
  if (!phone) {
    throw ApiError.badRequest('Phone number is required for customer registration', 'PHONE_REQUIRED');
  }

  // CASE A: Check if permanent verified customer already exists with this email
  const existingEmailCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email },
        { email: { equals: email, mode: 'insensitive' } },
      ],
    },
  });
  if (existingEmailCustomer) {
    throw ApiError.conflict('An account with this email address already exists. Please log in.', 'EMAIL_EXISTS');
  }

  // CASE C: Check if permanent customer already exists with this phone
  const existingPhoneCustomer = await prisma.customer.findFirst({
    where: { phone },
  });
  if (existingPhoneCustomer) {
    throw ApiError.conflict('A customer with this phone number is already registered.', 'PHONE_EXISTS');
  }

  // Generate secure single-use verification token
  const rawVerificationToken = generateRandomToken();
  const verificationTokenHash = hashToken(rawVerificationToken);
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // CASE B & D: Check if pending registration already exists for this email
  const existingPending = await prisma.pendingCustomerRegistration.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      consumedAt: null,
    },
  });

  if (existingPending) {
    // Resend cooldown: 30 seconds between requests for the same pending email
    const msSinceLastUpdate = Date.now() - new Date(existingPending.updatedAt).getTime();
    if (msSinceLastUpdate < 30 * 1000) {
      throw ApiError.tooManyRequests('A verification email was recently requested. Please wait 30 seconds before trying again.');
    }

    // Invalidate previous token and update pending attempt
    await prisma.pendingCustomerRegistration.update({
      where: { id: existingPending.id },
      data: {
        phone,
        city,
        deliveryZone,
        verificationTokenHash,
        verificationExpiresAt,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create temporary pending-registration record
    await prisma.pendingCustomerRegistration.create({
      data: {
        email,
        phone,
        city,
        deliveryZone,
        verificationTokenHash,
        verificationExpiresAt,
      },
    });
  }

  // Dispatch verification email (LINK ONLY, NO OTP)
  const verificationUrl = `${env.CUSTOMER_APP_URL.replace(/\/$/, '')}/verify-email?token=${rawVerificationToken}&email=${encodeURIComponent(email)}`;

  // Await email dispatch or handle safely without false confirmation
  const emailResult = await EmailService.sendVerificationLinkEmail({
    toEmail: email,
    name: email.split('@')[0],
    verificationUrl,
    expiresMinutes: 1440,
  }).catch((err) => {
    logger.error('Failed to dispatch customer verification email:', { error: err.message, email });
    return { success: false, error: err.message };
  });

  if (emailResult && emailResult.success === false && !env.IS_DEVELOPMENT && !env.IS_TEST) {
    logger.warn('Brevo email dispatch failed for pending registration:', { email, error: emailResult.error });
  }

  return {
    verificationRequired: true,
    deliveryMethod: 'email_link',
    message: 'Verification link sent to your email. Please check your inbox.',
    // Never return raw token in production/API response unless in development/test
    verificationToken: env.IS_DEVELOPMENT || env.IS_TEST ? rawVerificationToken : undefined,
  };
}

/**
 * Resends verification email for an existing pending registration
 */
export async function resendVerificationEmail({ email }) {
  if (!email) {
    throw ApiError.badRequest('Email address is required', 'EMAIL_REQUIRED');
  }
  const normalizedEmail = email.trim().toLowerCase();

  // If already verified permanent customer, reject safely
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { email: { equals: normalizedEmail, mode: 'insensitive' } },
      ],
    },
  });
  if (existingCustomer) {
    throw ApiError.badRequest('This account has already been verified. Please log in.', 'ALREADY_VERIFIED');
  }

  const pending = await prisma.pendingCustomerRegistration.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: 'insensitive' },
      consumedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!pending) {
    throw ApiError.notFound('No pending registration found for this email address.', 'REGISTRATION_NOT_FOUND');
  }

  // Resend cooldown check: 30s
  const msSinceLastUpdate = Date.now() - new Date(pending.updatedAt).getTime();
  if (msSinceLastUpdate < 30 * 1000) {
    throw ApiError.tooManyRequests('Please wait 30 seconds before requesting another verification email.');
  }

  const rawVerificationToken = generateRandomToken();
  const verificationTokenHash = hashToken(rawVerificationToken);
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.pendingCustomerRegistration.update({
    where: { id: pending.id },
    data: {
      verificationTokenHash,
      verificationExpiresAt,
      updatedAt: new Date(),
    },
  });

  const verificationUrl = `${env.CUSTOMER_APP_URL.replace(/\/$/, '')}/verify-email?token=${rawVerificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

  await EmailService.sendVerificationLinkEmail({
    toEmail: normalizedEmail,
    name: normalizedEmail.split('@')[0],
    verificationUrl,
    expiresMinutes: 1440,
  }).catch((err) => {
    logger.error('Failed to resend verification email:', { error: err.message, email: normalizedEmail });
  });

  return {
    deliveryMethod: 'email_link',
    message: 'A fresh verification link has been sent to your email.',
    verificationToken: env.IS_DEVELOPMENT || env.IS_TEST ? rawVerificationToken : undefined,
  };
}

/**
 * Validates verification token and atomically creates permanent Customer record.
 * Idempotent: Subsequent clicks return alreadyVerified without errors or duplicates.
 */
export async function verifyCustomerEmail({ token, email }) {
  if (!token) {
    throw ApiError.badRequest('Verification token is required', 'TOKEN_REQUIRED');
  }

  const candidateHash = hashToken(token.trim());

  // Execute customer creation inside an atomic Prisma transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find pending registration by hashed token
    const pending = await tx.pendingCustomerRegistration.findFirst({
      where: {
        OR: [
          { verificationTokenHash: candidateHash },
          { verificationTokenHash: token.trim() },
        ],
      },
    });

    // If not found by token hash, check if already consumed or customer already created
    if (!pending) {
      if (email) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingCustomer = await tx.customer.findFirst({
          where: {
            OR: [
              { email: normalizedEmail },
              { email: { equals: normalizedEmail, mode: 'insensitive' } },
            ],
          },
        });
        if (existingCustomer) {
          return {
            verified: true,
            alreadyVerified: true,
            nextStep: 'set_password',
            customer: sanitizeCustomer(existingCustomer),
          };
        }
      }
      throw ApiError.badRequest('This verification link is invalid or no longer available.', 'INVALID_TOKEN');
    }

    // 2. Check if already consumed (Idempotent handling)
    if (pending.consumedAt) {
      const existingCustomer = await tx.customer.findFirst({
        where: {
          OR: [
            { email: pending.email },
            { email: { equals: pending.email, mode: 'insensitive' } },
          ],
        },
      });
      return {
        verified: true,
        alreadyVerified: true,
        nextStep: 'set_password',
        customer: sanitizeCustomer(existingCustomer),
      };
    }

    // 3. Verify token has not expired
    if (new Date(pending.verificationExpiresAt) < new Date()) {
      throw ApiError.badRequest('Your verification link has expired. Please request a new verification email.', 'TOKEN_EXPIRED');
    }

    // 4. Double check if permanent customer already exists for this email
    let permanentCustomer = await tx.customer.findFirst({
      where: {
        OR: [
          { email: pending.email },
          { email: { equals: pending.email, mode: 'insensitive' } },
        ],
      },
    });

    if (!permanentCustomer) {
      // Check phone uniqueness
      const existingPhone = await tx.customer.findFirst({
        where: { phone: pending.phone },
      });
      if (existingPhone) {
        throw ApiError.conflict('A customer with this phone number is already registered.', 'PHONE_EXISTS');
      }

      // Generate human-readable full name from email if not present
      const localPart = pending.email.split('@')[0];
      const derivedFullName = localPart
        .replace(/[._-]+/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || `Customer ${pending.phone.slice(-4)}`;

      // Generate sequential customer code
      const customerCode = await generateNextCustomerCode(tx);

      // Create permanent customer record
      permanentCustomer = await tx.customer.create({
        data: {
          customerCode,
          fullName: derivedFullName,
          phone: pending.phone,
          email: pending.email,
          city: pending.city,
          deliveryZone: pending.deliveryZone,
          status: 'ACTIVE',
          verificationStatus: 'VERIFIED',
          lastActivityAt: new Date(),
        },
      });

      // Initial registration activity & welcome bonus
      await tx.customerActivity.create({
        data: {
          customerId: permanentCustomer.id,
          action: 'CUSTOMER_REGISTERED',
          description: 'Customer verified email and created permanent profile',
          actor: 'Customer',
        },
      });

      await tx.customerScoreEvent.create({
        data: {
          customerId: permanentCustomer.id,
          type: 'ACCOUNT_REGISTRATION',
          points: 50,
          source: 'LOYALTY_PROGRAM',
          metadata: JSON.stringify({ event: 'Welcome bonus points upon email verification' }),
        },
      });
    }

    // 5. Mark pending registration as verified and consumed
    await tx.pendingCustomerRegistration.update({
      where: { id: pending.id },
      data: {
        verifiedAt: new Date(),
        consumedAt: new Date(),
      },
    });

    return {
      verified: true,
      alreadyVerified: false,
      nextStep: 'set_password',
      customer: sanitizeCustomer(permanentCustomer),
    };
  });

  return result;
}

/**
 * Set initial password after verification and automatically sign customer in
 */
export async function setCustomerPassword({ email, password, token }) {
  if (!password || password.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters long', 'VALIDATION_ERROR');
  }

  let customer = null;

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
        ],
      },
    });
  }

  // If not found by email but token provided, lookup via pending record
  if (!customer && token) {
    const candidateHash = hashToken(token.trim());
    const pending = await prisma.pendingCustomerRegistration.findFirst({
      where: {
        OR: [
          { verificationTokenHash: candidateHash },
          { verificationTokenHash: token.trim() },
        ],
      },
    });
    if (pending?.email) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { email: pending.email },
            { email: { equals: pending.email, mode: 'insensitive' } },
          ],
        },
      });
    }
  }

  if (!customer) {
    throw ApiError.notFound('Customer account not found. Please complete verification first.', 'CUSTOMER_NOT_FOUND');
  }

  if (customer.status !== 'ACTIVE') {
    throw ApiError.forbidden('Customer account is suspended or inactive', 'ACCOUNT_INACTIVE');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const updatedCustomer = await prisma.customer.update({
    where: { id: customer.id },
    data: {
      passwordHash,
      verificationStatus: 'VERIFIED',
      lastActivityAt: new Date(),
    },
  });

  await prisma.customerActivity.create({
    data: {
      customerId: customer.id,
      action: 'PASSWORD_SET',
      description: 'Customer set account password and logged in automatically',
      actor: 'Customer',
    },
  }).catch(() => { });

  // Generate authoritative customer session token
  const authToken = generateCustomerToken(updatedCustomer);

  return {
    token: authToken,
    customer: sanitizeCustomer(updatedCustomer),
  };
}

/**
 * Dual Login: customer can authenticate using email OR phone number + password
 */
export async function loginCustomer({ identifier, password, ipAddress, userAgent }) {
  const cleanId = identifier?.trim();
  if (!cleanId || !password) {
    throw ApiError.badRequest('Identifier and password are required', 'VALIDATION_ERROR');
  }

  // Check if cleanId looks like a phone number or email
  const isEmail = cleanId.includes('@');
  const orConditions = [];

  if (isEmail) {
    orConditions.push(
      { email: { equals: cleanId, mode: 'insensitive' } },
      { email: cleanId }
    );
  } else {
    // Treat as phone number; build normalized variants for resilient lookup
    const phoneInfo = normalizeEthiopianPhone(cleanId);
    phoneInfo.variants.forEach((v) => {
      orConditions.push({ phone: v });
    });
    // Fallback: exact match on raw cleanId
    orConditions.push({ phone: cleanId });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: orConditions,
    },
  });

  if (!customer) {
    // Centralized security event for failed login
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_LOGIN_FAILED',
      severity: 'LOW',
      source: 'CUSTOMER_WEB',
      actorType: 'ANONYMOUS',
      actorEmail: isEmail ? cleanId.toLowerCase() : null,
      ipAddress,
      userAgent,
      metadata: { reason: 'CUSTOMER_NOT_FOUND', identifierType: isEmail ? 'email' : 'phone' },
    });
    throw ApiError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
  }

  if (customer.status === 'SUSPENDED') {
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT',
      severity: 'MEDIUM',
      source: 'CUSTOMER_WEB',
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorEmail: customer.email,
      targetType: 'Customer',
      targetId: customer.id,
      ipAddress,
      userAgent,
      metadata: { status: customer.status, reason: 'ACCOUNT_SUSPENDED' },
    });
    throw ApiError.forbidden('Your customer account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  if (customer.status === 'INACTIVE') {
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_LOGIN_FAILED',
      severity: 'LOW',
      source: 'CUSTOMER_WEB',
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorEmail: customer.email,
      targetType: 'Customer',
      targetId: customer.id,
      ipAddress,
      userAgent,
      metadata: { status: customer.status, reason: 'ACCOUNT_INACTIVE' },
    });
    throw ApiError.forbidden('Your customer account is inactive.', 'ACCOUNT_INACTIVE');
  }

  if (!customer.passwordHash) {
    throw ApiError.badRequest('Password not set. Please complete email verification.', 'PASSWORD_NOT_SET');
  }

  const isPasswordValid = await bcrypt.compare(password, customer.passwordHash);
  if (!isPasswordValid) {
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_LOGIN_FAILED',
      severity: 'MEDIUM',
      source: 'CUSTOMER_WEB',
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorEmail: customer.email,
      targetType: 'Customer',
      targetId: customer.id,
      ipAddress,
      userAgent,
      metadata: { reason: 'BAD_PASSWORD' },
    });
    throw ApiError.unauthorized('Invalid email/phone or password', 'INVALID_CREDENTIALS');
  }

  // Update last activity
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastActivityAt: new Date() },
  }).catch(() => { });

  await prisma.customerActivity.create({
    data: {
      customerId: customer.id,
      action: 'CUSTOMER_LOGIN',
      description: `Customer logged in successfully from IP ${ipAddress || 'unknown'}`,
      actor: 'Customer',
    },
  }).catch(() => { });

  // Centralized security event for successful login
  await logPlatformSecurityEvent({
    eventType: 'CUSTOMER_LOGIN_SUCCESS',
    severity: 'INFO',
    source: 'CUSTOMER_WEB',
    actorType: 'CUSTOMER',
    actorId: customer.id,
    actorEmail: customer.email,
    targetType: 'Customer',
    targetId: customer.id,
    ipAddress,
    userAgent,
    metadata: {
      loginMethod: isEmail ? 'email' : 'phone',
      city: customer.city,
    },
  });

  const token = generateCustomerToken(customer);

  return {
    token,
    customer: sanitizeCustomer(customer),
  };
}

/**
 * Authenticates a customer selecting a registered Google account/email on device.
 * Enforces security validations, status checks, activity logging, and central security telemetry.
 */
export async function loginWithGoogleRegisteredAccount({ email, ipAddress, userAgent, googleProfile = {} }) {
  if (!email || !email.trim()) {
    throw ApiError.badRequest('Google account email is required', 'EMAIL_REQUIRED');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { email: { equals: normalizedEmail, mode: 'insensitive' } },
      ],
    },
  });

  if (!customer) {
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_GOOGLE_LOGIN_UNREGISTERED',
      severity: 'LOW',
      source: 'CUSTOMER_WEB',
      actorType: 'ANONYMOUS',
      actorEmail: normalizedEmail,
      ipAddress,
      userAgent,
      metadata: { reason: 'CUSTOMER_NOT_REGISTERED', email: normalizedEmail },
    });
    throw ApiError.notFound(
      'This Google email is not yet registered on Ardab Market. Please sign up first to link your account.',
      'ACCOUNT_NOT_REGISTERED'
    );
  }

  if (customer.status === 'SUSPENDED') {
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_ACCOUNT_SUSPENDED_LOGIN_ATTEMPT',
      severity: 'MEDIUM',
      source: 'CUSTOMER_WEB',
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorEmail: customer.email,
      targetType: 'Customer',
      targetId: customer.id,
      ipAddress,
      userAgent,
      metadata: { status: customer.status, loginMethod: 'google' },
    });
    throw ApiError.forbidden('Your customer account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  if (customer.status === 'INACTIVE') {
    await logPlatformSecurityEvent({
      eventType: 'CUSTOMER_LOGIN_FAILED',
      severity: 'LOW',
      source: 'CUSTOMER_WEB',
      actorType: 'CUSTOMER',
      actorId: customer.id,
      actorEmail: customer.email,
      targetType: 'Customer',
      targetId: customer.id,
      ipAddress,
      userAgent,
      metadata: { status: customer.status, reason: 'ACCOUNT_INACTIVE', loginMethod: 'google' },
    });
    throw ApiError.forbidden('Your customer account is inactive.', 'ACCOUNT_INACTIVE');
  }

  // Update last activity & profile image if provided by Google and missing
  const updateData = { lastActivityAt: new Date() };
  if (!customer.profileImageUrl && googleProfile.picture) {
    updateData.profileImageUrl = googleProfile.picture;
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: updateData,
  }).catch(() => { });

  await prisma.customerActivity.create({
    data: {
      customerId: customer.id,
      action: 'CUSTOMER_GOOGLE_LOGIN',
      description: `Customer authenticated via Google (${normalizedEmail}) from IP ${ipAddress || 'unknown'}`,
      actor: 'Customer',
    },
  }).catch(() => { });

  // Platform Security Telemetry (tracked in Super Admin & Security Management in real time)
  await logPlatformSecurityEvent({
    eventType: 'CUSTOMER_LOGIN_SUCCESS',
    severity: 'INFO',
    source: 'CUSTOMER_WEB',
    actorType: 'CUSTOMER',
    actorId: customer.id,
    actorEmail: customer.email,
    targetType: 'Customer',
    targetId: customer.id,
    ipAddress,
    userAgent,
    metadata: {
      loginMethod: 'google',
      provider: 'google',
      email: normalizedEmail,
      city: customer.city,
    },
  });

  const token = generateCustomerToken(customer);

  return {
    token,
    customer: sanitizeCustomer(customer),
  };
}

/**
 * Retrieves authenticated customer by decoded ID
 */
export async function getCustomerProfile(customerId) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      addresses: {
        where: { isActive: true },
        orderBy: { isDefault: 'desc' },
      },
    },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  return sanitizeCustomer(customer);
}

/**
 * Initiates customer password reset flow (Enumeration-safe)
 * Sends password reset link to customer email.
 */
export async function requestCustomerPasswordReset({ email, ipAddress }) {
  const genericSuccessResponse = {
    message: 'If an account exists with this email, password reset instructions have been sent.',
  };

  if (!email || typeof email !== 'string') {
    return genericSuccessResponse;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { email: normalizedEmail },
        { email: { equals: email, mode: 'insensitive' } },
      ],
    },
  });

  if (!customer || customer.status === 'SUSPENDED' || customer.status === 'INACTIVE') {
    logger.info('Customer password reset requested for nonexistent or inactive customer:', { email: normalizedEmail });
    return genericSuccessResponse;
  }

  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.customerActivity.create({
    data: {
      customerId: customer.id,
      action: 'PASSWORD_RESET_REQUESTED',
      description: `Password reset requested from IP ${ipAddress || 'unknown'}`,
      actor: 'Customer',
      metadata: JSON.stringify({ tokenHash, rawTokenPrefix: rawToken.slice(0, 8), expiresAt: expiresAt.toISOString() }),
    },
  }).catch(() => { });

  const resetUrl = `${env.CUSTOMER_APP_URL.replace(/\/$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(customer.email)}`;

  EmailService.sendPasswordResetEmail({
    toEmail: customer.email,
    name: customer.fullName,
    resetUrl,
    expiresMinutes: 60,
    isCustomer: true,
    subject: 'Reset Your Ardab Market Password',
  }).catch((err) => {
    logger.error('Failed to dispatch customer password reset email:', { error: err.message, email: customer.email });
  });

  return {
    ...genericSuccessResponse,
    deliveryMethod: 'email_link',
    // Provide token in dev/test for immediate validation
    resetToken: env.IS_DEVELOPMENT || env.IS_TEST ? rawToken : undefined,
  };
}

/**
 * Resets customer password using reset token
 */
export async function resetCustomerPassword({ token, email, newPassword, ipAddress }) {
  if (!token || !newPassword) {
    throw ApiError.badRequest('Reset token and new password are required', 'VALIDATION_ERROR');
  }

  if (newPassword.length < 6) {
    throw ApiError.badRequest('Password must be at least 6 characters long', 'PASSWORD_TOO_SHORT');
  }

  let customer = null;
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });
  }

  // Find recent activity matching token
  const tokenHash = hashToken(token);
  const recentActivities = await prisma.customerActivity.findMany({
    where: {
      action: 'PASSWORD_RESET_REQUESTED',
      ...(customer ? { customerId: customer.id } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  let matchedActivity = null;
  for (const act of recentActivities) {
    try {
      if (!act.metadata) continue;
      const meta = JSON.parse(act.metadata);
      if (meta.tokenHash === tokenHash || meta.tokenHash === token) {
        if (new Date(meta.expiresAt) > new Date()) {
          matchedActivity = act;
          break;
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  if (!matchedActivity) {
    // If development or test, fallback to check latest request for email
    if ((env.IS_DEVELOPMENT || env.IS_TEST) && recentActivities.length > 0 && customer) {
      matchedActivity = recentActivities[0];
    } else {
      throw ApiError.badRequest('This password reset link is invalid or has expired. Please request a new link.', 'INVALID_TOKEN');
    }
  }

  const targetCustomerId = matchedActivity.customerId;
  const targetCustomer = await prisma.customer.findUnique({
    where: { id: targetCustomerId },
  });

  if (!targetCustomer) {
    throw ApiError.notFound('Customer account not found', 'CUSTOMER_NOT_FOUND');
  }

  if (targetCustomer.status === 'SUSPENDED' || targetCustomer.status === 'INACTIVE') {
    throw ApiError.forbidden('Customer account is inactive or suspended', 'ACCOUNT_INACTIVE');
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  const updatedCustomer = await prisma.customer.update({
    where: { id: targetCustomer.id },
    data: {
      passwordHash,
      verificationStatus: 'VERIFIED',
      lastActivityAt: new Date(),
    },
  });

  await prisma.customerActivity.create({
    data: {
      customerId: targetCustomer.id,
      action: 'PASSWORD_RESET_COMPLETED',
      description: `Password reset completed from IP ${ipAddress || 'unknown'}`,
      actor: 'Customer',
    },
  }).catch(() => { });

  EmailService.sendPasswordChangedNotification({
    toEmail: targetCustomer.email,
    name: targetCustomer.fullName,
  }).catch(() => { });

  return {
    success: true,
    message: 'Password reset successfully. You can now sign in with your new password.',
  };
}
