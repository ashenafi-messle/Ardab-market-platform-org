// ==============================================================================
// Ardab Market - Maintenance & System Health Routes
// ==============================================================================

import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuth.middleware.js';
import { requirePermission } from '../middleware/adminPermission.middleware.js';
import { ADMIN_PERMISSIONS } from '../constants/adminPermissions.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import {
  listSystemComponentsHandler,
  recordHealthCheckHandler,
  getComponentHealthHistoryHandler,
  listMaintenanceWindowsHandler,
  getMaintenanceWindowByIdHandler,
  createMaintenanceWindowHandler,
  updateMaintenanceWindowStatusHandler,
  listMaintenanceTasksHandler,
  runMaintenanceTaskHandler,
  listIncidentsHandler,
  createIncidentHandler,
  updateIncidentHandler,
  listEquipmentLogsHandler,
  getMaintenanceStatisticsHandler,
} from '../controllers/maintenance.controller.js';
import {
  idParamSchema,
  componentIdParamSchema,
  listMaintenanceWindowsQuerySchema,
  createMaintenanceWindowSchema,
  updateMaintenanceWindowStatusSchema,
  recordHealthCheckSchema,
  listIncidentsQuerySchema,
  createIncidentSchema,
  updateIncidentSchema,
  listTasksQuerySchema,
  listEquipmentLogsQuerySchema,
} from '../validators/maintenance.validator.js';

const router = Router();

// Require admin authentication for all routes
router.use(adminAuthMiddleware);

// ------------------------------------------------------------------------------
// Statistics Dashboard
// ------------------------------------------------------------------------------
router.get(
  '/statistics',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  asyncHandler(getMaintenanceStatisticsHandler)
);

// ------------------------------------------------------------------------------
// System Components / Service Health
// ------------------------------------------------------------------------------
router.get(
  '/services',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  asyncHandler(listSystemComponentsHandler)
);

router.post(
  '/services/:componentId/health-check',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ params: componentIdParamSchema, body: recordHealthCheckSchema }),
  asyncHandler(recordHealthCheckHandler)
);

router.get(
  '/services/:componentId/history',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ params: componentIdParamSchema }),
  asyncHandler(getComponentHealthHistoryHandler)
);

// ------------------------------------------------------------------------------
// Maintenance Windows
// ------------------------------------------------------------------------------
router.get(
  '/windows',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ query: listMaintenanceWindowsQuerySchema }),
  asyncHandler(listMaintenanceWindowsHandler)
);

router.post(
  '/windows',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_SCHEDULE),
  validate({ body: createMaintenanceWindowSchema }),
  asyncHandler(createMaintenanceWindowHandler)
);

router.get(
  '/windows/:id',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(getMaintenanceWindowByIdHandler)
);

router.patch(
  '/windows/:id/status',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_SCHEDULE),
  validate({ params: idParamSchema, body: updateMaintenanceWindowStatusSchema }),
  asyncHandler(updateMaintenanceWindowStatusHandler)
);

// ------------------------------------------------------------------------------
// Maintenance Tasks
// ------------------------------------------------------------------------------
router.get(
  '/tasks',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ query: listTasksQuerySchema }),
  asyncHandler(listMaintenanceTasksHandler)
);

router.post(
  '/tasks/:id/run',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(runMaintenanceTaskHandler)
);

// ------------------------------------------------------------------------------
// System Incidents
// ------------------------------------------------------------------------------
router.get(
  '/incidents',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ query: listIncidentsQuerySchema }),
  asyncHandler(listIncidentsHandler)
);

router.post(
  '/incidents',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_SCHEDULE),
  validate({ body: createIncidentSchema }),
  asyncHandler(createIncidentHandler)
);

router.patch(
  '/incidents/:id',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ params: idParamSchema, body: updateIncidentSchema }),
  asyncHandler(updateIncidentHandler)
);

// ------------------------------------------------------------------------------
// Fleet Equipment Service Logs
// ------------------------------------------------------------------------------
router.get(
  '/fleet',
  requirePermission(ADMIN_PERMISSIONS.MAINTENANCE_MANAGE),
  validate({ query: listEquipmentLogsQuerySchema }),
  asyncHandler(listEquipmentLogsHandler)
);

export default router;
