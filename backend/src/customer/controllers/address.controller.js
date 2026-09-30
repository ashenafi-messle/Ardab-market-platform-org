// ==============================================================================
// Ardab Market - Customer Address Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  listAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
} from '../services/address.service.js';

/**
 * GET /api/customer/addresses
 * Retrieves all delivery addresses for the authenticated customer.
 */
export async function listAddressesHandler(req, res) {
  const customerId = req.customer.id;
  const addresses = await listAddresses(customerId);
  return ApiResponse.success(res, addresses, 'Addresses retrieved successfully');
}

/**
 * GET /api/customer/addresses/:addressId
 * Retrieves a single address.
 */
export async function getAddressByIdHandler(req, res) {
  const customerId = req.customer.id;
  const { addressId } = req.params;
  const address = await getAddressById(customerId, addressId);
  return ApiResponse.success(res, address, 'Address retrieved successfully');
}

/**
 * POST /api/customer/addresses
 * Creates a new address for the authenticated customer.
 */
export async function createAddressHandler(req, res) {
  const customerId = req.customer.id;
  const created = await createAddress(customerId, req.body);
  return ApiResponse.success(res, created, 'Address added successfully', 201);
}

/**
 * PATCH /api/customer/addresses/:addressId
 * Updates an address belonging to the authenticated customer.
 */
export async function updateAddressHandler(req, res) {
  const customerId = req.customer.id;
  const { addressId } = req.params;
  const updated = await updateAddress(customerId, addressId, req.body);
  return ApiResponse.success(res, updated, 'Address updated successfully');
}

/**
 * PATCH /api/customer/addresses/:addressId/default
 * Sets the default delivery address for the authenticated customer.
 */
export async function setDefaultAddressHandler(req, res) {
  const customerId = req.customer.id;
  const { addressId } = req.params;
  const defaultAddress = await setDefaultAddress(customerId, addressId);
  return ApiResponse.success(res, defaultAddress, 'Default address updated successfully');
}

/**
 * DELETE /api/customer/addresses/:addressId
 * Deletes an address belonging to the authenticated customer.
 */
export async function deleteAddressHandler(req, res) {
  const customerId = req.customer.id;
  const { addressId } = req.params;
  const result = await deleteAddress(customerId, addressId);
  return ApiResponse.success(res, result, 'Address deleted successfully');
}
