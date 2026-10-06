// ==============================================================================
// Ardab Market - Constants & Geographic Reference Data
// ==============================================================================
// Lightweight geographic and profile fallback constants.
// Marketplace products, categories, and orders are fetched dynamically from backend.
// ==============================================================================

import { UserProfile } from '@/types';

export const CITIES = [
  'Addis Ababa',
  'Gondar',
  'Hawassa',
  'Bahir Dar',
  'Dire Dawa',
  'Mekelle',
  'Adama',
  'Jimma',
  'Dessie',
];

export const MOCK_USER: UserProfile = {
  id: 'usr-customer-001',
  fullName: 'Yonas Tadesse',
  email: 'yonas.tadesse@example.com',
  phone: '+251 91 123 4567',
  city: 'Gondar',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  verified: true,
  joinedDate: 'January 2025',
};
