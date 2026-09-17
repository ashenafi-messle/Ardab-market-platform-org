// ==============================================================================
// Ardab Market - Operational Cities Service
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { logger } from '../../shared/utils/logger.js';

export const citiesService = {
  /**
   * List all operational cities (optionally all or only active).
   */
  listCities: async ({ includeInactive = false } = {}) => {
    const where = includeInactive ? {} : { isActive: true };

    const cities = await prisma.operationalCity.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      isActive: c.isActive,
      latitude: c.latitude ? parseFloat(c.latitude.toString()) : null,
      longitude: c.longitude ? parseFloat(c.longitude.toString()) : null,
      timezone: c.timezone,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  },

  /**
   * Get a city by ID.
   */
  getCityById: async (id) => {
    const city = await prisma.operationalCity.findUnique({ where: { id } });
    if (!city) {
      throw new ApiError(404, 'Operational city not found', 'CITY_NOT_FOUND');
    }
    return city;
  },

  /**
   * Create a new operational city.
   */
  createCity: async ({ name, code, description, latitude, longitude, timezone, isActive = true }) => {
    if (!name || !code) {
      throw new ApiError(400, 'City name and code are required', 'VALIDATION_ERROR');
    }

    // Check uniqueness
    const existing = await prisma.operationalCity.findFirst({
      where: { OR: [{ name: { equals: name, mode: 'insensitive' } }, { code: { equals: code, mode: 'insensitive' } }] },
    });

    if (existing) {
      throw new ApiError(
        409,
        `A city with the same ${existing.name.toLowerCase() === name.toLowerCase() ? 'name' : 'code'} already exists`,
        'DUPLICATE_CITY'
      );
    }

    const city = await prisma.operationalCity.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        latitude: latitude || null,
        longitude: longitude || null,
        timezone: timezone || 'Africa/Addis_Ababa',
        isActive,
      },
    });

    logger.info(`Operational city created: "${name}" (${code})`);
    return city;
  },

  /**
   * Update a city's fields.
   */
  updateCity: async (id, data) => {
    const city = await prisma.operationalCity.findUnique({ where: { id } });
    if (!city) {
      throw new ApiError(404, 'Operational city not found', 'CITY_NOT_FOUND');
    }

    const updated = await prisma.operationalCity.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code.toUpperCase() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    logger.info(`Operational city updated: "${city.name}"`);
    return updated;
  },

  /**
   * Toggle the active status of a city.
   */
  toggleCityStatus: async (id, isActive) => {
    const city = await prisma.operationalCity.findUnique({ where: { id } });
    if (!city) {
      throw new ApiError(404, 'Operational city not found', 'CITY_NOT_FOUND');
    }

    const updated = await prisma.operationalCity.update({
      where: { id },
      data: { isActive },
    });

    logger.info(`Operational city "${city.name}" set to ${isActive ? 'active' : 'inactive'}`);
    return updated;
  },

  /**
   * Get health overview for each city (incident + maintenance counts).
   */
  getCityHealthOverview: async () => {
    const cities = await prisma.operationalCity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const cityIds = cities.map((c) => c.id);

    const [incidentCounts, maintenanceCounts] = await Promise.all([
      prisma.systemIncident.groupBy({
        by: ['cityId'],
        where: { cityId: { in: cityIds }, status: { notIn: ['RESOLVED', 'CLOSED'] } },
        _count: { id: true },
      }),
      prisma.maintenanceRecord.groupBy({
        by: ['cityId'],
        where: { cityId: { in: cityIds }, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
        _count: { id: true },
      }),
    ]);

    const incidentMap = Object.fromEntries(incidentCounts.map((i) => [i.cityId, i._count.id]));
    const maintenanceMap = Object.fromEntries(maintenanceCounts.map((m) => [m.cityId, m._count.id]));

    return cities.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      isActive: c.isActive,
      timezone: c.timezone,
      openIncidents: incidentMap[c.id] || 0,
      activeMaintenance: maintenanceMap[c.id] || 0,
    }));
  },
};
