// ==============================================================================
// Ardab Market - Agent Features Controller
// ==============================================================================

import { AgentService } from './agent.service.js';
import { AgentNotificationService } from './agent.notification.service.js';
import { ApiResponse } from '../shared/utils/apiResponse.js';
import { registerDeviceSchema, updateProfileSchema } from './agent.validation.js';

export class AgentController {
  /**
   * GET /api/agent/dashboard
   */
  static async getDashboard(req, res) {
    const data = await AgentService.getDashboard(req.agent.id);
    return ApiResponse.success(res, data);
  }

  /**
   * GET /api/agent/customers
   */
  static async getCustomers(req, res) {
    const { page, limit, search } = req.query;
    const result = await AgentService.getCustomers(req.agent.id, { page, limit, search });
    return ApiResponse.paginated(res, result.customers, result.pagination);
  }

  /**
   * GET /api/agent/customers/:customerId
   */
  static async getCustomerById(req, res) {
    const { customerId } = req.params;
    const data = await AgentService.getCustomerById(req.agent.id, customerId);
    return ApiResponse.success(res, data);
  }

  /**
   * GET /api/agent/customers/:customerId/orders
   */
  static async getCustomerOrders(req, res) {
    const { customerId } = req.params;
    const { page, limit } = req.query;
    const result = await AgentService.getCustomerOrders(req.agent.id, customerId, { page, limit });
    return ApiResponse.paginated(res, result.orders, result.pagination);
  }

  /**
   * GET /api/agent/orders
   */
  static async getOrders(req, res) {
    const { page, limit, status, search } = req.query;
    const result = await AgentService.getOrders(req.agent.id, { page, limit, status, search });
    return ApiResponse.paginated(res, result.orders, result.pagination);
  }

  /**
   * GET /api/agent/orders/:orderId
   */
  static async getOrderById(req, res) {
    const { orderId } = req.params;
    const data = await AgentService.getOrderById(req.agent.id, orderId);
    return ApiResponse.success(res, data);
  }

  /**
   * GET /api/agent/commissions/summary
   */
  static async getCommissionSummary(req, res) {
    const data = await AgentService.getCommissionSummary(req.agent.id);
    return ApiResponse.success(res, data);
  }

  /**
   * GET /api/agent/commissions
   */
  static async getCommissions(req, res) {
    const { page, limit, status, startDate, endDate } = req.query;
    const result = await AgentService.getCommissions(req.agent.id, { page, limit, status, startDate, endDate });
    return ApiResponse.paginated(res, result.commissions, result.pagination);
  }

  /**
   * GET /api/agent/notifications
   */
  static async getNotifications(req, res) {
    const { page, limit } = req.query;
    const result = await AgentNotificationService.getNotifications(req.agent.id, { page, limit });
    return ApiResponse.paginated(res, result.notifications, result.pagination, null, 200, {
      unreadCount: result.unreadCount,
    });
  }

  /**
   * GET /api/agent/notifications/unread-count
   */
  static async getUnreadCount(req, res) {
    const data = await AgentNotificationService.getUnreadCount(req.agent.id);
    return ApiResponse.success(res, data);
  }

  /**
   * PATCH /api/agent/notifications/:notificationId/read
   */
  static async markNotificationRead(req, res) {
    const { notificationId } = req.params;
    const result = await AgentNotificationService.markAsRead(req.agent.id, notificationId);
    return ApiResponse.success(res, null, result.message);
  }

  /**
   * PATCH /api/agent/notifications/read-all
   */
  static async markAllNotificationsRead(req, res) {
    const result = await AgentNotificationService.markAllAsRead(req.agent.id);
    return ApiResponse.success(res, null, result.message);
  }

  /**
   * POST /api/agent/devices/register
   */
  static async registerDevice(req, res) {
    const validated = registerDeviceSchema.parse(req.body);
    const result = await AgentNotificationService.registerDevice(req.agent.id, validated);
    return ApiResponse.success(res, result, result.message);
  }

  /**
   * DELETE /api/agent/devices/:deviceId
   */
  static async removeDevice(req, res) {
    const { deviceId } = req.params;
    const result = await AgentNotificationService.removeDevice(req.agent.id, deviceId);
    return ApiResponse.success(res, null, result.message);
  }

  /**
   * GET /api/agent/profile
   */
  static async getProfile(req, res) {
    const data = await AgentService.getProfile(req.agent.id);
    return ApiResponse.success(res, data);
  }

  /**
   * PATCH /api/agent/profile
   */
  static async updateProfile(req, res) {
    const validated = updateProfileSchema.parse(req.body);
    const result = await AgentService.updateProfile(req.agent.id, validated);
    return ApiResponse.success(res, result, result.message);
  }
}

