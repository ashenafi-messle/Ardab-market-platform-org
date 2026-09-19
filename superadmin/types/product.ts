// ==============================================================================
// Ardab Market - Product & Marketplace Category TypeScript Definitions
// ==============================================================================

export interface CategoryPathItem {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface Category {
  id: string;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  imageUrl?: string | null;
  productCount: number;
  sellerCount?: number;
  childrenCount?: number;
  sortOrder?: number;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  children?: Category[];
  path?: CategoryPathItem[];
  createdAt: string;
  updatedAt?: string;
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';

export interface ProductSeller {
  id: string;
  companyName: string;
  name: string;
  phone?: string;
  city?: string;
  status?: string;
}

export interface ProductCategoryRelation {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
}

export interface ProductImageItem {
  id: string;
  productId?: string;
  url: string;
  publicId?: string;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  bytes?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type AttributeType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT' | 'DATE';
export type AttributeStatus = 'ACTIVE' | 'INACTIVE' | 'DEPRECATED';
export type LogisticsFieldMode = 'NOT_USED' | 'OPTIONAL' | 'REQUIRED';

export interface AttributeOption {
  id: string;
  attributeDefinitionId?: string;
  label: string;
  value: string;
  sortOrder: number;
  status?: AttributeStatus;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  description?: string | null;
  status: AttributeStatus;
  isSystem?: boolean;
  unit?: string | null;
  validationRules?: any;
  options: AttributeOption[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryAttributeItem {
  id: string;
  attributeDefinitionId: string;
  name: string;
  slug: string;
  type: AttributeType;
  description?: string | null;
  unit?: string | null;
  isRequired: boolean;
  isVisible: boolean;
  sortOrder: number;
  configuration?: any;
  source?: 'LOCAL' | 'INHERITED';
  originCategoryId?: string;
  originCategoryName?: string;
  options: AttributeOption[];
}

export interface CategoryLogisticsConfig {
  weightMode: LogisticsFieldMode;
  unitOfMeasureMode: LogisticsFieldMode;
  defaultUnit?: string | null;
}

export interface EffectiveCategoryAttributes {
  categoryId: string;
  categoryName: string;
  categoryPath: CategoryPathItem[];
  attributes: CategoryAttributeItem[];
  logistics: CategoryLogisticsConfig;
}

export interface CategoryLocalAttributesResponse {
  categoryId: string;
  categoryName: string;
  attributes: CategoryAttributeItem[];
  logistics: CategoryLogisticsConfig;
}

export interface ProductAttributeValueInput {
  attributeDefinitionId: string;
  optionId?: string | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
}

export interface ProductAttributeValueItem {
  id: string;
  attributeDefinitionId: string;
  name?: string | null;
  slug?: string | null;
  type?: AttributeType | null;
  unit?: string | null;
  optionId?: string | null;
  optionLabel?: string | null;
  optionValue?: string | null;
  valueText?: string | null;
  valueNumber?: number | null;
  valueBoolean?: boolean | null;
  valueDate?: string | null;
}

export interface Product {
  id: string;
  itemCode?: string; // Auto-generated server-side: ARDAB-XXXXXX (strictly immutable)
  sku?: string; // Legacy alias mapping to itemCode
  name: string;
  description?: string | null;
  sellerId: string; // Product Owner / Seller (Supplier ID)
  sellerName?: string; // Populated from seller.companyName
  seller?: ProductSeller;
  marketplaceCategoryId?: string;
  categoryId?: string; // Legacy alias mapping to marketplaceCategoryId
  category?: ProductCategoryRelation | string;
  categoryPath?: CategoryPathItem[];
  images?: (string | ProductImageItem)[];
  productImages?: ProductImageItem[];
  primaryImage?: ProductImageItem | null;
  imageUrl?: string; // Display alias mapping to primaryImage.url or images[0]
  unit?: string | null; // e.g. "kg", "bag", "quintal", "liter", "piece"
  weight?: number | null; // in KG
  weightKg?: number; // Legacy alias mapping to weight
  costPrice?: number | null;
  sellingPrice: number; // Final active selling price in ETB
  originalPrice?: number; // Legacy UI alias
  discountPercent?: number; // Legacy UI alias
  discountPrice?: number; // Legacy UI alias
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  cityAvailability: string[]; // e.g. ['All Cities'] or ['Gondar', 'Bahir Dar']
  status: ProductStatus;
  attributeValues?: ProductAttributeValueItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description?: string | null;
  sellerId: string;
  marketplaceCategoryId: string;
  unit?: string | null;
  weight?: number | null;
  costPrice?: number | null;
  sellingPrice: number;
  attributeValues?: ProductAttributeValueInput[];
  images?: string[];
  cityAvailability?: string[];
  status?: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  sellerId?: string;
  marketplaceCategoryId?: string;
  unit?: string | null;
  weight?: number | null;
  costPrice?: number | null;
  sellingPrice?: number;
  attributeValues?: ProductAttributeValueInput[];
  images?: string[];
  cityAvailability?: string[];
  status?: ProductStatus;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  city?: string;
  sellerId?: string;
  categoryId?: string;
  status?: string;
}

export interface ProductListResult {
  items: Product[];
  products?: Product[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
