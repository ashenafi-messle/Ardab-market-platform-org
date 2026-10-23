// ==============================================================================
// Ardab Market - Promotional Campaign & Advertising Types
// ==============================================================================

export type CampaignDestinationType = 'internal' | 'external';

export interface CampaignItem {
  id: string;
  badge: string;
  badgeAm: string;
  title: string;
  titleAm: string;
  subtitle: string;
  subtitleAm: string;
  imageUrl: string;
  ctaText: string;
  ctaTextAm: string;
  destinationType: CampaignDestinationType;
  destination: string;
  isActive: boolean;
  displayOrder: number;
  startDate?: string;
  endDate?: string;
}

export interface CarouselSlideProps {
  campaign: CampaignItem;
  language: 'en' | 'am';
  onPress: (campaign: CampaignItem) => void;
  isFirstSlide?: boolean;
}
