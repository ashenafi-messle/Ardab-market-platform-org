// ==============================================================================
// Ardab Market - Product & Product Image Controller
// ==============================================================================

import {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  setPrimaryProductImage,
  reorderProductImages,
} from '../services/product.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function getProducts(req, res) {
  const result = await listProducts(req.query);
  return ApiResponse.success(res, result, 'Products retrieved successfully');
}

export async function getProduct(req, res) {
  const product = await getProductById(req.params.id);
  return ApiResponse.success(res, product, 'Product details retrieved successfully');
}

export async function createProductHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const files = req.files || (req.file ? [req.file] : []);
  const product = await createProduct(req.body, files, req.user, ipAddress);
  return ApiResponse.success(res, product, 'Product created successfully', 201);
}

export async function updateProductHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const product = await updateProduct(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, product, 'Product updated successfully');
}

export async function toggleProductStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const targetStatus = req.body?.status || null;
  const product = await toggleProductStatus(req.params.id, targetStatus, req.user, ipAddress);
  return ApiResponse.success(res, product, 'Product status updated successfully');
}

export async function deleteProductHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await deleteProduct(req.params.id, req.user, ipAddress);
  return ApiResponse.success(res, result, 'Product archived successfully');
}

export async function addProductImageHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const image = await addProductImage(req.params.id, req.file, req.body, req.user, ipAddress);
  return ApiResponse.success(res, image, 'Product image uploaded successfully', 201);
}

export async function deleteProductImageHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await deleteProductImage(req.params.id, req.params.imageId, req.user, ipAddress);
  return ApiResponse.success(res, result, 'Product image deleted successfully');
}

export async function setPrimaryImageHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const image = await setPrimaryProductImage(req.params.id, req.params.imageId, req.user, ipAddress);
  return ApiResponse.success(res, image, 'Primary product image updated successfully');
}

export async function reorderImagesHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const images = await reorderProductImages(req.params.id, req.body.imageIds, req.user, ipAddress);
  return ApiResponse.success(res, images, 'Product images reordered successfully');
}
