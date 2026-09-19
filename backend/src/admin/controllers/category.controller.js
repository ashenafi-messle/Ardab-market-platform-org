// ==============================================================================
// Ardab Market - Hierarchical Category Controller
// ==============================================================================

import {
  listCategories,
  getCategoryTree,
  getCategoryById,
  getCategoryChildren,
  getCategoryPath,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  moveCategory,
  deleteCategory,
  getSellerCategories,
  assignCategoryToSeller,
  removeCategoryFromSeller,
} from '../services/category.service.js';
import {
  getCategoryLocalAttributes,
  updateCategoryLocalAttributes,
  resolveEffectiveCategoryAttributes,
} from '../services/categoryAttribute.service.js';
import { uploadImageToStorage } from '../services/productImage.service.js';
import { ApiResponse, ApiError } from '../../shared/utils/apiResponse.js';

export async function getCategoryAttributesHandler(req, res) {
  const result = await getCategoryLocalAttributes(req.params.id);
  return ApiResponse.success(res, result, 'Category attributes retrieved successfully');
}

export async function updateCategoryAttributesHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await updateCategoryLocalAttributes(req.params.id, req.body, req.user, ipAddress);
  return ApiResponse.success(res, result, 'Category attributes updated successfully');
}

export async function getEffectiveCategoryAttributesHandler(req, res) {
  const result = await resolveEffectiveCategoryAttributes(req.params.id);
  return ApiResponse.success(res, result, 'Effective category attributes resolved successfully');
}

export async function uploadCategoryImageHandler(req, res) {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('No category image file uploaded', 'MISSING_IMAGE_FILE');
  }

  const uploadResult = await uploadImageToStorage(req.file.buffer, {
    folder: 'ardab-market/categories',
  });

  return ApiResponse.success(
    res,
    {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    },
    'Category image uploaded to Cloudinary successfully',
    201
  );
}

export async function getCategories(req, res) {
  const categories = await listCategories(req.query);
  return ApiResponse.success(res, categories, 'Categories retrieved successfully');
}

export async function getCategoryTreeHandler(req, res) {
  const tree = await getCategoryTree(req.query);
  return ApiResponse.success(res, tree, 'Category tree retrieved successfully');
}

export async function getCategory(req, res) {
  const category = await getCategoryById(req.params.id);
  return ApiResponse.success(res, category, 'Category retrieved successfully');
}

export async function getCategoryChildrenHandler(req, res) {
  const children = await getCategoryChildren(req.params.id, req.query);
  return ApiResponse.success(res, children, 'Category children retrieved successfully');
}

export async function getCategoryBreadcrumbsHandler(req, res) {
  const breadcrumbs = await getCategoryPath(req.params.id);
  return ApiResponse.success(res, breadcrumbs, 'Category breadcrumbs retrieved successfully');
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

export async function updateCategoryStatusHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const category = await updateCategoryStatus(req.params.id, req.body.isActive, req.user, ipAddress);
  return ApiResponse.success(res, category, 'Category status updated successfully');
}

export async function moveCategoryHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const category = await moveCategory(req.params.id, req.body.targetParentId, req.user, ipAddress);
  return ApiResponse.success(res, category, 'Category moved successfully');
}

export async function deleteCategoryHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await deleteCategory(req.params.id, req.user, ipAddress);
  return ApiResponse.success(res, result, 'Category deleted successfully');
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
