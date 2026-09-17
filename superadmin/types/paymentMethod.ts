export interface PaymentMethod {
  id: string;
  name: string;
  provider?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
