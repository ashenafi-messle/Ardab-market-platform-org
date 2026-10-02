// ==============================================================================
// Ardab Market - Mobile Customer Security API Service
// ==============================================================================

import { apiFetch } from '@/constants/api';

export interface AccountDeletionStatus {
  hasPendingRequest: boolean;
  status: string | null;
  statusLabel: string | null;
  ticketNumber: string | null;
  requestedAt: string | null;
  message: string | null;
}

export const securityApi = {
  /**
   * Changes authenticated customer password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    let res = await apiFetch<any>('/customer/security/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      res = await apiFetch<any>('/customer-mobile/security/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    }

    if (!res.ok) {
      const errorMsg = res.data?.message || res.data?.error?.message || 'Failed to change password';
      throw new Error(errorMsg);
    }

    return {
      success: true,
      message: res.data?.message || 'Password changed successfully',
    };
  },

  /**
   * Fetches the current customer's account deletion request status
   */
  async getAccountDeletionStatus(): Promise<AccountDeletionStatus> {
    try {
      let res = await apiFetch<any>('/customer/security/delete-account');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/security/delete-account');
      }

      if (res.ok && res.data) {
        const payload = res.data.data || res.data;
        return {
          hasPendingRequest: Boolean(payload.hasPendingRequest),
          status: payload.status || null,
          statusLabel: payload.statusLabel || null,
          ticketNumber: payload.ticketNumber || null,
          requestedAt: payload.requestedAt || null,
          message: payload.message || null,
        };
      }

      return {
        hasPendingRequest: false,
        status: null,
        statusLabel: null,
        ticketNumber: null,
        requestedAt: null,
        message: null,
      };
    } catch {
      return {
        hasPendingRequest: false,
        status: null,
        statusLabel: null,
        ticketNumber: null,
        requestedAt: null,
        message: null,
      };
    }
  },

  /**
   * Requests account deletion from Sub Admin Customer Support
   */
  async requestAccountDeletion(reason?: string): Promise<{ success: boolean; message: string; ticketNumber?: string }> {
    let res = await apiFetch<any>('/customer/security/account/deletion-request', {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Customer requested from mobile app' }),
    });

    if (!res.ok) {
      res = await apiFetch<any>('/customer-mobile/security/delete-account', {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Customer requested from mobile app' }),
      });
    }

    if (!res.ok) {
      const errorMsg = res.data?.message || res.data?.error?.message || 'Failed to submit deletion request';
      throw new Error(errorMsg);
    }

    const payload = res.data?.data || res.data;
    return {
      success: true,
      message: payload?.message || 'Your account deletion request has been submitted.',
      ticketNumber: payload?.ticketNumber,
    };
  },
};
