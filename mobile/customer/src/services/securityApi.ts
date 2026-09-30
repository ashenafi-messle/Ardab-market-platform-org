// ==============================================================================
// Ardab Market - Mobile Customer Security API Service
// ==============================================================================

import { apiFetch } from '@/constants/api';

export interface ActiveSession {
  id: string;
  deviceInfo: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
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
   * Fetches active sessions
   */
  async getSessions(): Promise<ActiveSession[]> {
    try {
      let res = await apiFetch<any>('/customer/security/sessions');
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/security/sessions');
      }

      if (res.ok && res.data) {
        return res.data.data || res.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Revokes a specific session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      let res = await apiFetch<any>(`/customer/security/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        res = await apiFetch<any>(`/customer-mobile/security/sessions/${sessionId}`, {
          method: 'DELETE',
        });
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Revokes all other sessions
   */
  async revokeOtherSessions(): Promise<boolean> {
    try {
      let res = await apiFetch<any>('/customer/security/sessions/revoke-others', {
        method: 'POST',
      });
      if (!res.ok) {
        res = await apiFetch<any>('/customer-mobile/security/sessions/revoke-others', {
          method: 'POST',
        });
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Requests account deletion
   */
  async requestAccountDeletion(reason: string): Promise<{ success: boolean; message: string }> {
    let res = await apiFetch<any>('/customer/security/delete-account', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      res = await apiFetch<any>('/customer-mobile/security/delete-account', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    }

    if (!res.ok) {
      const errorMsg = res.data?.message || 'Failed to submit deletion request';
      throw new Error(errorMsg);
    }

    return {
      success: true,
      message: res.data?.message || 'Your account deletion request has been submitted.',
    };
  },
};
