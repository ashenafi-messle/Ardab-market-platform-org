// ==============================================================================
// Ardab Market - Admin Authorization & RBAC Middleware
// ==============================================================================
// Enforces role-based access control and granular permission checks.

import { ApiError } from '../../shared/utils/apiResponse.js';
import { hasPermission } from '../constants/adminPermissions.js';

/**
 * Restricts access to specific administrative roles
 *
 * @param  {...string} allowedRoles - Allowed roles (e.g. SUPER_ADMIN, SUB_ADMIN)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required before authorization check.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
          'ROLE_FORBIDDEN'
        )
      );
    }

    return next();
  };
}

/**
 * Restricts access based on granular permission action
 *
 * @param  {...string} requiredPermissions - Permissions required (e.g. 'products:create')
 */
export function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required before permission check.'));
    }

    const userRole = req.user.role;
    const hasAll = requiredPermissions.every((perm) => hasPermission(userRole, perm));

    if (!hasAll) {
      return next(
        ApiError.forbidden(
          `Access forbidden: Insufficient administrative privileges. Required permissions: [${requiredPermissions.join(', ')}]`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    return next();
  };
}
