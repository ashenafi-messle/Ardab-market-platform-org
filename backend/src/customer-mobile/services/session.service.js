// ==============================================================================
// Ardab Market - Customer Mobile Session Service
// ==============================================================================
// Implements token-based mobile authentication with Access Tokens + Refresh Tokens,
// Refresh Token Rotation, and server-side session revocation.

import jwt from 'jsonwebtoken';
import { prisma } from '../../shared/config/database.js';
import { env } from '../../shared/config/env.js';
import { hashToken, generateRandomToken } from '../../shared/utils/crypto.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { AuthResponseCode } from '../utils/responseCodes.js';

// Access token lifetime: 1 hour for mobile apps
const ACCESS_TOKEN_EXPIRY = '1h';
// Refresh token lifetime: 30 days in milliseconds
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export class MobileSessionService {
  /**
   * Generates a signed JWT Access Token for an authenticated customer
   */
  static generateAccessToken(customer) {
    return jwt.sign(
      {
        id: customer.id,
        customerCode: customer.customerCode,
        email: customer.email,
        phone: customer.phone,
        fullName: customer.fullName,
        city: customer.city,
        role: 'CUSTOMER',
        type: 'access',
      },
      env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Verifies and decodes an Access Token
   */
  static verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded.role !== 'CUSTOMER') {
        throw new Error('Invalid token role');
      }
      return decoded;
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired', AuthResponseCode.TOKEN_EXPIRED);
      }
      throw ApiError.unauthorized('Invalid authentication token', AuthResponseCode.INVALID_TOKEN);
    }
  }

  /**
   * Creates a new authenticated mobile session:
   * Generates access token + cryptographically random refresh token.
   * Persists SHA-256 hash of refresh token into customer_mobile_sessions table.
   */
  static async createSession(customerId, deviceInfo = null) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        customerCode: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        profileImageUrl: true,
        status: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer account not found', AuthResponseCode.CUSTOMER_NOT_FOUND);
    }

    if (customer.status === 'SUSPENDED') {
      throw ApiError.forbidden('Your account has been suspended', AuthResponseCode.ACCOUNT_SUSPENDED);
    }
    if (customer.status === 'INACTIVE') {
      throw ApiError.forbidden('Your account is inactive', AuthResponseCode.ACCOUNT_INACTIVE);
    }

    // 1. Generate short-lived access token
    const accessToken = this.generateAccessToken(customer);

    // 2. Generate cryptographically secure refresh token
    const rawRefreshToken = generateRandomToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // 3. Save session in database
    await prisma.customerMobileSession.create({
      data: {
        customerId: customer.id,
        refreshTokenHash,
        deviceInfo: deviceInfo ? String(deviceInfo).slice(0, 255) : null,
        status: 'ACTIVE',
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresInSeconds: 3600,
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        profileImageUrl: customer.profileImageUrl,
        verified: customer.verificationStatus === 'VERIFIED',
        createdAt: customer.createdAt,
      },
    };
  }

  /**
   * Refreshes an active session:
   * Validates refresh token, implements Refresh Token Rotation (revokes old, issues new).
   */
  static async refreshSession(rawRefreshToken, deviceInfo = null) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw ApiError.badRequest('Refresh token is required', AuthResponseCode.INVALID_REFRESH_TOKEN);
    }

    const tokenHash = hashToken(rawRefreshToken.trim());

    // 1. Find session by hash
    const session = await prisma.customerMobileSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { customer: true },
    });

    if (!session) {
      throw ApiError.unauthorized('Invalid refresh session', AuthResponseCode.INVALID_REFRESH_TOKEN);
    }

    // 2. Check revocation
    if (session.status === 'REVOKED') {
      throw ApiError.unauthorized('Session has been revoked', AuthResponseCode.SESSION_REVOKED);
    }

    // 3. Check expiration
    if (new Date() > new Date(session.expiresAt) || session.status === 'EXPIRED') {
      await prisma.customerMobileSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      }).catch(() => {});
      throw ApiError.unauthorized('Session has expired. Please sign in again.', AuthResponseCode.SESSION_EXPIRED);
    }

    // 4. Check customer status
    const customer = session.customer;
    if (!customer || customer.status === 'SUSPENDED' || customer.status === 'INACTIVE') {
      throw ApiError.forbidden('Customer account is no longer active', AuthResponseCode.ACCOUNT_SUSPENDED);
    }

    // 5. Refresh Token Rotation: Revoke current session atomically and issue new pair
    const newRawRefreshToken = generateRandomToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.customerMobileSession.update({
        where: { id: session.id },
        data: { status: 'REVOKED' },
      }),
      prisma.customerMobileSession.create({
        data: {
          customerId: customer.id,
          refreshTokenHash: newRefreshTokenHash,
          deviceInfo: deviceInfo ? String(deviceInfo).slice(0, 255) : session.deviceInfo,
          status: 'ACTIVE',
          expiresAt: newExpiresAt,
        },
      }),
    ]);

    const newAccessToken = this.generateAccessToken(customer);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      expiresInSeconds: 3600,
      customer: {
        id: customer.id,
        customerCode: customer.customerCode,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        profileImageUrl: customer.profileImageUrl,
        verified: customer.verificationStatus === 'VERIFIED',
        createdAt: customer.createdAt,
      },
    };
  }

  /**
   * Revokes a session (Sign Out)
   */
  static async revokeSession(rawRefreshToken) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return true;
    }

    const tokenHash = hashToken(rawRefreshToken.trim());
    await prisma.customerMobileSession.updateMany({
      where: {
        refreshTokenHash: tokenHash,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
      },
    }).catch(() => {});

    return true;
  }
}
