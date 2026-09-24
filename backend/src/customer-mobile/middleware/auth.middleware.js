// ==============================================================================
// Ardab Market - Customer Mobile Authentication Middleware
// ==============================================================================

import { MobileSessionService } from '../services/session.service.js';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { AuthResponseCode } from '../utils/responseCodes.js';

export async function mobileAuthMiddleware(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(
      ApiError.unauthorized('Authentication token is required', AuthResponseCode.TOKEN_MISSING)
    );
  }

  try {
    const decoded = MobileSessionService.verifyAccessToken(token);

    // Verify against database that customer still exists and is not suspended
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: { id: true, status: true, verificationStatus: true },
    });

    if (!customer) {
      return next(
        ApiError.unauthorized('Customer account no longer exists', AuthResponseCode.CUSTOMER_NOT_FOUND)
      );
    }

    if (customer.status === 'SUSPENDED') {
      return next(
        ApiError.forbidden('Your account has been suspended', AuthResponseCode.ACCOUNT_SUSPENDED)
      );
    }

    if (customer.status === 'INACTIVE') {
      return next(
        ApiError.forbidden('Your account is inactive', AuthResponseCode.ACCOUNT_INACTIVE)
      );
    }

    req.customer = {
      ...decoded,
      status: customer.status,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
