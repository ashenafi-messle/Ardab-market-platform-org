// ==============================================================================
// Ardab Market - Attribute Definition Controller
// ==============================================================================

import {
  listAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deactivateAttribute,
} from '../services/attribute.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function getAttributesHandler(req, res) {
  const attributes = await listAttributes(req.query);
  return ApiResponse.success(res, attributes, 'Attributes retrieved successfully');
}

export async function getAttributeHandler(req, res) {
  const attribute = await getAttributeById(req.params.id);
  return ApiResponse.success(res, attribute, 'Attribute retrieved successfully');
}

export async function createAttributeHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const attribute = await createAttribute(req.body, req.user, ipAddress);
  return ApiResponse.success(res, attribute, 'Attribute created successfully', 201);
}

export async function updateAttributeHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const attribute = await updateAttribute(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, attribute, 'Attribute updated successfully');
}

export async function deactivateAttributeHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const attribute = await deactivateAttribute(req.params.id, req.user, ipAddress);
  return ApiResponse.success(res, attribute, 'Attribute deactivated successfully');
}
