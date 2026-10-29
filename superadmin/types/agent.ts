// ==============================================================================
// Ardab Market - Super Admin Agent Management Types
// ==============================================================================

export type AgentStatus = 'ACTIVE' | 'INACTIVE';
export type AgentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
export type CommissionStatus = 'PENDING' | 'PAYABLE' | 'PAID' | 'CANCELLED' | 'REVERSED';
export type CommissionPolicyType = 'PERCENTAGE' | 'FIXED';

export interface CommissionTotals {
  pending: number;
  payable: number;
  paid: number;
  total: number;
}

export interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: AgentStatus;
  commissionRate: number;
  commissionType: CommissionPolicyType;
  hasNationalIdDocument: boolean;
  nationalIdMimeType?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedCustomerCount?: number;
  pendingRequestsCount?: number;
  attributedOrdersCount?: number;
  commissionTotals?: CommissionTotals;
  registeredBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AgentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AgentStatus | 'ALL';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AgentListResult {
  agents: Agent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AgentDashboardStats {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  approvedIntegrations: number;
  pendingRequests: number;
  attributedOrders: number;
  commissions: CommissionTotals;
}

export interface AgentIntegrationRequest {
  id: string;
  customerId: string;
  customer?: {
    id: string;
    customerCode: string;
    fullName: string;
    phone: string;
    city?: string;
  };
  agentId: string;
  agent?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: AgentStatus;
  };
  status: AgentRequestStatus;
  rejectionReason?: string | null;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationRequestListParams {
  page?: number;
  limit?: number;
  status?: AgentRequestStatus | 'ALL';
  agentId?: string;
  search?: string;
}

export interface IntegrationRequestListResult {
  requests: AgentIntegrationRequest[];
  pendingTotal: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AgentCustomerItem {
  relationshipId: string;
  approvedAt: string;
  customer: {
    id: string;
    customerCode: string;
    fullName: string;
    phone: string;
    city: string;
    status: string;
    createdAt: string;
  };
}

export interface AgentOrderItem {
  id: string;
  orderNumber: string;
  customer?: {
    id: string;
    customerCode: string;
    fullName: string;
    phone: string;
  };
  subtotal: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  placedAt: string;
  attributedAt: string;
  commission?: {
    id: string;
    commissionAmount: number;
    rateSnapshot: number;
    status: CommissionStatus;
  } | null;
}

export interface AgentCommissionItem {
  id: string;
  orderNumber?: string;
  orderId: string;
  baseAmount: number;
  rateSnapshot: number;
  policyType: CommissionPolicyType;
  commissionAmount: number;
  currency: string;
  status: CommissionStatus;
  payableAt?: string | null;
  paidAt?: string | null;
  paymentReference?: string | null;
  createdAt: string;
}
