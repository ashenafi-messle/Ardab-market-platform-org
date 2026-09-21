// ==============================================================================
// Ardab Market - Customer Web Activity Telemetry Middleware
// ==============================================================================
// Intercepts operations originating from the Customer Web App and automatically
// streams high-value events to the central security_events table so that Super Admin
// and Sub Admin security management pages track customer web app actions in real-time.

import { logPlatformSecurityEvent } from '../services/platformSecurity.service.js';

export function customerTelemetryMiddleware(req, res, next) {
  // Capture response finish to log meaningful customer actions
  res.on('finish', () => {
    // Only capture successful or notable responses
    if (res.statusCode >= 500) return;

    const path = req.originalUrl || req.path || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'] || null;
    const customerId = req.customer?.id || null;
    const customerEmail = req.customer?.email || null;
    const deviceId = req.headers['x-client-device-id'] || null;

    let eventType = null;
    let severity = 'INFO';
    let targetType = 'Customer';
    let metadata = {
      path,
      method: req.method,
      statusCode: res.statusCode,
      deviceId,
    };

    // Classify high-value Customer Web interactions
    if (path.includes('/api/customer/orders') && req.method === 'POST') {
      eventType = 'CUSTOMER_ORDER_PLACED';
      severity = 'INFO';
      targetType = 'Order';
    } else if (path.includes('/api/customer/catalog/products') && req.query?.search) {
      eventType = 'CUSTOMER_SEARCH_PERFORMED';
      severity = 'INFO';
      targetType = 'Product';
      metadata.searchQuery = String(req.query.search).slice(0, 100);
    } else if (path.includes('/api/customer/catalog/products') && req.method === 'GET' && req.params?.id) {
      eventType = 'CUSTOMER_PRODUCT_VIEWED';
      severity = 'INFO';
      targetType = 'Product';
      metadata.productId = req.params.id;
    } else if (path.includes('/api/customer/catalog/categories') && req.method === 'GET') {
      if (Math.random() < 0.25) {
        eventType = 'CUSTOMER_CATEGORY_BROWSED';
        severity = 'INFO';
        targetType = 'Category';
      }
    } else if (path.includes('/api/customer/reviews') && req.method === 'POST') {
      eventType = 'CUSTOMER_REVIEW_SUBMITTED';
      severity = 'INFO';
      targetType = 'Review';
    }

    if (eventType) {
      logPlatformSecurityEvent({
        eventType,
        severity,
        source: 'CUSTOMER_WEB',
        actorType: customerId ? 'CUSTOMER' : 'ANONYMOUS',
        actorId: customerId,
        actorEmail: customerEmail,
        targetType,
        ipAddress,
        userAgent,
        endpoint: path,
        httpMethod: req.method,
        metadata,
      }).catch(() => {});
    }
  });

  next();
}
