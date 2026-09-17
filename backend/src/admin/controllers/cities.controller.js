// ==============================================================================
// Ardab Market - Operational Cities Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { citiesService } from '../services/cities.service.js';

/**
 * GET /api/admin/cities
 * List all operational cities. Pass ?includeInactive=true for inactive ones too.
 */
export async function listCitiesHandler(req, res) {
  const includeInactive = req.query.includeInactive === 'true';
  const cities = await citiesService.listCities({ includeInactive });
  return ApiResponse.success(res, cities, 'Operational cities retrieved successfully');
}

/**
 * GET /api/admin/cities/health
 * Get health overview (incident + maintenance counts) per city.
 */
export async function getCityHealthOverviewHandler(req, res) {
  const overview = await citiesService.getCityHealthOverview();
  return ApiResponse.success(res, overview, 'City health overview retrieved successfully');
}

/**
 * GET /api/admin/cities/:id
 * Get a single city by ID.
 */
export async function getCityByIdHandler(req, res) {
  const city = await citiesService.getCityById(req.params.id);
  return ApiResponse.success(res, city, 'Operational city retrieved successfully');
}

/**
 * POST /api/admin/cities
 * Create a new operational city.
 */
export async function createCityHandler(req, res) {
  const city = await citiesService.createCity(req.body);
  return ApiResponse.success(res, city, 'Operational city created successfully', 201);
}

/**
 * PATCH /api/admin/cities/:id
 * Update a city's details.
 */
export async function updateCityHandler(req, res) {
  const updated = await citiesService.updateCity(req.params.id, req.body);
  return ApiResponse.success(res, updated, 'Operational city updated successfully');
}

/**
 * PATCH /api/admin/cities/:id/status
 * Toggle a city's active status.
 */
export async function toggleCityStatusHandler(req, res) {
  const isActive = Boolean(req.body.isActive);
  const updated = await citiesService.toggleCityStatus(req.params.id, isActive);
  return ApiResponse.success(res, updated, `City ${isActive ? 'activated' : 'deactivated'} successfully`);
}
