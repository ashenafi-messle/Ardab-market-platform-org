export type FeedbackType = 'PRODUCT' | 'DELIVERY' | 'PLATFORM' | 'SUPPLIER';

export type FeedbackSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export type FeedbackStatus = 'NEW' | 'REVIEWED' | 'RESOLVED' | 'FLAGGED';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  authorName: string;
  authorRole: 'CUSTOMER' | 'SUPPLIER';
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  rating: number; // 1 to 5
  title: string;
  comment: string;
  targetEntityName: string;
  status: FeedbackStatus;
  sentiment: FeedbackSentiment;
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
}

export interface FeedbackMetrics {
  averageRating: number;
  totalReviews: number;
  netPromoterScore: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
}
