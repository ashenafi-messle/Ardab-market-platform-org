// ==============================================================================
// Ardab Market - Agent Authentication & Credential Service
// ==============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../shared/config/database.js';
import { env } from '../shared/config/env.js';
import { ApiError } from '../shared/utils/apiResponse.js';
import {
  hashToken,
  generateRandomToken,
  generateNumericOtp,
  timingSafeEqual,
} from '../shared/utils/crypto.js';
import { EmailService } from '../shared/services/email/email.service.js';
import { logger } from '../shared/utils/logger.js';

const BCRYPT_SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const ACTIVATION_TOKEN_EXPIRY = '15m';
const RESET_TOKEN_EXPIRY = '15m';
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

function formatAgentProfile(agent) {
  return {
    id: agent.id,
    name: agent.name,
    email: agent.email,
    phone: agent.phone,
    status: agent.status,
    commissionRate: Number(agent.commissionRate),
    commissionType: agent.commissionType,
    isActivated: agent.credentials?.isActivated ?? false,
    createdAt: agent.createdAt.toISOString(),
    updatedAt: agent.updatedAt.toISOString(),
  };
}

export class AgentAuthService {
  /**
   * Generates a signed Access Token for an authenticated agent
   */
  static generateAccessToken(agent) {
    return jwt.sign(
      {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        role: 'AGENT',
        type: 'access',
      },
      env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Verifies an Access Token
   */
  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded.role !== 'AGENT' || decoded.type !== 'access') {
        throw new Error('Invalid agent token role or type');
      }
      return decoded;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN');
    }
  }

  /**
   * 1. Request Activation OTP (First-Time Activation for Super-Admin registered agent)
   */
  static async requestActivationOtp(email) {
    const normalizedEmail = email.trim().toLowerCase();

    const agent = await prisma.agent.findUnique({
      where: { email: normalizedEmail },
      include: { credentials: true },
    });

    if (!agent) {
      throw ApiError.notFound('No registered agent found with this email address.', 'AGENT_NOT_FOUND');
    }

    if (agent.status !== 'ACTIVE') {
      throw ApiError.forbidden('Your agent account is currently inactive or suspended. Please contact Super Admin.', 'AGENT_INACTIVE');
    }

    if (agent.credentials?.isActivated) {
      throw ApiError.conflict('Your agent account is already activated. Please sign in with your password.', 'ALREADY_ACTIVATED');
    }

    // Rate limiting: enforce resend cooldown
    const recentOtp = await prisma.agentEmailOTP.findFirst({
      where: {
        agentId: agent.id,
        purpose: 'ACTIVATION',
        createdAt: { gte: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const remainingSecs = Math.ceil((recentOtp.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000);
      throw ApiError.tooManyRequests(`Please wait ${remainingSecs} seconds before requesting a new activation code.`, 'COOLDOWN_ACTIVE');
    }

    const otpCode = generateNumericOtp();
    const codeHash = hashToken(otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.agentEmailOTP.create({
      data: {
        agentId: agent.id,
        email: normalizedEmail,
        codeHash,
        purpose: 'ACTIVATION',
        expiresAt,
      },
    });

    // Send email asynchronously using central Brevo email service
    EmailService.sendOtpEmail({
      toEmail: agent.email,
      name: agent.name,
      otpCode,
      purpose: 'AGENT_ACTIVATION',
      expiresMinutes: OTP_EXPIRY_MINUTES,
    }).catch((err) => {
      logger.error('[AgentAuth] Failed to dispatch activation OTP email', { error: err.message, email: agent.email });
    });

    logger.info('[AgentAuth] Activation OTP generated for agent', { agentId: agent.id, email: agent.email });

    return {
      message: 'Activation code sent to your registered email address.',
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  /**
   * 2. Verify Activation OTP -> Returns short-lived activation authorization token
   */
  static async verifyActivationOtp(email, otp) {
    const normalizedEmail = email.trim().toLowerCase();

    const agent = await prisma.agent.findUnique({
      where: { email: normalizedEmail },
      include: { credentials: true },
    });

    if (!agent) {
      throw ApiError.notFound('Agent account not found.', 'AGENT_NOT_FOUND');
    }

    if (agent.credentials?.isActivated) {
      throw ApiError.conflict('Account is already activated. Please sign in.', 'ALREADY_ACTIVATED');
    }

    const latestOtp = await prisma.agentEmailOTP.findFirst({
      where: {
        agentId: agent.id,
        purpose: 'ACTIVATION',
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw ApiError.badRequest('No pending activation code found. Please request a new code.', 'NO_PENDING_OTP');
    }

    if (latestOtp.expiresAt < new Date()) {
      throw ApiError.badRequest('Activation code has expired. Please request a new code.', 'OTP_EXPIRED');
    }

    if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
      throw ApiError.tooManyRequests('Maximum verification attempts exceeded. Please request a new code.', 'MAX_ATTEMPTS_EXCEEDED');
    }

    // Increment attempts count
    await prisma.agentEmailOTP.update({
      where: { id: latestOtp.id },
      data: { attempts: { increment: 1 } },
    });

    const candidateHash = hashToken(otp.trim());
    const isMatch = timingSafeEqual(candidateHash, latestOtp.codeHash);

    if (!isMatch) {
      throw ApiError.badRequest('Invalid verification code. Please check and try again.', 'INVALID_OTP');
    }

    // Consume OTP
    await prisma.agentEmailOTP.update({
      where: { id: latestOtp.id },
      data: {
        verifiedAt: new Date(),
        consumedAt: new Date(),
      },
    });

    // Generate short-lived activation authorization token (authorized ONLY for set-password)
    const activationToken = jwt.sign(
      {
        agentId: agent.id,
        email: agent.email,
        role: 'AGENT_ACTIVATION',
        purpose: 'ACTIVATION',
      },
      env.JWT_SECRET,
      { expiresIn: ACTIVATION_TOKEN_EXPIRY }
    );

    return {
      message: 'Email verified successfully. You may now create your password.',
      activationToken,
    };
  }

  /**
   * 3. Set Initial Password (Completes Account Activation)
   */
  static async setPassword(activationToken, password) {
    let decoded;
    try {
      decoded = jwt.verify(activationToken, env.JWT_SECRET);
      if (decoded.role !== 'AGENT_ACTIVATION' || decoded.purpose !== 'ACTIVATION') {
        throw new Error('Invalid activation token scope');
      }
    } catch {
      throw ApiError.unauthorized('Activation token is invalid or expired. Please verify your OTP again.', 'INVALID_ACTIVATION_TOKEN');
    }

    const agent = await prisma.agent.findUnique({
      where: { id: decoded.agentId },
      include: { credentials: true },
    });

    if (!agent) {
      throw ApiError.notFound('Agent account not found.', 'AGENT_NOT_FOUND');
    }

    if (agent.status !== 'ACTIVE') {
      throw ApiError.forbidden('Your agent account is currently inactive.', 'AGENT_INACTIVE');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      await tx.agentCredential.upsert({
        where: { agentId: agent.id },
        create: {
          agentId: agent.id,
          passwordHash,
          isActivated: true,
          activatedAt: new Date(),
        },
        update: {
          passwordHash,
          isActivated: true,
          activatedAt: new Date(),
        },
      });
    });

    // Automatically create session and tokens upon initial activation
    const accessToken = this.generateAccessToken(agent);
    const refreshToken = generateRandomToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.agentSession.create({
      data: {
        agentId: agent.id,
        refreshTokenHash,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    logger.info('[AgentAuth] Agent account activated successfully', { agentId: agent.id, email: agent.email });

    return {
      message: 'Account activated successfully!',
      agent: formatAgentProfile(agent),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY,
      },
    };
  }

  /**
   * 4. Agent Login
   */
  static async login(email, password, deviceInfo = null) {
    const normalizedEmail = email.trim().toLowerCase();

    const agent = await prisma.agent.findUnique({
      where: { email: normalizedEmail },
      include: { credentials: true },
    });

    // Timing-safe generic authentication failure
    if (!agent || !agent.credentials || !agent.credentials.passwordHash) {
      // Fake compare to mitigate timing enumeration
      await bcrypt.compare(password, '$2a$12$e80yVv88bW40YvE1K8M5euQ98YcQO2yM2K2M2K2M2K2M2K2M2K2M2');
      throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    if (!agent.credentials.isActivated) {
      throw ApiError.forbidden('Account has not been activated yet. Please activate your account first.', 'NOT_ACTIVATED');
    }

    if (agent.status !== 'ACTIVE') {
      throw ApiError.forbidden('Your agent account has been suspended or deactivated. Contact Super Admin.', 'ACCOUNT_SUSPENDED');
    }

    const isPasswordValid = await bcrypt.compare(password, agent.credentials.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    // Create session & tokens
    const accessToken = this.generateAccessToken(agent);
    const refreshToken = generateRandomToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.agentSession.create({
        data: {
          agentId: agent.id,
          refreshTokenHash,
          deviceInfo: deviceInfo || null,
          status: 'ACTIVE',
          expiresAt,
        },
      }),
      prisma.agentCredential.update({
        where: { agentId: agent.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    logger.info('[AgentAuth] Agent logged in successfully', { agentId: agent.id, email: agent.email });

    return {
      agent: formatAgentProfile(agent),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600,
      },
    };
  }

  /**
   * 5. Refresh Session
   */
  static async refresh(refreshToken, deviceInfo = null) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is required.', 'TOKEN_MISSING');
    }

    const tokenHash = hashToken(refreshToken);

    const session = await prisma.agentSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: {
        agent: {
          include: { credentials: true },
        },
      },
    });

    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token is invalid or expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    const { agent } = session;

    if (agent.status !== 'ACTIVE') {
      throw ApiError.forbidden('Your agent account is currently suspended.', 'ACCOUNT_SUSPENDED');
    }

    // Refresh Token Rotation: Revoke previous session, create fresh one
    const newRefreshToken = generateRandomToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.agentSession.update({
        where: { id: session.id },
        data: { status: 'REVOKED' },
      }),
      prisma.agentSession.create({
        data: {
          agentId: agent.id,
          refreshTokenHash: newRefreshTokenHash,
          deviceInfo: deviceInfo || session.deviceInfo,
          status: 'ACTIVE',
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    const newAccessToken = this.generateAccessToken(agent);

    return {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
      },
      agent: formatAgentProfile(agent),
    };
  }

  /**
   * 6. Logout / Session Revocation
   */
  static async logout(agentId, refreshToken = null) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.agentSession.updateMany({
        where: { agentId, refreshTokenHash: tokenHash },
        data: { status: 'REVOKED' },
      });
    } else {
      await prisma.agentSession.updateMany({
        where: { agentId, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      });
    }

    return { message: 'Logged out successfully.' };
  }

  /**
   * 7. Forgot Password - Request OTP
   */
  static async forgotPassword(email) {
    const normalizedEmail = email.trim().toLowerCase();

    const agent = await prisma.agent.findUnique({
      where: { email: normalizedEmail },
      include: { credentials: true },
    });

    // If agent exists, active, and activated: send OTP
    if (agent && agent.status === 'ACTIVE' && agent.credentials?.isActivated) {
      // Cooldown check
      const recentOtp = await prisma.agentEmailOTP.findFirst({
        where: {
          agentId: agent.id,
          purpose: 'PASSWORD_RESET',
          createdAt: { gte: new Date(Date.now() - OTP_RESEND_COOLDOWN_MS) },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentOtp) {
        const remainingSecs = Math.ceil((recentOtp.createdAt.getTime() + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000);
        throw ApiError.tooManyRequests(`Please wait ${remainingSecs} seconds before requesting a new password reset code.`, 'COOLDOWN_ACTIVE');
      }

      const otpCode = generateNumericOtp();
      const codeHash = hashToken(otpCode);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      await prisma.agentEmailOTP.create({
        data: {
          agentId: agent.id,
          email: normalizedEmail,
          codeHash,
          purpose: 'PASSWORD_RESET',
          expiresAt,
        },
      });

      EmailService.sendOtpEmail({
        toEmail: agent.email,
        name: agent.name,
        otpCode,
        purpose: 'AGENT_PASSWORD_RESET',
        expiresMinutes: OTP_EXPIRY_MINUTES,
      }).catch((err) => {
        logger.error('[AgentAuth] Failed to send password reset OTP email', { error: err.message });
      });
    }

    // Standard safe response to avoid enumeration
    return {
      message: 'If a verified agent account exists with this email address, a password reset code has been sent.',
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    };
  }

  /**
   * 8. Verify Reset OTP -> Returns short-lived reset authorization token
   */
  static async verifyResetOtp(email, otp) {
    const normalizedEmail = email.trim().toLowerCase();

    const agent = await prisma.agent.findUnique({
      where: { email: normalizedEmail },
    });

    if (!agent) {
      throw ApiError.badRequest('Invalid verification code.', 'INVALID_OTP');
    }

    const latestOtp = await prisma.agentEmailOTP.findFirst({
      where: {
        agentId: agent.id,
        purpose: 'PASSWORD_RESET',
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw ApiError.badRequest('No pending reset code found. Please request a new code.', 'NO_PENDING_OTP');
    }

    if (latestOtp.expiresAt < new Date()) {
      throw ApiError.badRequest('Reset code has expired. Please request a new code.', 'OTP_EXPIRED');
    }

    if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
      throw ApiError.tooManyRequests('Maximum attempts exceeded. Please request a new code.', 'MAX_ATTEMPTS_EXCEEDED');
    }

    await prisma.agentEmailOTP.update({
      where: { id: latestOtp.id },
      data: { attempts: { increment: 1 } },
    });

    const candidateHash = hashToken(otp.trim());
    const isMatch = timingSafeEqual(candidateHash, latestOtp.codeHash);

    if (!isMatch) {
      throw ApiError.badRequest('Invalid verification code. Please check and try again.', 'INVALID_OTP');
    }

    await prisma.agentEmailOTP.update({
      where: { id: latestOtp.id },
      data: {
        verifiedAt: new Date(),
        consumedAt: new Date(),
      },
    });

    const resetToken = jwt.sign(
      {
        agentId: agent.id,
        email: agent.email,
        role: 'AGENT_PASSWORD_RESET',
        purpose: 'PASSWORD_RESET',
      },
      env.JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRY }
    );

    return {
      message: 'Code verified successfully. You may now enter your new password.',
      resetToken,
    };
  }

  /**
   * 9. Reset Password using resetToken
   */
  static async resetPassword(resetToken, newPassword) {
    let decoded;
    try {
      decoded = jwt.verify(resetToken, env.JWT_SECRET);
      if (decoded.role !== 'AGENT_PASSWORD_RESET' || decoded.purpose !== 'PASSWORD_RESET') {
        throw new Error('Invalid reset token scope');
      }
    } catch {
      throw ApiError.unauthorized('Password reset session has expired or is invalid. Please request a new code.', 'INVALID_RESET_TOKEN');
    }

    const agent = await prisma.agent.findUnique({
      where: { id: decoded.agentId },
    });

    if (!agent) {
      throw ApiError.notFound('Agent account not found.', 'AGENT_NOT_FOUND');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction([
      prisma.agentCredential.update({
        where: { agentId: agent.id },
        data: { passwordHash },
      }),
      // Revoke all existing sessions for security
      prisma.agentSession.updateMany({
        where: { agentId: agent.id, status: 'ACTIVE' },
        data: { status: 'REVOKED' },
      }),
    ]);

    // Send security notification email
    EmailService.sendPasswordChangedNotification({
      toEmail: agent.email,
      name: agent.name,
    }).catch(() => {});

    logger.info('[AgentAuth] Password reset successfully for agent', { agentId: agent.id });

    return {
      message: 'Password reset successfully. You can now sign in with your new password.',
    };
  }

  /**
   * 10. Authenticated Change Password
   */
  static async changePassword(agentId, currentPassword, newPassword) {
    const credential = await prisma.agentCredential.findUnique({
      where: { agentId },
      include: { agent: true },
    });

    if (!credential || !credential.passwordHash) {
      throw ApiError.badRequest('Agent credentials not established.', 'NO_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(currentPassword, credential.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect.', 'INVALID_CURRENT_PASSWORD');
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await prisma.agentCredential.update({
      where: { agentId },
      data: { passwordHash: newHash },
    });

    EmailService.sendPasswordChangedNotification({
      toEmail: credential.agent.email,
      name: credential.agent.name,
    }).catch(() => {});

    return { message: 'Password updated successfully.' };
  }
}
