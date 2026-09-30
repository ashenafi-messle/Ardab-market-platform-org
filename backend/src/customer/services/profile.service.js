// ==============================================================================
// Ardab Market - Customer Profile Service
// ==============================================================================
// Manages customer profile retrieval and strictly guarded field editing.
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { sanitizeCustomer } from './customerAuth.service.js';

/**
 * Returns safe customer profile with lightweight activity metrics
 */
export async function getCustomerProfile(customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      customerCode: true,
      fullName: true,
      email: true,
      phone: true,
      profileImageUrl: true,
      city: true,
      deliveryZone: true,
      status: true,
      verificationStatus: true,
      lastActivityAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          orders: true,
          addresses: { where: { isActive: true } },
          wishlistItems: true,
          supportTickets: true,
        },
      },
    },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  if (customer.status === 'SUSPENDED') {
    throw ApiError.forbidden('Your account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
  }

  return {
    ...sanitizeCustomer(customer),
    metrics: {
      ordersCount: customer._count?.orders || 0,
      addressesCount: customer._count?.addresses || 0,
      wishlistCount: customer._count?.wishlistItems || 0,
      supportTicketsCount: customer._count?.supportTickets || 0,
    },
  };
}

/**
 * Updates allowed customer profile fields.
 * Strictly ignores/blocks attempts to modify internal, accounting, or security fields.
 */
export async function updateCustomerProfile(customerId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');
  }

  if (customer.status !== 'ACTIVE') {
    throw ApiError.forbidden('Cannot update an inactive or suspended account', 'ACCOUNT_INACTIVE');
  }

  const updatePayload = {};

  if (typeof data.fullName === 'string') {
    const trimmed = data.fullName.trim();
    if (trimmed.length >= 2 && trimmed.length <= 100) {
      updatePayload.fullName = trimmed;
    }
  }

  if (typeof data.city === 'string') {
    const trimmed = data.city.trim();
    if (trimmed.length >= 2 && trimmed.length <= 100) {
      updatePayload.city = trimmed;
    }
  }

  if (data.deliveryZone !== undefined) {
    updatePayload.deliveryZone = typeof data.deliveryZone === 'string' && data.deliveryZone.trim().length > 0
      ? data.deliveryZone.trim()
      : null;
  }

  if (data.profileImageUrl !== undefined) {
    // Only accept valid URL strings or null
    if (data.profileImageUrl === null || (typeof data.profileImageUrl === 'string' && data.profileImageUrl.startsWith('http'))) {
      updatePayload.profileImageUrl = data.profileImageUrl;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return getCustomerProfile(customerId);
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: updatePayload,
  });

  // Record audit activity
  await prisma.customerActivity.create({
    data: {
      customerId,
      action: 'PROFILE_UPDATED',
      description: `Customer updated profile information (${Object.keys(updatePayload).join(', ')})`,
      actor: 'Customer',
    },
  }).catch(() => {});

  return getCustomerProfile(customerId);
}
