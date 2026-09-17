// ==============================================================================
// Ardab Market - Payment Method Controller
// ==============================================================================

import {
  listPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  togglePaymentMethodStatus,
} from '../services/paymentMethod.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function getPaymentMethods(req, res) {
  const activeOnly = req.query.active === 'true';
  const methods = await listPaymentMethods({ activeOnly });
  return ApiResponse.success(res, methods, 'Payment methods retrieved successfully');
}

export async function getPaymentMethod(req, res) {
  const method = await getPaymentMethodById(req.params.id);
  return ApiResponse.success(res, method, 'Payment method retrieved successfully');
}

export async function createPaymentMethodHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const method = await createPaymentMethod(req.body, req.user, ipAddress);
  return ApiResponse.success(res, method, 'Payment method created successfully', 201);
}

export async function updatePaymentMethodHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const method = await updatePaymentMethod(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, method, 'Payment method updated successfully');
}

export async function togglePaymentMethodStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const method = await togglePaymentMethodStatus(req.params.id, req.body.isActive, req.user, ipAddress);
  return ApiResponse.success(res, method, 'Payment method status updated successfully');
}
