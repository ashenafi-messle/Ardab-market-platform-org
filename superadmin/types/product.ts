export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  productCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryId: string;
  sellerId: string; // Product Owner / Seller (Supplier ID)
  sellerName: string; // Name of the seller / supplier owning this product
  description: string;
  sellingPrice: number; // Final active selling price in ETB
  originalPrice: number; // Original base price before discount
  discountPercent: number; // e.g. 0 for no discount, 15 for 15% off
  discountPrice?: number; // Discounted promotional price in ETB
  weightKg: number; // in KG for delivery logistics allocation
  unit: string; // e.g. "bag", "bucket", "tin", "jerrycan", "kg"
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'LIMITED';
  cityAvailability: string[]; // e.g. ['Gondar', 'Bahir Dar', 'Addis Ababa']
  status: 'ACTIVE' | 'INACTIVE';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
