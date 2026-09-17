// ==============================================================================
// Ardab Market - Maintenance & System Health Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

// ---------------------------------------------------------------------------
// System Components (Services) — live health snapshots
// ---------------------------------------------------------------------------

export const maintenanceService = {
  /**
   * List all active system components with their health status.
   */
  listSystemComponents: async () => {
    const components = await prisma.systemComponent.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return components.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      category: c.category,
      description: c.description,
      serverNode: c.serverNode,
      status: c.status,
      latencyMs: c.latencyMs,
      uptimePercentage: parseFloat(c.uptimePercentage.toString()),
      lastChecked: c.lastCheckedAt
        ? new Date(c.lastCheckedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null,
      lastCheckedAt: c.lastCheckedAt,
      isActive: c.isActive,
    }));
  },

  /**
   * Record a new health check result for a component.
   * This also updates the component's live status fields.
   */
  recordHealthCheck: async ({ componentId, cityId, status, latencyMs, httpStatus, message, metadata }) => {
    const component = await prisma.systemComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new ApiError(404, 'System component not found', 'COMPONENT_NOT_FOUND');
    }

    // Create health check record
    const healthCheck = await prisma.systemHealthCheck.create({
      data: {
        componentId,
        cityId: cityId || null,
        status,
        latencyMs: latencyMs || 0,
        httpStatus: httpStatus || null,
        message: message || null,
        metadata: metadata || null,
      },
    });

    // Update the component's live metrics
    await prisma.systemComponent.update({
      where: { id: componentId },
      data: {
        status,
        latencyMs: latencyMs || component.latencyMs,
        lastCheckedAt: new Date(),
      },
    });

    logger.info(`Health check recorded for component ${component.name}: ${status}`);
    return healthCheck;
  },

  /**
   * Get recent health check history for a specific component.
   */
  getComponentHealthHistory: async (componentId, limit = 50) => {
    const component = await prisma.systemComponent.findUnique({
      where: { id: componentId },
    });

    if (!component) {
      throw new ApiError(404, 'System component not found', 'COMPONENT_NOT_FOUND');
    }

    const history = await prisma.systemHealthCheck.findMany({
      where: { componentId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
      include: {
        city: { select: { id: true, name: true, code: true } },
      },
    });

    return { component, history };
  },

  // ---------------------------------------------------------------------------
  // Maintenance Windows (Records)
  // ---------------------------------------------------------------------------

  /**
   * List maintenance records with optional filters.
   */
  listMaintenanceWindows: async ({
    page = 1,
    limit = 20,
    status,
    maintenanceType,
    priority,
    cityId,
    search,
    sortBy = 'scheduledStart',
    sortOrder = 'desc',
  } = {}) => {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {};

    if (status && status !== 'ALL') where.status = status;
    if (maintenanceType && maintenanceType !== 'ALL') where.maintenanceType = maintenanceType;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (cityId && cityId !== 'ALL') where.cityId = cityId;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { createdByName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const allowedSort = ['scheduledStart', 'createdAt', 'title', 'priority', 'status'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'scheduledStart';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, records] = await Promise.all([
      prisma.maintenanceRecord.count({ where }),
      prisma.maintenanceRecord.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip,
        take,
        include: {
          city: { select: { id: true, name: true, code: true } },
          createdByAdmin: { select: { id: true, name: true, email: true } },
          completedByAdmin: { select: { id: true, name: true } },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      }),
    ]);

    const items = records.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      maintenanceType: r.maintenanceType,
      status: r.status,
      priority: r.priority,
      scope: r.scope,
      affectedServices: r.affectedServices,
      announcedToUsers: r.announcedToUsers,
      cityId: r.cityId,
      city: r.city,
      scheduledStart: r.scheduledStart,
      scheduledEnd: r.scheduledEnd,
      actualStart: r.actualStart,
      actualEnd: r.actualEnd,
      createdById: r.createdById,
      createdByAdmin: r.createdByAdmin,
      createdByName: r.createdByName,
      completedByAdmin: r.completedByAdmin,
      completedAt: r.completedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      // Frontend-friendly aliases
      scheduledStartTime: r.scheduledStart ? formatMaintenanceDate(r.scheduledStart) : null,
      scheduledEndTime: r.scheduledEnd ? formatMaintenanceDate(r.scheduledEnd) : 'Open window',
      createdBy: r.createdByAdmin?.name || r.createdByName || 'System',
    }));

    return {
      items,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  /**
   * Get a single maintenance record by ID.
   */
  getMaintenanceWindowById: async (id) => {
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, code: true } },
        createdByAdmin: { select: { id: true, name: true, email: true } },
        completedByAdmin: { select: { id: true, name: true } },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!record) {
      throw new ApiError(404, 'Maintenance window not found', 'MAINTENANCE_NOT_FOUND');
    }

    return {
      ...record,
      scheduledStartTime: record.scheduledStart ? formatMaintenanceDate(record.scheduledStart) : null,
      scheduledEndTime: record.scheduledEnd ? formatMaintenanceDate(record.scheduledEnd) : 'Open window',
      createdBy: record.createdByAdmin?.name || record.createdByName || 'System',
    };
  },

  /**
   * Create a new maintenance window.
   */
  createMaintenanceWindow: async (data, adminUser) => {
    const {
      title,
      description,
      maintenanceType = 'SCHEDULED',
      priority = 'NORMAL',
      scope = 'SERVICE',
      affectedServices = [],
      announcedToUsers = true,
      cityId,
      scheduledStart,
      scheduledEnd,
    } = data;

    if (!title || !scheduledStart) {
      throw new ApiError(400, 'Title and scheduledStart are required', 'VALIDATION_ERROR');
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        title,
        description: description || null,
        maintenanceType,
        status: 'SCHEDULED',
        priority,
        scope,
        affectedServices: Array.isArray(affectedServices) ? affectedServices : [affectedServices],
        announcedToUsers,
        cityId: cityId || null,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
        createdById: adminUser?.id || null,
        createdByName: adminUser?.name || null,
      },
      include: {
        city: { select: { id: true, name: true, code: true } },
        createdByAdmin: { select: { id: true, name: true, email: true } },
      },
    });

    // Record initial status in history
    await prisma.maintenanceStatusHistory.create({
      data: {
        maintenanceId: record.id,
        previousStatus: 'PLANNED',
        newStatus: 'SCHEDULED',
        changedById: adminUser?.id || null,
        reason: 'Initial schedule',
      },
    });

    logger.info(`Maintenance window created: "${title}" by ${adminUser?.name || 'system'}`);

    return {
      ...record,
      scheduledStartTime: formatMaintenanceDate(record.scheduledStart),
      scheduledEndTime: record.scheduledEnd ? formatMaintenanceDate(record.scheduledEnd) : 'Open window',
      createdBy: record.createdByAdmin?.name || record.createdByName || 'System',
    };
  },

  /**
   * Update the status of a maintenance window.
   */
  updateMaintenanceWindowStatus: async (id, newStatus, reason, adminUser) => {
    const validStatuses = ['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 'INVALID_STATUS');
    }

    const record = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!record) {
      throw new ApiError(404, 'Maintenance window not found', 'MAINTENANCE_NOT_FOUND');
    }

    const previousStatus = record.status;

    const updateData = {
      status: newStatus,
    };

    if (newStatus === 'IN_PROGRESS' && !record.actualStart) {
      updateData.actualStart = new Date();
    }

    if (newStatus === 'COMPLETED') {
      updateData.actualEnd = new Date();
      updateData.completedById = adminUser?.id || null;
      updateData.completedAt = new Date();
    }

    const [updated] = await prisma.$transaction([
      prisma.maintenanceRecord.update({
        where: { id },
        data: updateData,
        include: {
          city: { select: { id: true, name: true, code: true } },
          createdByAdmin: { select: { id: true, name: true, email: true } },
          completedByAdmin: { select: { id: true, name: true } },
        },
      }),
      prisma.maintenanceStatusHistory.create({
        data: {
          maintenanceId: id,
          previousStatus,
          newStatus,
          changedById: adminUser?.id || null,
          reason: reason || null,
        },
      }),
    ]);

    logger.info(
      `Maintenance window "${record.title}" status changed: ${previousStatus} → ${newStatus} by ${adminUser?.name || 'system'}`
    );

    return {
      ...updated,
      scheduledStartTime: formatMaintenanceDate(updated.scheduledStart),
      scheduledEndTime: updated.scheduledEnd ? formatMaintenanceDate(updated.scheduledEnd) : 'Open window',
      createdBy: updated.createdByAdmin?.name || updated.createdByName || 'System',
    };
  },

  // ---------------------------------------------------------------------------
  // Maintenance Tasks
  // ---------------------------------------------------------------------------

  /**
   * List all maintenance tasks.
   */
  listMaintenanceTasks: async ({ category, status } = {}) => {
    const where = {};
    if (category && category !== 'ALL') where.category = category;
    if (status && status !== 'ALL') where.status = status;

    const tasks = await prisma.maintenanceTask.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        lastTriggeredByAdmin: { select: { id: true, name: true } },
      },
    });

    return tasks.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      frequency: t.frequency,
      status: t.status,
      lastRun: t.lastRunAt
        ? new Date(t.lastRunAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Never',
      lastRunAt: t.lastRunAt,
      lastDurationMs: t.lastDurationMs,
      lastTriggeredBy: t.lastTriggeredByAdmin?.name || null,
    }));
  },

  /**
   * Manually trigger/run a maintenance task.
   * Simulates execution, updates last run time and duration.
   */
  runMaintenanceTask: async (taskId, adminUser) => {
    const task = await prisma.maintenanceTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(404, 'Maintenance task not found', 'TASK_NOT_FOUND');
    }

    // Simulate task execution
    const startMs = Date.now();
    const simulatedDurationMs = Math.floor(Math.random() * 1200) + 300; // 300-1500ms

    const updated = await prisma.maintenanceTask.update({
      where: { id: taskId },
      data: {
        status: 'SUCCESS',
        lastRunAt: new Date(),
        lastDurationMs: simulatedDurationMs,
        lastTriggeredById: adminUser?.id || null,
      },
      include: {
        lastTriggeredByAdmin: { select: { id: true, name: true } },
      },
    });

    logger.info(`Maintenance task "${task.name}" executed in ${simulatedDurationMs}ms by ${adminUser?.name || 'system'}`);

    return {
      id: updated.id,
      name: updated.name,
      category: updated.category,
      description: updated.description,
      frequency: updated.frequency,
      status: updated.status,
      lastRun: 'Just now',
      lastRunAt: updated.lastRunAt,
      lastDurationMs: updated.lastDurationMs,
      lastTriggeredBy: updated.lastTriggeredByAdmin?.name || null,
    };
  },

  // ---------------------------------------------------------------------------
  // System Incidents
  // ---------------------------------------------------------------------------

  /**
   * List system incidents with filters.
   */
  listIncidents: async ({
    page = 1,
    limit = 20,
    status,
    severity,
    cityId,
    componentId,
    search,
    sortBy = 'detectedAt',
    sortOrder = 'desc',
  } = {}) => {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (severity && severity !== 'ALL') where.severity = severity;
    if (cityId && cityId !== 'ALL') where.cityId = cityId;
    if (componentId && componentId !== 'ALL') where.componentId = componentId;

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const allowedSort = ['detectedAt', 'severity', 'status', 'createdAt'];
    const orderField = allowedSort.includes(sortBy) ? sortBy : 'detectedAt';
    const orderDir = sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, incidents] = await Promise.all([
      prisma.systemIncident.count({ where }),
      prisma.systemIncident.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip,
        take,
        include: {
          component: { select: { id: true, name: true, code: true } },
          city: { select: { id: true, name: true } },
          createdByAdmin: { select: { id: true, name: true } },
          assignedToAdmin: { select: { id: true, name: true } },
          resolvedByAdmin: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      items: incidents,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  /**
   * Create a new system incident.
   */
  createIncident: async (data, adminUser) => {
    const {
      title,
      description,
      incidentType = 'SERVICE_DEGRADATION',
      severity = 'MEDIUM',
      componentId,
      cityId,
    } = data;

    if (!title) {
      throw new ApiError(400, 'Incident title is required', 'VALIDATION_ERROR');
    }

    const incident = await prisma.systemIncident.create({
      data: {
        title,
        description: description || null,
        incidentType,
        severity,
        status: 'OPEN',
        componentId: componentId || null,
        cityId: cityId || null,
        detectedAt: new Date(),
        createdById: adminUser?.id || null,
      },
      include: {
        component: { select: { id: true, name: true, code: true } },
        city: { select: { id: true, name: true } },
        createdByAdmin: { select: { id: true, name: true } },
      },
    });

    logger.info(`Incident created: "${title}" (${severity}) by ${adminUser?.name || 'system'}`);
    return incident;
  },

  /**
   * Update incident status/resolution.
   */
  updateIncidentStatus: async (id, { status, resolutionNotes, assignedToId }, adminUser) => {
    const incident = await prisma.systemIncident.findUnique({ where: { id } });
    if (!incident) {
      throw new ApiError(404, 'Incident not found', 'INCIDENT_NOT_FOUND');
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
    if (assignedToId) updateData.assignedToId = assignedToId;

    if (status === 'INVESTIGATING' && !incident.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
    }

    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = adminUser?.id || null;
    }

    const updated = await prisma.systemIncident.update({
      where: { id },
      data: updateData,
      include: {
        component: { select: { id: true, name: true, code: true } },
        city: { select: { id: true, name: true } },
        createdByAdmin: { select: { id: true, name: true } },
        assignedToAdmin: { select: { id: true, name: true } },
        resolvedByAdmin: { select: { id: true, name: true } },
      },
    });

    logger.info(`Incident "${incident.title}" updated: status=${status} by ${adminUser?.name || 'system'}`);
    return updated;
  },

  // ---------------------------------------------------------------------------
  // Fleet Equipment Logs
  // ---------------------------------------------------------------------------

  /**
   * List fleet equipment logs with optional city filter.
   */
  listEquipmentLogs: async ({ page = 1, limit = 50, cityId, cityName, status, vehicleId } = {}) => {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const where = {};
    if (cityId && cityId !== 'ALL') where.cityId = cityId;
    if (cityName && cityName !== 'All Cities') where.cityName = { contains: cityName, mode: 'insensitive' };
    if (status && status !== 'ALL') where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    const [total, logs] = await Promise.all([
      prisma.fleetEquipmentLog.count({ where }),
      prisma.fleetEquipmentLog.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        skip,
        take,
        include: {
          city: { select: { id: true, name: true } },
          vehicle: { select: { id: true, registrationNumber: true, vehicleType: true } },
        },
      }),
    ]);

    const items = logs.map((l) => ({
      id: l.id,
      vehicleId: l.vehicleId,
      vehicleReg: l.vehicleReg,
      serviceType: l.serviceType,
      city: l.city?.name || l.cityName,
      cityId: l.cityId,
      workshopLocation: l.workshopLocation,
      costEtb: parseFloat(l.costEtb.toString()),
      scheduledDate: l.scheduledDate
        ? new Date(l.scheduledDate).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : null,
      scheduledDateRaw: l.scheduledDate,
      status: l.status,
      technicianNotes: l.technicianNotes,
    }));

    return {
      items,
      pagination: {
        page: Number(page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // Maintenance Statistics Dashboard
  // ---------------------------------------------------------------------------

  /**
   * Aggregate maintenance + health stats for the dashboard.
   */
  getMaintenanceStatistics: async () => {
    const [
      totalComponents,
      healthyComponents,
      degradedComponents,
      offlineComponents,
      maintenanceComponents,
      scheduledWindows,
      inProgressWindows,
      completedWindows,
      openIncidents,
      criticalIncidents,
      totalTasks,
      failedTasks,
      upcomingMaintenance,
    ] = await Promise.all([
      prisma.systemComponent.count({ where: { isActive: true } }),
      prisma.systemComponent.count({ where: { isActive: true, status: 'HEALTHY' } }),
      prisma.systemComponent.count({ where: { isActive: true, status: 'DEGRADED' } }),
      prisma.systemComponent.count({ where: { isActive: true, status: 'OFFLINE' } }),
      prisma.systemComponent.count({ where: { isActive: true, status: 'MAINTENANCE' } }),
      prisma.maintenanceRecord.count({ where: { status: 'SCHEDULED' } }),
      prisma.maintenanceRecord.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.maintenanceRecord.count({ where: { status: 'COMPLETED' } }),
      prisma.systemIncident.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      prisma.systemIncident.count({ where: { severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      prisma.maintenanceTask.count({}),
      prisma.maintenanceTask.count({ where: { status: 'FAILED' } }),
      prisma.maintenanceRecord.count({
        where: {
          status: { in: ['SCHEDULED', 'PLANNED'] },
          scheduledStart: { gte: new Date() },
        },
      }),
    ]);

    const healthPercentage =
      totalComponents > 0 ? Math.round((healthyComponents / totalComponents) * 100) : 100;

    return {
      components: {
        total: totalComponents,
        healthy: healthyComponents,
        degraded: degradedComponents,
        offline: offlineComponents,
        maintenance: maintenanceComponents,
        healthPercentage,
      },
      maintenanceWindows: {
        scheduled: scheduledWindows,
        inProgress: inProgressWindows,
        completed: completedWindows,
        upcoming: upcomingMaintenance,
      },
      incidents: {
        open: openIncidents,
        critical: criticalIncidents,
      },
      tasks: {
        total: totalTasks,
        failed: failedTasks,
        successRate:
          totalTasks > 0 ? Math.round(((totalTasks - failedTasks) / totalTasks) * 100) : 100,
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatMaintenanceDate(date) {
  if (!date) return null;
  return new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
