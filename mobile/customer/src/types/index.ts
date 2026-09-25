export interface Seller {
  id: string;
  name: string;
  verified: boolean;
  rating: number;
  salesCount: number;
  city: string;
  responseRate?: string;
}

export interface ProductAttribute {
  name: string;
  options: string[];
}

export interface CategoryPathItem {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  nameAmharic?: string;
  slug: string;
  icon?: string;
  image?: string;
  imageUrl?: string;
  bannerImage?: string;
  parentId?: string | null;
  productCount: number;
  featured?: boolean;
  children: CategoryTreeNode[];
}

export interface Pagination {
  page: number;
  pageSize?: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasNextPage?: boolean;
  hasPrev: boolean;
  hasPrevPage?: boolean;
}

export interface ProductListResponse {
  items: Product[];
  pagination: Pagination;
}

export interface Product {
  id: string;
  itemCode?: string;
  name: string;
  nameAmharic?: string;
  description: string;
  price: number;
  oldPrice?: number;
  discountPercentage?: number;
  rating: number;
  averageRating?: number | null;
  reviewCount: number;
  ratingCount?: number;
  soldCount: number;
  images: string[];
  primaryImage?: { id?: string; url: string; publicId?: string; isPrimary?: boolean };
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  categoryPath?: CategoryPathItem[];
  seller: Seller;
  stock: number;
  unit?: string; // e.g. 'kg', 'pack', 'piece', 'quintal'
  attributes?: Record<string, string[]>;
  isFlashDeal?: boolean;
  isPopular?: boolean;
  isRecommended?: boolean;
  origin?: string; // e.g., 'Gondar', 'Yirgacheffe', 'Jimma', 'Addis Ababa'
}

export interface Subcategory {
  id: string;
  name: string;
  nameAmharic?: string;
  image?: string;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  nameAmharic?: string;
  slug: string;
  icon: string;
  image: string;
  imageUrl?: string;
  bannerImage?: string;
  parentId?: string | null;
  productCount: number;
  featured?: boolean;
  subcategories: Subcategory[];
  children?: CategoryTreeNode[];
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedAttributes?: Record<string, string>;
  selected: boolean;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  subcity?: string;
  woreda?: string;
  specificAddress: string;
  isDefault?: boolean;
}

export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface TrackingStep {
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  current: boolean;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number;
  selectedAttributes?: Record<string, string>;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatusType;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
  estimatedDelivery: string;
  trackingSteps: TrackingStep[];
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  avatarUrl?: string;
  verified: boolean;
  joinedDate: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  type: 'order' | 'promo' | 'system' | 'security';
  actionUrl?: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  lastUpdated: string;
  messages: {
    id: string;
    sender: 'customer' | 'support';
    text: string;
    timestamp: string;
  }[];
}
