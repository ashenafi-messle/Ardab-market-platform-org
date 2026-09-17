import { PaymentMethod } from './paymentMethod';

export type SupplierStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'INACTIVE';
export type SupplierVerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface SupplierPaymentMethodItem {
  id?: string;
  paymentMethod: string;
  accountNumber: string;
  isPrimary?: boolean;
}

export interface Supplier {
  id: string; // e.g. "SUP-101" or UUID
  name: string; // Contact Person / Manager
  companyName: string; // Registered Business / Enterprise Name
  phone: string;
  email?: string | null; // OPTIONAL email
  city: string; // Scalable city hub (e.g. Gondar, Bahir Dar, Addis Ababa, etc.)
  category?: string | null; // Flexible commodity / category description
  tinNumber?: string | null; // Ethiopian Tax Identification Number
  address: string; // Physical business / warehouse address
  status: SupplierStatus;
  verificationStatus?: SupplierVerificationStatus;
  notes?: string | null;
  productCount?: number;
  paymentMethods: SupplierPaymentMethodItem[];
  paymentMethodId?: string | null;
  paymentMethod?: Partial<PaymentMethod> | null;
  registeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierInput {
  name: string;
  companyName: string;
  phone: string;
  email?: string | null;
  city: string;
  category?: string | null;
  tinNumber?: string | null;
  address: string;
  status?: SupplierStatus;
  verificationStatus?: SupplierVerificationStatus;
  notes?: string | null;
  paymentMethods: Array<{
    paymentMethod: string;
    accountNumber: string;
    isPrimary?: boolean;
  }>;
  paymentMethodId?: string | null;
}

export interface UpdateSupplierInput {
  name?: string;
  companyName?: string;
  phone?: string;
  email?: string | null;
  city?: string;
  category?: string | null;
  tinNumber?: string | null;
  address?: string;
  status?: SupplierStatus;
  verificationStatus?: SupplierVerificationStatus;
  notes?: string | null;
  paymentMethods?: Array<{
    paymentMethod: string;
    accountNumber: string;
    isPrimary?: boolean;
  }>;
  paymentMethodId?: string | null;
}

export interface SupplierListParams {
  page?: number;
  limit?: number;
  city?: string;
  status?: string;
  search?: string;
}

export interface SupplierListResult {
  items: Supplier[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
