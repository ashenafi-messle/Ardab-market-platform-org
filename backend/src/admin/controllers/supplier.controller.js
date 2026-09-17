// ==============================================================================
// Ardab Market - Supplier Controller
// ==============================================================================

import {
  listSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  toggleSupplierStatus,
} from '../services/supplier.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function getSuppliers(req, res) {
  const result = await listSuppliers(req.query);
  return ApiResponse.success(res, result, 'Suppliers retrieved successfully');
}

export async function getSupplier(req, res) {
  const supplier = await getSupplierById(req.params.id);
  return ApiResponse.success(res, supplier, 'Supplier details retrieved successfully');
}

export async function createSupplierHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const supplier = await createSupplier(req.body, req.user, ipAddress);
  return ApiResponse.success(res, supplier, 'Supplier registered successfully', 201);
}

export async function updateSupplierHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const supplier = await updateSupplier(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, supplier, 'Supplier updated successfully');
}

export async function toggleSupplierStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const targetStatus = req.body?.status || null;
  const supplier = await toggleSupplierStatus(req.params.id, targetStatus, req.user, ipAddress);
  return ApiResponse.success(res, supplier, 'Supplier status updated successfully');
}
