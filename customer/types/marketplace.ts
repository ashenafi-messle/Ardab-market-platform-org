export interface CustomerUser {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  city: string;
  deliveryZone?: string | null;
  status: string;
  verificationStatus: string;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  };
}

export interface CustomerProduct {
  id: string;
  itemCode: string;
  name: string;
  description?: string | null;
  sellerId: string;
  marketplaceCategoryId: string;
  unit?: string | null;
  weight?: number | null;
  costPrice?: number | null;
  sellingPrice: number;
  price?: number;
  compareAtPrice?: number | null;
  stock?: number;
  status: string;
  cityAvailability: string[];
  createdAt: string;
  rating?: {
    average: number | null;
    count: number;
  };
  averageRating?: number | null;
  reviewCount?: number;
  ratingCount?: number;
  seller?: {
    id: string;
    companyName: string;
    businessName?: string;
    name: string;
    phone?: string;
    city?: string;
    status: string;
    user?: {
      id: string;
      fullName?: string;
    };
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
  };
  categoryPath?: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  }>;
  images: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
    sortOrder: number;
    thumbnailUrl?: string;
  }>;
  primaryImage?: {
    url: string;
  } | null;
  attributes?: Record<string, any>;
  attributeValues?: Array<{
    id: string;
    name: string | null;
    slug: string | null;
    type: string | null;
    unit: string | null;
    optionLabel: string | null;
    optionValue: string | null;
    valueText: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
  }>;
}

export interface CustomerCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
  _count?: {
    products: number;
  };
  children?: CustomerCategory[];
}

export interface CartItem {
  id?: string;
  productId: string;
  product: CustomerProduct;
  quantity: number;
  selectedAttributes?: Record<string, string>;
}

export interface OperationalCity {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  timezone?: string;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  provider?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface OrderItemSnapshot {
  id: string;
  productId: string;
  productName: string;
  itemCode: string;
  unit: string;
  quantity: number;
  unitPriceEtb: number;
  unitPrice?: number;
  totalPriceEtb: number;
  sellerName: string;
  product?: {
    id?: string;
    name: string;
  };
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  city: string;
  shippingCity?: string;
  deliveryZone?: string | null;
  shippingZone?: string | null;
  deliveryAddress: string;
  streetAddress?: string;
  recipientName?: string;
  recipientPhone?: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotalEtb: number;
  deliveryFeeEtb: number;
  discountEtb: number;
  totalEtb: number;
  totalAmount?: number;
  totalWeightKg: number;
  placedAt: string;
  createdAt?: string;
  items: OrderItemSnapshot[];
  timeline: Array<{
    status: string;
    timestamp: string;
    description: string;
  }>;
}
