// ==============================================================================
// Ardab Market - Product & Marketplace Category TypeScript Definitions
// ==============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  productCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
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
  images?: (string | ProductImageItem)[];
  productImages?: ProductImageItem[];
  primaryImage?: ProductImageItem | null;
  imageUrl?: string; // Display alias mapping to primaryImage.url or images[0]
  unit: string; // e.g. "kg", "bag", "quintal", "liter", "piece"
  weight?: number; // in KG
  weightKg?: number; // Legacy alias mapping to weight
  costPrice?: number | null;
  sellingPrice: number; // Final active selling price in ETB
  originalPrice?: number; // Legacy UI alias
  discountPercent?: number; // Legacy UI alias
  discountPrice?: number; // Legacy UI alias
  availability?: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  cityAvailability: string[]; // e.g. ['All Cities'] or ['Gondar', 'Bahir Dar']
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}


export interface CreateProductInput {
  name: string;
  description?: string | null;
  sellerId: string;
  marketplaceCategoryId: string;
  unit: string;
  weight: number;
  costPrice?: number | null;
  sellingPrice: number;
  images?: string[];
  cityAvailability?: string[];
  status?: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  sellerId?: string;
  marketplaceCategoryId?: string;
  unit?: string;
  weight?: number;
  costPrice?: number | null;
  sellingPrice?: number;
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
