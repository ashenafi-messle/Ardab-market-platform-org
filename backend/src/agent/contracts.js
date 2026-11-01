/**
 * Ardab Market - Agent Module API Contracts (Phase 2 Blueprint)
 *
 * This module defines the canonical REST endpoint structure and payload contracts
 * for the Ardab Market Agent Mobile Application.
 */

module.exports = {
  // Authentication & Activation (No self-registration)
  AUTH: {
    REQUEST_ACTIVATION_OTP: 'POST /api/agent/auth/request-activation-otp',
    VERIFY_ACTIVATION_OTP: 'POST /api/agent/auth/verify-activation-otp',
    SET_INITIAL_PASSWORD: 'POST /api/agent/auth/set-initial-password',
    LOGIN: 'POST /api/agent/auth/login',
    FORGOT_PASSWORD_OTP: 'POST /api/agent/auth/forgot-password-otp',
    RESET_PASSWORD: 'POST /api/agent/auth/reset-password',
    REFRESH_TOKEN: 'POST /api/agent/auth/refresh-token',
    LOGOUT: 'POST /api/agent/auth/logout',
  },

  // Dashboard & Financials
  DASHBOARD: {
    GET_OVERVIEW: 'GET /api/agent/dashboard/overview',
    GET_COMMISSIONS: 'GET /api/agent/finance/commissions',
    GET_COMMISSION_DETAIL: 'GET /api/agent/finance/commissions/:id',
  },

  // Attributed Customer Management
  CUSTOMERS: {
    LIST_INTEGRATED_CUSTOMERS: 'GET /api/agent/customers',
    GET_CUSTOMER_DETAIL: 'GET /api/agent/customers/:id',
    GET_CUSTOMER_ORDERS: 'GET /api/agent/customers/:id/orders',
  },

  // Attributed Order Management
  ORDERS: {
    LIST_ATTRIBUTED_ORDERS: 'GET /api/agent/orders',
    GET_ORDER_DETAIL: 'GET /api/agent/orders/:id',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: 'GET /api/agent/notifications',
    MARK_READ: 'PATCH /api/agent/notifications/:id/read',
    MARK_ALL_READ: 'POST /api/agent/notifications/mark-all-read',
  },

  // Profile & Settings
  PROFILE: {
    GET_PROFILE: 'GET /api/agent/profile',
    CHANGE_PASSWORD: 'POST /api/agent/profile/change-password',
  },
};

