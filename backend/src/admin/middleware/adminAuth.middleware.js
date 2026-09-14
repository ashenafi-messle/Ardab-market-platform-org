// ==============================================================================
// Ardab Market - Admin Authentication Middleware
// ==============================================================================
// Verifies JWT token and attaches authenticated admin identity to req.user.

import { verifyAdminToken } from '../services/auth.service.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { hashToken } from '../../shared/utils/crypto.js';
import { prisma } from '../../shared/config/database.js';

export async function adminAuthMiddleware(req, res, next) {
  let token = null;

  // 1. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.token) {
    // 2. Fallback to HttpOnly cookie
    token = req.cookies.token;
  }

  if (!token) {
    return next(
      ApiError.unauthorized('Authentication token is required to access administrative resources.', 'TOKEN_MISSING')
    );
  }

  try {
    const decoded = verifyAdminToken(token);
    req.user = decoded;
    req.token = token;

    // 3. Check server-side session revocation in admin_sessions table if session exists
    const tokenHashed = hashToken(token);
    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: tokenHashed },
    });

    if (session) {
      if (session.status === 'REVOKED') {
        return next(
          ApiError.unauthorized('Your session has been revoked. Please log in again.', 'SESSION_REVOKED')
        );
      }
      if (session.status === 'EXPIRED' || session.expiresAt < new Date()) {
        return next(
          ApiError.unauthorized('Your session has expired. Please log in again.', 'SESSION_EXPIRED')
        );
      }
      req.session = session;
    }

    return next();
  } catch (error) {
    return next(error); // Error middleware handles JsonWebTokenError and TokenExpiredError
  }
}

