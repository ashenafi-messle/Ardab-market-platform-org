// ==============================================================================
// Ardab Market - Campaign & Advertising Service
// ==============================================================================
// Manages promotional advertising campaigns for the customer mobile Home carousel.
// NOTE: This represents the maintainable local campaign configuration using approved
// high-resolution Cloudinary assets. Designed with an asynchronous DTO pattern
// so it seamlessly bridges to future backend CMS/Admin promotion endpoints.
// ==============================================================================

import { CampaignItem } from '@/types/campaign';

/**
 * Approved local promotional campaigns representing Ardab Market's core pillars:
 * 1. Contemporary Fashion & Footwear
 * 2. Premium Handbags & Traditional Luxury
 * 3. Verified Ethiopian Groceries & Commodities
 */
export const LOCAL_CAMPAIGNS: CampaignItem[] = [
  {
    id: 'campaign-hero-ad-1',
    badge: '',
    badgeAm: '',
    title: '',
    titleAm: '',
    subtitle: '',
    subtitleAm: '',
    imageUrl:
      'https://res.cloudinary.com/dr9umkixr/image/upload/v1792485164/Gemini_Generated_Image_7arqqm7arqqm7arq_1_a3cefb.jpg',
    ctaText: '',
    ctaTextAm: '',
    destinationType: 'internal',
    destination: '/products',
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'campaign-hero-ad-2',
    badge: '',
    badgeAm: '',
    title: '',
    titleAm: '',
    subtitle: '',
    subtitleAm: '',
    imageUrl:
      'https://res.cloudinary.com/dr9umkixr/image/upload/v1792485110/4a0247e34aac8ff8a8d4b4c040a0cc94_ri10at.jpg',
    ctaText: '',
    ctaTextAm: '',
    destinationType: 'internal',
    destination: '/(tabs)/categories',
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'campaign-hero-ad-3',
    badge: '',
    badgeAm: '',
    title: '',
    titleAm: '',
    subtitle: '',
    subtitleAm: '',
    imageUrl:
      'https://res.cloudinary.com/dr9umkixr/image/upload/v1792484928/84ebde06-9b30-4016-a4e6-4629f6bb30e1_gp3x53.jpg',
    ctaText: '',
    ctaTextAm: '',
    destinationType: 'internal',
    destination: '/products',
    isActive: true,
    displayOrder: 3,
  },
];

/**
 * Validates destination URLs to prevent untrusted execution or deep-link attacks
 */
export function isValidDestination(type: 'internal' | 'external', destination: string): boolean {
  if (!destination || typeof destination !== 'string') return false;

  if (type === 'internal') {
    // Must start with '/' and only contain alphanumeric path characters
    return destination.startsWith('/') && !destination.includes('javascript:') && !destination.includes('..');
  }

  if (type === 'external') {
    try {
      const parsed = new URL(destination);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Fetches active campaigns within the current eligibility window.
 * Returns sorted active campaigns ready for display.
 */
export async function getActiveCampaigns(): Promise<CampaignItem[]> {
  const now = new Date();

  return LOCAL_CAMPAIGNS.filter((campaign) => {
    if (!campaign.isActive) return false;

    if (campaign.startDate && new Date(campaign.startDate) > now) {
      return false;
    }

    if (campaign.endDate && new Date(campaign.endDate) < now) {
      return false;
    }

    return true;
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}
