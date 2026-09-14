export interface RevenueMetrics {
  totalRevenueEtb: number;
  todayRevenueEtb: number;
  weeklyRevenueEtb: number;
  monthlyRevenueEtb: number;
  totalDeliveryFeesEtb: number;
  completedOrdersRevenueEtb: number;
  refundsCancellationsEtb: number;
  growthPercentage: number;
}

export interface Transaction {
  id: string; // e.g. "TXN-88219"
  orderId: string;
  customerName: string;
  amountEtb: number;
  paymentMethod: 'TELEBIRR' | 'CBE_BIRR' | 'CASH_ON_DELIVERY';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  timestamp: string;
}
