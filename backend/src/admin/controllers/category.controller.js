// ==============================================================================
// Ardab Market - Category Controller
// ==============================================================================

import {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  getSellerCategories,
  assignCategoryToSeller,
  removeCategoryFromSeller,
} from '../services/category.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function getCategories(req, res) {
  const categories = await listCategories(req.query);
  return ApiResponse.success(res, categories, 'Categories retrieved successfully');
}

export async function getCategory(req, res) {
  const category = await getCategoryById(req.params.id);
  return ApiResponse.success(res, category, 'Category retrieved successfully');
}

export async function createCategoryHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const category = await createCategory(req.body, req.user, ipAddress);
  return ApiResponse.success(res, category, 'Category created successfully', 201);
}

export async function updateCategoryHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const category = await updateCategory(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, category, 'Category updated successfully');
}

export async function getSellerCategoriesHandler(req, res) {
  const categories = await getSellerCategories(req.params.sellerId);
  return ApiResponse.success(res, categories, 'Seller marketplace categories retrieved successfully');
}

export async function assignCategoryToSellerHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const assignment = await assignCategoryToSeller(req.params.sellerId, req.body.categoryId, req.user, ipAddress);
  return ApiResponse.success(res, assignment, 'Category assigned to seller successfully', 201);
}

export async function removeCategoryFromSellerHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await removeCategoryFromSeller(req.params.sellerId, req.params.categoryId, req.user, ipAddress);
  return ApiResponse.success(res, result, 'Category removed from seller successfully');
}
