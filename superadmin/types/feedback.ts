export type FeedbackType =
  | 'PRODUCT'
  | 'DELIVERY'
  | 'PLATFORM'
  | 'SUPPLIER'
  | 'ORDER'
  | 'CUSTOMER_SERVICE';

export type FeedbackSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export type FeedbackStatus =
  | 'NEW'
  | 'PENDING'
  | 'PUBLISHED'
  | 'UNDER_REVIEW'
  | 'REVIEWED'
  | 'RESOLVED'
  | 'FLAGGED'
  | 'HIDDEN'
  | 'REJECTED'
  | 'ARCHIVED';

export type FeedbackVisibility = 'PUBLIC' | 'PRIVATE' | 'HIDDEN';

export type FeedbackModerationAction =
  | 'PUBLISH'
  | 'HIDE'
  | 'REJECT'
  | 'RESOLVE'
  | 'ARCHIVE'
  | 'RESTORE';

export interface FeedbackCategory {
  id: string;
  name: string;
  description?: string;
  type: FeedbackType;
  isActive: boolean;
}

export interface FeedbackResponseItem {
  id: string;
  feedbackId: string;
  responderId?: string;
  responderType: 'SUBADMIN' | 'ADMIN' | 'SELLER' | 'SYSTEM';
  responderName?: string;
  body: string;
  createdAt: string;
}

export interface FeedbackReportItem {
  id: string;
  feedbackId: string;
  reportedBy?: string;
  reporterEmail?: string;
  reason: string;
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED' | 'ACTION_TAKEN';
  actionTaken?: string;
  createdAt: string;
}

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  source?: string;
  authorName: string;
  authorRole: 'CUSTOMER' | 'SUPPLIER' | 'MERCHANT';
  city: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  targetEntityName: string;
  status: FeedbackStatus;
  sentiment: FeedbackSentiment;
  visibility?: FeedbackVisibility;
  isVerified?: boolean;
  isAnonymous?: boolean;
  createdAt: string;
  publishedAt?: string;
  resolvedAt?: string;
  adminReply?: string;
  repliedAt?: string;
  responses?: FeedbackResponseItem[];
  reports?: FeedbackReportItem[];
  category?: FeedbackCategory;
  customer?: {
    id: string;
    customerCode: string;
    fullName: string;
    email?: string;
    phone: string;
    city?: string;
  };
  product?: {
    id: string;
    itemCode: string;
    name: string;
    sellingPrice?: number;
  };
  seller?: {
    id: string;
    companyName: string;
    name: string;
    phone?: string;
    city?: string;
  };
  delivery?: {
    id: string;
    deliveryNumber: string;
    status: string;
  };
}

export interface FeedbackMetrics {
  averageRating: number;
  totalReviews: number;
  netPromoterScore: number;
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
  verifiedReviews?: number;
  ratingDistribution?: Record<number, number>;
  operationalCounts?: {
    totalFeedback: number;
    pendingModeration: number;
    flaggedCount: number;
    hiddenCount: number;
    unresolvedReports: number;
  };
}
