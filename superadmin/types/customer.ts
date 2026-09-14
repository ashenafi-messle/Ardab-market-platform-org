export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  deliveryZone: string;
  address: string;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  orderCount: number;
  totalSpendingEtb: number;
  trustScore: number; // 0 - 100
  registeredAt: string;
  lastOrderAt?: string;
}
