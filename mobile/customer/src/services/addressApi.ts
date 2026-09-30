// ==============================================================================
// Ardab Market - Mobile Customer Address API Service
// ==============================================================================

import { apiFetch } from '@/constants/api';
import { Address } from '@/types';

export interface AddressPayload {
  label?: string;
  fullName?: string;
  recipientName?: string;
  phone: string;
  city: string;
  subcity?: string;
  deliveryZone?: string;
  neighborhood?: string;
  specificAddress?: string;
  addressLine?: string;
  isDefault?: boolean;
}

export const addressApi = {
  /**
   * Fetches all saved addresses for the authenticated customer
   */
  async getAddresses(): Promise<Address[]> {
    try {
      let res = await apiFetch<any>('/customer/addresses');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/addresses');
      }

      if (res.ok && res.data) {
        const raw = res.data.data || res.data;
        if (Array.isArray(raw)) {
          return raw.map((a: any) => ({
            id: a.id,
            label: a.label || 'Home',
            fullName: a.fullName || a.recipientName || 'Ardab Customer',
            recipientName: a.recipientName || a.fullName,
            phone: a.phone || '',
            city: a.city || 'Gondar',
            subcity: a.subcity || a.deliveryZone || '',
            deliveryZone: a.deliveryZone || a.subcity || '',
            neighborhood: a.neighborhood || '',
            specificAddress: a.specificAddress || a.addressLine || '',
            addressLine: a.addressLine || a.specificAddress || '',
            isDefault: Boolean(a.isDefault),
            isActive: a.isActive !== false,
            createdAt: a.createdAt,
          }));
        }
      }
      return [];
    } catch (err) {
      console.warn('[addressApi] Error fetching addresses:', err);
      return [];
    }
  },

  /**
   * Creates a new delivery address for the authenticated customer
   */
  async createAddress(data: AddressPayload): Promise<Address | null> {
    try {
      const payload = {
        label: data.label || 'Home',
        recipientName: (data.recipientName || data.fullName || '').trim(),
        fullName: (data.fullName || data.recipientName || '').trim(),
        phone: data.phone.trim(),
        city: data.city.trim(),
        deliveryZone: (data.deliveryZone || data.subcity || '').trim() || null,
        subcity: (data.subcity || data.deliveryZone || '').trim() || null,
        neighborhood: data.neighborhood ? data.neighborhood.trim() : null,
        addressLine: (data.addressLine || data.specificAddress || '').trim(),
        specificAddress: (data.specificAddress || data.addressLine || '').trim(),
        isDefault: Boolean(data.isDefault),
      };

      let res = await apiFetch<any>('/customer/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok && res.data) {
        const a = res.data.data || res.data;
        return {
          id: a.id,
          label: a.label || 'Home',
          fullName: a.fullName || a.recipientName || payload.fullName,
          recipientName: a.recipientName || a.fullName,
          phone: a.phone || payload.phone,
          city: a.city || payload.city,
          subcity: a.subcity || a.deliveryZone || '',
          deliveryZone: a.deliveryZone || a.subcity || '',
          neighborhood: a.neighborhood || '',
          specificAddress: a.specificAddress || a.addressLine || payload.specificAddress,
          addressLine: a.addressLine || a.specificAddress || payload.addressLine,
          isDefault: Boolean(a.isDefault),
        };
      }
      return null;
    } catch (err) {
      console.warn('[addressApi] Error creating address:', err);
      return null;
    }
  },

  /**
   * Updates an existing delivery address
   */
  async updateAddress(addressId: string, data: Partial<AddressPayload>): Promise<Address | null> {
    try {
      const payload: any = {};
      if (data.label) payload.label = data.label;
      if (data.fullName || data.recipientName) {
        payload.recipientName = (data.recipientName || data.fullName)!.trim();
        payload.fullName = (data.fullName || data.recipientName)!.trim();
      }
      if (data.phone) payload.phone = data.phone.trim();
      if (data.city) payload.city = data.city.trim();
      if (data.subcity !== undefined || data.deliveryZone !== undefined) {
        payload.deliveryZone = (data.deliveryZone || data.subcity || '').trim() || null;
      }
      if (data.neighborhood !== undefined) payload.neighborhood = data.neighborhood ? data.neighborhood.trim() : null;
      if (data.addressLine || data.specificAddress) {
        payload.addressLine = (data.addressLine || data.specificAddress)!.trim();
        payload.specificAddress = (data.specificAddress || data.addressLine)!.trim();
      }
      if (data.isDefault !== undefined) payload.isDefault = Boolean(data.isDefault);

      let res = await apiFetch<any>(`/customer/addresses/${addressId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/addresses/${addressId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }

      if (res.ok && res.data) {
        const a = res.data.data || res.data;
        return {
          id: a.id,
          label: a.label || 'Home',
          fullName: a.fullName || a.recipientName,
          recipientName: a.recipientName || a.fullName,
          phone: a.phone,
          city: a.city,
          subcity: a.subcity || a.deliveryZone || '',
          deliveryZone: a.deliveryZone || a.subcity || '',
          neighborhood: a.neighborhood || '',
          specificAddress: a.specificAddress || a.addressLine,
          addressLine: a.addressLine || a.specificAddress,
          isDefault: Boolean(a.isDefault),
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Sets an address as the default delivery address
   */
  async setDefaultAddress(addressId: string): Promise<boolean> {
    try {
      let res = await apiFetch<any>(`/customer/addresses/${addressId}/default`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/addresses/${addressId}/default`, {
          method: 'PATCH',
        });
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Deletes a saved address
   */
  async deleteAddress(addressId: string): Promise<boolean> {
    try {
      let res = await apiFetch<any>(`/customer/addresses/${addressId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/addresses/${addressId}`, {
          method: 'DELETE',
        });
      }
      return res.ok;
    } catch {
      return false;
    }
  },
};
