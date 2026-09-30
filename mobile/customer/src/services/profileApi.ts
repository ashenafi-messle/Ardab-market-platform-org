// ==============================================================================
// Ardab Market - Mobile Customer Profile API Service
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { UserProfile } from '@/types';

export interface CustomerProfileData {
  id: string;
  customerCode: string;
  fullName: string;
  email?: string;
  phone: string;
  city: string;
  deliveryZone?: string;
  profileImageUrl?: string;
  avatarUrl?: string;
  verificationStatus: string;
  joinedDate: string;
  metrics?: {
    ordersCount: number;
    addressesCount: number;
    wishlistCount: number;
    supportTicketsCount: number;
  };
}

export const profileApi = {
  /**
   * Fetches the current customer profile from the server
   */
  async getProfile(): Promise<CustomerProfileData | null> {
    try {
      let res = await apiFetch<any>('/customer/profile');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/profile');
      }

      if (res.ok && res.data) {
        const u = res.data.data || res.data;
        return {
          id: u.id,
          customerCode: u.customerCode,
          fullName: u.fullName,
          email: u.email || '',
          phone: u.phone || '',
          city: u.city || 'Gondar',
          deliveryZone: u.deliveryZone || '',
          profileImageUrl: u.profileImageUrl || u.avatarUrl,
          avatarUrl: u.profileImageUrl || u.avatarUrl,
          verificationStatus: u.verificationStatus || 'VERIFIED',
          joinedDate: new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          metrics: u.metrics || {
            ordersCount: 0,
            addressesCount: 0,
            wishlistCount: 0,
            supportTicketsCount: 0,
          },
        };
      }
      return null;
    } catch (err) {
      console.warn('[profileApi] Error fetching profile:', err);
      return null;
    }
  },

  /**
   * Updates allowed profile information on the server
   */
  async updateProfile(payload: {
    fullName?: string;
    city?: string;
    deliveryZone?: string;
    profileImageUrl?: string;
  }): Promise<CustomerProfileData | null> {
    try {
      let res = await apiFetch<any>('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/profile', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok && res.data) {
        const u = res.data.data || res.data;
        return {
          id: u.id,
          customerCode: u.customerCode,
          fullName: u.fullName,
          email: u.email || '',
          phone: u.phone || '',
          city: u.city || 'Gondar',
          deliveryZone: u.deliveryZone || '',
          profileImageUrl: u.profileImageUrl || u.avatarUrl,
          avatarUrl: u.profileImageUrl || u.avatarUrl,
          verificationStatus: u.verificationStatus || 'VERIFIED',
          joinedDate: new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          metrics: u.metrics || {
            ordersCount: 0,
            addressesCount: 0,
            wishlistCount: 0,
            supportTicketsCount: 0,
          },
        };
      }
      const errorMsg = res.data?.message || 'Failed to update profile';
      throw new Error(errorMsg);
    } catch (err: any) {
      throw err;
    }
  },
};
