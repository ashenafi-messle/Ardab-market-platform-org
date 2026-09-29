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
  | 'READY_FOR_DELIVERY'
  | 'ASSIGNED_TO_TRIP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RETURNED'
  | 'REJECTED';

export type OrderFilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface TrackingStep {
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  current: boolean;
}

export interface OrderMilestone {
  key: string;
  stage: string;
  title: string;
  description: string;
  timestamp?: string | null;
  state: 'COMPLETED' | 'CURRENT' | 'UPCOMING' | 'CANCELLED' | 'FAILED';
}

export interface OrderTimelineEvent {
  id?: string;
  type?: string;
  status: OrderStatusType | string;
  customerMessage: string;
  timestamp: string;
  actor?: string;
  isCompleted?: boolean;
}

export interface OrderDeliverySnapshot {
  recipientName: string;
  phone: string;
  city: string;
  deliveryZone?: string | null;
  neighborhood?: string | null;
  addressLine: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface OrderDeliveryInfo {
  id: string;
  deliveryNumber: string;
  status: string;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  agentName?: string;
  agentPhone?: string;
}

export interface OrderSupportContext {
  telegramBotUrl: string;
  supportPhone: string;
  supportEmail: string;
  orderReference: string;
}

export interface OrderItem {
  id?: string;
  productId?: string | null;
  productName?: string;
  product?: Product;
  quantity: number;
  unitPrice?: string;
  unitPriceEtb?: number;
  price?: number;
  subtotal?: string;
  totalPriceEtb?: number;
  totalWeight?: string;
  unit?: string;
  sellerName?: string;
  productImage?: string | null;
  selectedAttributes?: Record<string, string>;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: OrderStatusType;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  subtotal: string | number;
  subtotalEtb?: number;
  deliveryFee: string | number;
  deliveryFeeEtb?: number;
  discountAmount?: string | number;
  discountEtb?: number;
  totalAmount?: string | number;
  totalEtb?: number;
  total?: number;
  discount?: number;
  totalWeight?: string;
  currency?: string;
  customerNote?: string | null;
  city?: string;
  deliveryZone?: string | null;
  deliveryAddress?: string | null;
  cancelledReason?: string | null;
  rejectedReason?: string | null;
  itemCount?: number;
  previewImages?: string[];
  items: OrderItem[];
  placedAt?: string;
  confirmedAt?: string | null;
  processingAt?: string | null;
  readyAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  estimatedDelivery?: string;
  canCancel?: boolean;
  delivery?: OrderDeliveryInfo | null;
  deliveryAddressSnapshot?: OrderDeliverySnapshot | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  shippingAddress?: Address;
  milestones?: OrderMilestone[];
  timeline?: OrderTimelineEvent[];
  trackingSteps?: TrackingStep[];
  support?: OrderSupportContext;
}

export type Order = CustomerOrder;

export interface OrderPagination {
  page: number;
  limit: number;
  pageSize: number;
  total: number;
  totalPages: number;
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
