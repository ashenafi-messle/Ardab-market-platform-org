// ==============================================================================
// Ardab Market - Mobile Customer Agent Referral API Client
// ==============================================================================

import { apiFetch } from '@/constants/api';

export interface CustomerAgentInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  connectedAt: string;
}

export interface CustomerAgentStateResponse {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  message?: string;
  requestId?: string;
  agentName?: string;
  requestDate?: string;
  rejectionReason?: string | null;
  agent?: CustomerAgentInfo;
}

export const agentApi = {
  /**
   * Retrieves the customer's current agent integration status
   */
  async getIntegrationState(): Promise<CustomerAgentStateResponse> {
    try {
      let res = await apiFetch<any>('/customer-mobile/agent');
      if (!res.ok) {
        res = await apiFetch<any>('/customer/agent');
      }

      if (res.ok && res.data) {
        const payload = res.data.data || res.data;
        return {
          status: payload.status || 'NONE',
          message: payload.message,
          requestId: payload.requestId,
          agentName: payload.agentName,
          requestDate: payload.requestDate,
          rejectionReason: payload.rejectionReason,
          agent: payload.agent,
        };
      }

      return { status: 'NONE' };
    } catch (err) {
      console.warn('[agentApi] Failed to fetch integration state:', err);
      return { status: 'NONE' };
    }
  },

  /**
   * Submits a new integration request using the agent's registered email
   */
  async submitIntegrationRequest(agentEmail: string): Promise<{
    ok: boolean;
    data?: CustomerAgentStateResponse;
    error?: string;
    isUnknownAgent?: boolean;
  }> {
    const trimmedEmail = agentEmail.trim().toLowerCase();

    try {
      let res = await apiFetch<any>('/customer-mobile/agent/integration-requests', {
        method: 'POST',
        body: JSON.stringify({ agentEmail: trimmedEmail }),
      });

      if (!res.ok && res.status === 404) {
        res = await apiFetch<any>('/customer/agent/integration-requests', {
          method: 'POST',
          body: JSON.stringify({ agentEmail: trimmedEmail }),
        });
      }

      if (res.ok && res.data) {
        const payload = res.data.data || res.data;
        return {
          ok: true,
          data: payload,
        };
      }

      // Check if unknown agent error
      const errorMsg = res.data?.error?.message || res.data?.message || '';
      const errorCode = res.data?.error?.code || '';
      const isUnknown =
        errorCode === 'UNKNOWN_AGENT' ||
        /unknown agent/i.test(errorMsg);

      return {
        ok: false,
        error: errorMsg,
        isUnknownAgent: isUnknown,
      };
    } catch (err: any) {
      console.warn('[agentApi] Request submission error:', err);
      return {
        ok: false,
        error: err.message || 'Unable to submit integration request. Please check your connection.',
        isUnknownAgent: false,
      };
    }
  },
};
