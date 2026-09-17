// ==============================================================================
// Ardab Market - Security & Super Admin Management Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { securityService } from '../services/security.service.js';

function extractReqInfo(req) {
  return {
    ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    requestId: req.id,
    endpoint: req.originalUrl,
    httpMethod: req.method,
  };
}

// ------------------------------------------------------------------------------
// Super Admin Account Handlers
// ------------------------------------------------------------------------------

export async function listSuperAdminsHandler(req, res) {
  const result = await securityService.listSuperAdmins(req.query);
  return ApiResponse.paginated(res, result.data, result.pagination, 'Super Admin accounts retrieved successfully');
}

export async function getSuperAdminByIdHandler(req, res) {
  const admin = await securityService.getSuperAdminById(req.params.id);
  return ApiResponse.success(res, admin, 'Super Admin details retrieved successfully');
}

export async function createSuperAdminHandler(req, res) {
  const result = await securityService.createSuperAdmin(req.body, req.user, extractReqInfo(req));
  return ApiResponse.success(res, result, 'Super Admin account provisioned successfully', 201);
}

export async function updateSuperAdminHandler(req, res) {
  const result = await securityService.updateSuperAdmin(req.params.id, req.body, req.user, extractReqInfo(req));
  return ApiResponse.success(res, result, 'Super Admin account updated successfully');
}

export async function toggleSuperAdminStatusHandler(req, res) {
  const result = await securityService.toggleSuperAdminStatus(
    req.params.id,
    req.user,
    req.body?.reason,
    extractReqInfo(req)
  );
  return ApiResponse.success(res, result, 'Super Admin account status updated successfully');
}

export async function resetSuperAdminPasswordHandler(req, res) {
  const result = await securityService.resetSuperAdminPassword(req.params.id, req.user, extractReqInfo(req));
  return ApiResponse.success(res, result, 'Temporary security password generated successfully');
}

export async function deleteSuperAdminHandler(req, res) {
  const result = await securityService.deleteSuperAdmin(req.params.id, req.user, extractReqInfo(req));
  return ApiResponse.success(res, result, 'Super Admin account deprovisioned successfully');
}

// ------------------------------------------------------------------------------
// Security Events & Statistics Handlers
// ------------------------------------------------------------------------------

export async function getSecurityStatisticsHandler(req, res) {
  const stats = await securityService.getSecurityStatistics();
  return ApiResponse.success(res, stats, 'Platform security statistics retrieved successfully');
}

export async function listSecurityEventsHandler(req, res) {
  const result = await securityService.listSecurityEvents(req.query);
  return ApiResponse.paginated(res, result.data, result.pagination, 'Security events retrieved successfully');
}

export async function recordSecurityEventHandler(req, res) {
  const event = await securityService.recordSecurityEvent({
    ...req.body,
    ...extractReqInfo(req),
    actorId: req.user?.id || req.body?.actorId,
    actorEmail: req.user?.email || req.body?.actorEmail,
  });
  return ApiResponse.success(res, event, 'Security event logged successfully', 201);
}

// ------------------------------------------------------------------------------
// Security Alerts Handlers
// ------------------------------------------------------------------------------

export async function listSecurityAlertsHandler(req, res) {
  const result = await securityService.listSecurityAlerts(req.query);
  return ApiResponse.paginated(res, result.data, result.pagination, 'Security alerts retrieved successfully');
}

export async function updateAlertStatusHandler(req, res) {
  const updated = await securityService.updateAlertStatus(req.params.id, req.body, req.user);
  return ApiResponse.success(res, updated, 'Security alert status updated successfully');
}

// ------------------------------------------------------------------------------
// Sessions & IP Rules Handlers
// ------------------------------------------------------------------------------

export async function listActiveSessionsHandler(req, res) {
  const sessions = await securityService.listActiveSessions();
  return ApiResponse.success(res, sessions, 'Active sessions retrieved successfully');
}

export async function revokeSessionHandler(req, res) {
  const result = await securityService.revokeSession(req.params.id, req.user, extractReqInfo(req));
  return ApiResponse.success(res, result, 'Session revoked successfully');
}

export async function listIpRulesHandler(req, res) {
  const rules = await securityService.listIpRules();
  return ApiResponse.success(res, rules, 'Firewall rules retrieved successfully');
}

export async function addIpRuleHandler(req, res) {
  const rule = await securityService.addIpRule(req.body, req.user, extractReqInfo(req));
  return ApiResponse.success(res, rule, 'Firewall rule created successfully', 201);
}

export async function deleteIpRuleHandler(req, res) {
  const result = await securityService.deleteIpRule(req.params.id, req.user, extractReqInfo(req));
  return ApiResponse.success(res, result, 'Firewall rule removed successfully');
}

export async function listFailedLoginsHandler(req, res) {
  const failedLogins = await securityService.listFailedLogins(req.query);
  return ApiResponse.success(res, failedLogins, 'Failed login attempts retrieved successfully');
}

export async function listAuditLogsHandler(req, res) {
  const logs = await securityService.listAuditLogs(req.query);
  return ApiResponse.success(res, logs, 'Security audit logs retrieved successfully');
}
