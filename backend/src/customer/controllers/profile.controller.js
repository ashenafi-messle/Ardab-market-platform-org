// ==============================================================================
// Ardab Market - Customer Profile Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  getCustomerProfile,
  updateCustomerProfile,
} from '../services/profile.service.js';

/**
 * GET /api/customer/profile
 * Retrieves authenticated customer profile.
 */
export async function getProfileHandler(req, res) {
  const customerId = req.customer.id;
  const profile = await getCustomerProfile(customerId);
  return ApiResponse.success(res, profile, 'Customer profile retrieved');
}

/**
 * PATCH /api/customer/profile
 * Updates allowed customer profile fields.
 */
export async function updateProfileHandler(req, res) {
  const customerId = req.customer.id;
  const updated = await updateCustomerProfile(customerId, req.body);
  return ApiResponse.success(res, updated, 'Profile updated successfully');
}
