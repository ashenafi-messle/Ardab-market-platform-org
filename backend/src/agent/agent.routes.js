// ==============================================================================
// Ardab Market - Agent Application Routes
// ==============================================================================

import { Router } from 'express';
import { AgentAuthController } from './agent.auth.controller.js';
import { AgentController } from './agent.controller.js';
import { requireAgentAuth } from './agent.middleware.js';
import { asyncHandler } from '../shared/utils/asyncHandler.js';

const router = Router();

// ------------------------------------------------------------------------------
// Authentication & Account Activation (Public)
// ------------------------------------------------------------------------------
router.post('/auth/request-activation-otp', asyncHandler(AgentAuthController.requestActivationOtp));
router.post('/auth/verify-activation-otp', asyncHandler(AgentAuthController.verifyActivationOtp));
router.post('/auth/set-password', asyncHandler(AgentAuthController.setPassword));
router.post('/auth/login', asyncHandler(AgentAuthController.login));
router.post('/auth/refresh', asyncHandler(AgentAuthController.refresh));
router.post('/auth/forgot-password', asyncHandler(AgentAuthController.forgotPassword));
router.post('/auth/verify-reset-otp', asyncHandler(AgentAuthController.verifyResetOtp));
router.post('/auth/reset-password', asyncHandler(AgentAuthController.resetPassword));

// ------------------------------------------------------------------------------
// Authenticated Session & Credentials
// ------------------------------------------------------------------------------
router.get('/auth/me', requireAgentAuth, asyncHandler(AgentAuthController.getMe));
router.post('/auth/logout', requireAgentAuth, asyncHandler(AgentAuthController.logout));
router.post('/auth/change-password', requireAgentAuth, asyncHandler(AgentAuthController.changePassword));

// ------------------------------------------------------------------------------
// Dashboard Overview
// ------------------------------------------------------------------------------
router.get('/dashboard', requireAgentAuth, asyncHandler(AgentController.getDashboard));

// ------------------------------------------------------------------------------
// Integrated Customers
// ------------------------------------------------------------------------------
router.get('/customers', requireAgentAuth, asyncHandler(AgentController.getCustomers));
router.get('/customers/:customerId', requireAgentAuth, asyncHandler(AgentController.getCustomerById));
router.get('/customers/:customerId/orders', requireAgentAuth, asyncHandler(AgentController.getCustomerOrders));

// ------------------------------------------------------------------------------
// Attributed Orders
// ------------------------------------------------------------------------------
router.get('/orders', requireAgentAuth, asyncHandler(AgentController.getOrders));
router.get('/orders/:orderId', requireAgentAuth, asyncHandler(AgentController.getOrderById));

// ------------------------------------------------------------------------------
// Commissions Management
// ------------------------------------------------------------------------------
router.get('/commissions/summary', requireAgentAuth, asyncHandler(AgentController.getCommissionSummary));
router.get('/commissions', requireAgentAuth, asyncHandler(AgentController.getCommissions));

// ------------------------------------------------------------------------------
// Notifications
// ------------------------------------------------------------------------------
router.get('/notifications', requireAgentAuth, asyncHandler(AgentController.getNotifications));
router.get('/notifications/unread-count', requireAgentAuth, asyncHandler(AgentController.getUnreadCount));
router.patch('/notifications/read-all', requireAgentAuth, asyncHandler(AgentController.markAllNotificationsRead));
router.patch('/notifications/:notificationId/read', requireAgentAuth, asyncHandler(AgentController.markNotificationRead));

// ------------------------------------------------------------------------------
// Device & Push Tokens
// ------------------------------------------------------------------------------
router.post('/devices/register', requireAgentAuth, asyncHandler(AgentController.registerDevice));
router.delete('/devices/:deviceId', requireAgentAuth, asyncHandler(AgentController.removeDevice));

// ------------------------------------------------------------------------------
// Profile Management
// ------------------------------------------------------------------------------
router.get('/profile', requireAgentAuth, asyncHandler(AgentController.getProfile));
router.patch('/profile', requireAgentAuth, asyncHandler(AgentController.updateProfile));

export default router;

