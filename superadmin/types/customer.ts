// ==============================================================================
// Ardab Market - Customer Types & Interfaces
// ==============================================================================

export type CustomerAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'PENDING';
export type CustomerVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'UNVERIFIED';

export interface CustomerMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSpent: string | number;
  totalScore: number;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  deliveryZone?: string | null;
  neighborhood?: string | null;
  addressLine: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerActivityItem {
  id: string;
  customerId: string;
  action: string;
  description: string;
  actor: string;
  createdAt: string;
}

export interface CustomerSummaryMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  verifiedCustomers: number;
}

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  verificationStatus?: string;
  city?: string;
  deliveryZone?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerListResult {
  items: Customer[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface Customer {
  id: string;
  customerCode?: string;
  fullName?: string;
  name: string; // Alias for backward compatibility with existing mock/components
  phone: string;
  email: string;
  profileImageUrl?: string | null;
  city: string;
  deliveryZone: string;
  address: string;
  status?: CustomerAccountStatus;
  accountStatus: CustomerAccountStatus; // Alias for backward compatibility
  verificationStatus: CustomerVerificationStatus;
  metrics?: CustomerMetrics;
  orderCount: number; // Mapped from metrics.totalOrders
  totalSpendingEtb: number; // Mapped from metrics.totalSpent
  trustScore: number; // Mapped from metrics.totalScore
  addresses?: CustomerAddress[];
  orders?: Record<string, unknown>[];
  activities?: CustomerActivityItem[];
  lastActivityAt?: string | null;
  createdAt?: string;
  registeredAt: string; // Alias mapped to createdAt
  lastOrderAt?: string;
}
