// ==============================================================================
// Ardab Market - Security & Super Admin Management Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listSuperAdminsHandler,
  getSuperAdminByIdHandler,
  createSuperAdminHandler,
  updateSuperAdminHandler,
  toggleSuperAdminStatusHandler,
  resetSuperAdminPasswordHandler,
  deleteSuperAdminHandler,
  getSecurityStatisticsHandler,
  listSecurityEventsHandler,
  recordSecurityEventHandler,
  listSecurityAlertsHandler,
  updateAlertStatusHandler,
  listActiveSessionsHandler,
  revokeSessionHandler,
  listIpRulesHandler,
  addIpRuleHandler,
  deleteIpRuleHandler,
  listFailedLoginsHandler,
  listAuditLogsHandler,
} from '../controllers/security.controller.js';
import {
  idParamSchema,
  createSuperAdminSchema,
  updateSuperAdminSchema,
  toggleStatusSchema,
  listSuperAdminsQuerySchema,
  listSecurityEventsQuerySchema,
  listSecurityAlertsQuerySchema,
  updateSecurityAlertSchema,
  addIpRuleSchema,
} from '../validators/security.validator.js';

const router = Router();

// Require admin authentication for all security routes
router.use(adminAuthMiddleware);

// ------------------------------------------------------------------------------
// Statistics & Dashboard
// ------------------------------------------------------------------------------
router.get(
  '/statistics',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_VIEW),
  asyncHandler(getSecurityStatisticsHandler)
);

// ------------------------------------------------------------------------------
// Super Admin Account Governance (Strictly using admin_users)
// ------------------------------------------------------------------------------
router.get(
  '/super-admins',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ query: listSuperAdminsQuerySchema }),
  asyncHandler(listSuperAdminsHandler)
);

router.post(
  '/super-admins',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ body: createSuperAdminSchema }),
  asyncHandler(createSuperAdminHandler)
);

router.get(
  '/super-admins/:id',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ params: idParamSchema }),
  asyncHandler(getSuperAdminByIdHandler)
);

router.patch(
  '/super-admins/:id',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ params: idParamSchema, body: updateSuperAdminSchema }),
  asyncHandler(updateSuperAdminHandler)
);

router.patch(
  '/super-admins/:id/status',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ params: idParamSchema, body: toggleStatusSchema }),
  asyncHandler(toggleSuperAdminStatusHandler)
);

router.post(
  '/super-admins/:id/reset-password',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ params: idParamSchema }),
  asyncHandler(resetSuperAdminPasswordHandler)
);

router.delete(
  '/super-admins/:id',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ADMINS),
  validate({ params: idParamSchema }),
  asyncHandler(deleteSuperAdminHandler)
);

// ------------------------------------------------------------------------------
// Active Sessions & Revocation
// ------------------------------------------------------------------------------
router.get(
  '/sessions',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_SESSIONS),
  asyncHandler(listActiveSessionsHandler)
);

router.post(
  '/sessions/:id/revoke',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_SESSIONS),
  validate({ params: idParamSchema }),
  asyncHandler(revokeSessionHandler)
);

// ------------------------------------------------------------------------------
// Security Alerts & Triage
// ------------------------------------------------------------------------------
router.get(
  '/alerts',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_VIEW),
  validate({ query: listSecurityAlertsQuerySchema }),
  asyncHandler(listSecurityAlertsHandler)
);

router.patch(
  '/alerts/:id',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_ALERTS),
  validate({ params: idParamSchema, body: updateSecurityAlertSchema }),
  asyncHandler(updateAlertStatusHandler)
);

// ------------------------------------------------------------------------------
// Platform Security Events
// ------------------------------------------------------------------------------
router.get(
  '/events',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_VIEW),
  validate({ query: listSecurityEventsQuerySchema }),
  asyncHandler(listSecurityEventsHandler)
);

router.post(
  '/events',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_VIEW),
  asyncHandler(recordSecurityEventHandler)
);

// ------------------------------------------------------------------------------
// IP Firewall Rules
// ------------------------------------------------------------------------------
router.get(
  '/ip-rules',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_VIEW),
  asyncHandler(listIpRulesHandler)
);

router.post(
  '/ip-rules',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_FIREWALL),
  validate({ body: addIpRuleSchema }),
  asyncHandler(addIpRuleHandler)
);

router.delete(
  '/ip-rules/:id',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_MANAGE_FIREWALL),
  validate({ params: idParamSchema }),
  asyncHandler(deleteIpRuleHandler)
);

// ------------------------------------------------------------------------------
// Failed Logins & Audit Logs
// ------------------------------------------------------------------------------
router.get(
  '/failed-logins',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_VIEW),
  asyncHandler(listFailedLoginsHandler)
);

router.get(
  '/audit-logs',
  requirePermission(ADMIN_PERMISSIONS.SECURITY_AUDIT_LOGS),
  asyncHandler(listAuditLogsHandler)
);

export default router;
