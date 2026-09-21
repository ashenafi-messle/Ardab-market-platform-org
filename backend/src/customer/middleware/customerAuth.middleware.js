// ==============================================================================
// Ardab Market - Customer Authentication Middleware
// ==============================================================================

import { verifyCustomerToken } from '../services/customerAuth.service.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { prisma } from '../../shared/config/database.js';

export async function customerAuthMiddleware(req, res, next) {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.customer_token) {
    token = req.cookies.customer_token;
  }

  if (!token) {
    return next(
      ApiError.unauthorized('Customer authentication required', 'TOKEN_MISSING')
    );
  }

  try {
    const decoded = verifyCustomerToken(token);

    // Authoritative verification against database: ensures suspended or deleted customers are rejected immediately
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: { id: true, status: true, verificationStatus: true },
    });

    if (!customer) {
      return next(ApiError.unauthorized('Customer account does not exist or has been deleted.', 'CUSTOMER_NOT_FOUND'));
    }

    if (customer.status === 'SUSPENDED') {
      return next(ApiError.forbidden('Your customer account has been suspended. Please contact support.', 'ACCOUNT_SUSPENDED'));
    }

    if (customer.status === 'INACTIVE') {
      return next(ApiError.forbidden('Your customer account is inactive.', 'ACCOUNT_INACTIVE'));
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
