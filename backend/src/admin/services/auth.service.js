import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/config/database.js';
import { env } from '../../shared/config/env.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';
import { USER_STATUS } from '../../shared/constants/statuses.js';
import { hashToken, generateRandomToken } from '../../shared/utils/crypto.js';
import { EmailService } from '../../shared/services/email/email.service.js';

/**
 * Sanitizes admin user object to never leak password hashes or internal sensitive fields
 */
export function sanitizeAdminUser(admin) {
  if (!admin) return null;
  const { passwordHash, ...safeAdmin } = admin;
  return safeAdmin;
}

/**
 * Issues signed JWT access token for admin
 */
export function generateAdminToken(payload) {
  return jwt.sign(
    {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Verifies JWT token and returns decoded payload
 */
export function verifyAdminToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

/**
 * Authenticates admin credentials and returns user session with token
 */
export async function loginAdmin({ email, password, ipAddress, userAgent }) {
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (!admin) {
    logger.warn('Failed login attempt - User not found', { email: normalizedEmail, ipAddress });
    // Record audit event asynchronously
    prisma.auditLog.create({
      data: {
        adminEmail: normalizedEmail,
        action: 'LOGIN_FAILED',
        entity: 'AdminUser',
        ipAddress,
        changesSummary: 'User account not found',
        status: 'FAILED',
      },
    }).catch(() => {});

    throw ApiError.unauthorized('Invalid administrative credentials. Please verify your email and password.', 'INVALID_CREDENTIALS');
  }

  // Account status check
  if (admin.status === USER_STATUS.SUSPENDED) {
    logger.warn('Login attempt for suspended admin account', { email: normalizedEmail, ipAddress });
    throw ApiError.forbidden('Your administrative account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  if (admin.status === USER_STATUS.INACTIVE) {
    logger.warn('Login attempt for inactive admin account', { email: normalizedEmail, ipAddress });
    throw ApiError.forbidden('Your administrative account is currently inactive.', 'ACCOUNT_INACTIVE');
  }

  // Secure password hash comparison
  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isPasswordValid) {
    logger.warn('Failed login attempt - Invalid password', { email: normalizedEmail, ipAddress });
    prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: normalizedEmail,
        action: 'LOGIN_FAILED',
        entity: 'AdminUser',
        entityId: admin.id,
        ipAddress,
        changesSummary: 'Invalid password provided',
        status: 'FAILED',
      },
    }).catch(() => {});

    throw ApiError.unauthorized('Invalid administrative credentials. Please verify your email and password.', 'INVALID_CREDENTIALS');
  }

  // Update last login timestamp
  prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  }).catch((err) => {
    logger.error('Failed to update admin lastLogin:', { error: err.message, adminId: admin.id });
  });

  const token = generateAdminToken(admin);
  const tokenHashed = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Record session in admin_sessions table and audit log atomically/asynchronously
  try {
    await prisma.adminSession.create({
      data: {
        adminId: admin.id,
        tokenHash: tokenHashed,
        ipAddress,
        userAgent,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'LOGIN_SUCCESS',
        entity: 'AdminUser',
        entityId: admin.id,
        ipAddress,
        status: 'SUCCESS',
      },
    });
  } catch (err) {
    logger.error('Error recording admin login session or audit log:', { error: err.message });
  }

  logger.info('Admin successfully authenticated', {
    adminId: admin.id,
    role: admin.role,
    email: admin.email,
  });

  return {
    token,
    user: sanitizeAdminUser(admin),
  };
}

/**
 * Revokes current admin session and logs out
 */
export async function logoutAdmin({ token, adminId, ipAddress }) {
  if (token) {
    const tokenHashed = hashToken(token);
    await prisma.adminSession.updateMany({
      where: { tokenHash: tokenHashed },
      data: { status: 'REVOKED' },
    }).catch(() => {});
  }

  if (adminId) {
    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } }).catch(() => null);
    if (admin) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'LOGOUT',
          entity: 'AdminUser',
          entityId: admin.id,
          ipAddress,
          status: 'SUCCESS',
        },
      }).catch(() => {});
    }
  }

  return { message: 'Logged out successfully' };
}

/**
 * Initiates password reset flow (Enumeration-safe)
 */
export async function requestPasswordReset({ email, ipAddress }) {
  const normalizedEmail = email.trim().toLowerCase();
  const genericSuccessResponse = {
    message: 'If an account exists with this email, password reset instructions have been sent.',
  };

  const admin = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  });

  if (!admin || admin.status !== USER_STATUS.ACTIVE) {
    logger.info('Password reset requested for nonexistent or inactive account:', { email: normalizedEmail });
    return genericSuccessResponse;
  }

  // Delete previous reset tokens for this admin
  await prisma.passwordResetToken.deleteMany({
    where: { adminId: admin.id },
  }).catch(() => {});

  const rawToken = generateRandomToken();
  const tokenHashed = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await prisma.passwordResetToken.create({
    data: {
      adminId: admin.id,
      tokenHash: tokenHashed,
      expiresAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'AdminUser',
      entityId: admin.id,
      ipAddress,
      status: 'SUCCESS',
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  
  // Asynchronous email dispatch via EmailService (Brevo)
  EmailService.sendPasswordResetEmail({
    toEmail: admin.email,
    name: admin.name,
    resetUrl,
    expiresMinutes: 15,
  }).catch((err) => {
    logger.error('Failed to send password reset email:', { error: err.message, email: admin.email });
  });

  return genericSuccessResponse;
}

/**
 * Executes password reset using raw token and new password
 */
export async function executePasswordReset({ token, newPassword, ipAddress }) {
  if (!token) {
    throw ApiError.badRequest('Password reset token is required.', 'TOKEN_MISSING');
  }

  const tokenHashed = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: tokenHashed },
    include: { admin: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired password reset token.', 'INVALID_RESET_TOKEN');
  }

  const admin = resetToken.admin;
  if (!admin || admin.status !== USER_STATUS.ACTIVE) {
    throw ApiError.forbidden('Associated administrative account is disabled or suspended.', 'ACCOUNT_DISABLED');
  }

  const saltRounds = 10;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Transaction: Update password, mark token used, revoke sessions, log audit event
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.adminSession.updateMany({
      where: { adminId: admin.id, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    }),
    prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'PASSWORD_RESET_SUCCESS',
        entity: 'AdminUser',
        entityId: admin.id,
        ipAddress,
        status: 'SUCCESS',
      },
    }),
  ]);

  // Send security notification email
  EmailService.sendPasswordChangedNotification({
    toEmail: admin.email,
    name: admin.name,
  }).catch(() => {});

  return { message: 'Password has been reset successfully. Please log in with your new password.' };
}

/**
 * Retrieves current admin profile by ID
 */
export async function getAdminById(id) {
  const admin = await prisma.adminUser.findUnique({
    where: { id },
  });

  if (!admin) {
    throw ApiError.notFound('Admin account not found.', 'ADMIN_NOT_FOUND');
  }

  return sanitizeAdminUser(admin);
}

