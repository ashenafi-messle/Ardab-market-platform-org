// ==============================================================================
// Ardab Market - Maintenance & System Health Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { maintenanceService } from '../services/maintenance.service.js';

// ---------------------------------------------------------------------------
// System Components (Services Health)
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/maintenance/services
 * List all active system components with live health status.
 */
export async function listSystemComponentsHandler(req, res) {
  const components = await maintenanceService.listSystemComponents();
  return ApiResponse.success(res, components, 'System components retrieved successfully');
}

/**
 * POST /api/admin/maintenance/services/:componentId/health-check
 * Record a health check result for a system component.
 */
export async function recordHealthCheckHandler(req, res) {
  const { componentId } = req.params;
  const healthCheck = await maintenanceService.recordHealthCheck({ componentId, ...req.body });
  return ApiResponse.success(res, healthCheck, 'Health check recorded successfully', 201);
}

/**
 * GET /api/admin/maintenance/services/:componentId/history
 * Get health check history for a component.
 */
export async function getComponentHealthHistoryHandler(req, res) {
  const { componentId } = req.params;
  const limit = Number(req.query.limit) || 50;
  const result = await maintenanceService.getComponentHealthHistory(componentId, limit);
  return ApiResponse.success(res, result, 'Health check history retrieved successfully');
}

// ---------------------------------------------------------------------------
// Maintenance Windows
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/maintenance/windows
 * List maintenance windows with filters and pagination.
 */
export async function listMaintenanceWindowsHandler(req, res) {
  const result = await maintenanceService.listMaintenanceWindows(req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Maintenance windows retrieved successfully');
}

/**
 * GET /api/admin/maintenance/windows/:id
 * Get a single maintenance window by ID.
 */
export async function getMaintenanceWindowByIdHandler(req, res) {
  const window = await maintenanceService.getMaintenanceWindowById(req.params.id);
  return ApiResponse.success(res, window, 'Maintenance window retrieved successfully');
}

/**
 * POST /api/admin/maintenance/windows
 * Create a new maintenance window.
 */
export async function createMaintenanceWindowHandler(req, res) {
  const window = await maintenanceService.createMaintenanceWindow(req.body, req.user);
  return ApiResponse.success(res, window, 'Maintenance window created successfully', 201);
}

/**
 * PATCH /api/admin/maintenance/windows/:id/status
 * Update the status of a maintenance window.
 */
export async function updateMaintenanceWindowStatusHandler(req, res) {
  const { status, reason } = req.body;
  const updated = await maintenanceService.updateMaintenanceWindowStatus(req.params.id, status, reason, req.user);
  return ApiResponse.success(res, updated, `Maintenance window status updated to ${status}`);
}

// ---------------------------------------------------------------------------
// Maintenance Tasks
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/maintenance/tasks
 * List all maintenance tasks.
 */
export async function listMaintenanceTasksHandler(req, res) {
  const tasks = await maintenanceService.listMaintenanceTasks(req.query);
  return ApiResponse.success(res, tasks, 'Maintenance tasks retrieved successfully');
}

/**
 * POST /api/admin/maintenance/tasks/:id/run
 * Manually trigger a maintenance task.
 */
export async function runMaintenanceTaskHandler(req, res) {
  const updated = await maintenanceService.runMaintenanceTask(req.params.id, req.user);
  return ApiResponse.success(res, updated, `Maintenance task "${updated.name}" executed successfully`);
}

// ---------------------------------------------------------------------------
// System Incidents
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/maintenance/incidents
 * List system incidents with filters.
 */
export async function listIncidentsHandler(req, res) {
  const result = await maintenanceService.listIncidents(req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'System incidents retrieved successfully');
}

/**
 * POST /api/admin/maintenance/incidents
 * Create a new system incident.
 */
export async function createIncidentHandler(req, res) {
  const incident = await maintenanceService.createIncident(req.body, req.user);
  return ApiResponse.success(res, incident, 'System incident created', 201);
}

/**
 * PATCH /api/admin/maintenance/incidents/:id
 * Update incident status or resolution.
 */
export async function updateIncidentHandler(req, res) {
  const updated = await maintenanceService.updateIncidentStatus(req.params.id, req.body, req.user);
  return ApiResponse.success(res, updated, 'System incident updated successfully');
}

// ---------------------------------------------------------------------------
// Fleet Equipment Logs
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/maintenance/fleet
 * List fleet equipment service logs.
 */
export async function listEquipmentLogsHandler(req, res) {
  const result = await maintenanceService.listEquipmentLogs(req.query);
  return ApiResponse.paginated(res, result.items, result.pagination, 'Fleet equipment logs retrieved successfully');
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/maintenance/statistics
 * Aggregated maintenance & health dashboard statistics.
 */
export async function getMaintenanceStatisticsHandler(req, res) {
  const stats = await maintenanceService.getMaintenanceStatistics();
  return ApiResponse.success(res, stats, 'Maintenance statistics retrieved successfully');
}
