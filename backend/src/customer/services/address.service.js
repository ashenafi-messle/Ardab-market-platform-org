// ==============================================================================
// Ardab Market - Customer Address Service
// ==============================================================================
// Manages customer delivery addresses with strict IDOR protections and
// transactional default address switching.
// ==============================================================================

import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';

/**
 * Formats CustomerAddress for API response
 */
function formatAddress(addr) {
  if (!addr) return null;
  return {
    id: addr.id,
    customerId: addr.customerId,
    label: addr.label || 'Home',
    recipientName: addr.recipientName,
    fullName: addr.recipientName, // Alias for mobile app compatibility
    phone: addr.phone,
    city: addr.city,
    deliveryZone: addr.deliveryZone || null,
    subcity: addr.deliveryZone || null, // Alias
    neighborhood: addr.neighborhood || null,
    addressLine: addr.addressLine,
    specificAddress: addr.addressLine, // Alias
    latitude: addr.latitude ? Number(addr.latitude) : null,
    longitude: addr.longitude ? Number(addr.longitude) : null,
    isDefault: addr.isDefault,
    isActive: addr.isActive,
    createdAt: addr.createdAt ? addr.createdAt.toISOString() : null,
    updatedAt: addr.updatedAt ? addr.updatedAt.toISOString() : null,
  };
}

/**
 * Normalizes input address fields
 */
function normalizeAddressInput(data) {
  const recipientName = (data.recipientName || data.fullName || '').trim();
  const addressLine = (data.addressLine || data.specificAddress || data.streetAddress || '').trim();
  const deliveryZone = (data.deliveryZone || data.subcity || data.district || '').trim() || null;
  const neighborhood = (data.neighborhood || '').trim() || null;
  const phone = (data.phone || '').trim();
  const city = (data.city || 'Gondar').trim();
  const label = (data.label || 'Home').trim();

  return {
    recipientName,
    addressLine,
    deliveryZone,
    neighborhood,
    phone,
    city,
    label,
    latitude: data.latitude !== undefined && data.latitude !== null ? data.latitude : null,
    longitude: data.longitude !== undefined && data.longitude !== null ? data.longitude : null,
    isDefault: Boolean(data.isDefault),
  };
}

/**
 * Lists all active delivery addresses for the authenticated customer.
 */
export async function listAddresses(customerId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const addresses = await prisma.customerAddress.findMany({
    where: {
      customerId,
      isActive: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return addresses.map(formatAddress);
}

/**
 * Retrieves a single address belonging to the authenticated customer.
 */
export async function getAddressById(customerId, addressId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const address = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
      isActive: true,
    },
  });

  if (!address) {
    throw ApiError.notFound('Address not found or access denied', 'ADDRESS_NOT_FOUND');
  }

  return formatAddress(address);
}

/**
 * Creates a new address for the authenticated customer.
 * If this is the customer's first address, or if isDefault is true,
 * it is atomically marked as default.
 */
export async function createAddress(customerId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const normalized = normalizeAddressInput(data);

  // Check how many active addresses the customer already has
  const existingCount = await prisma.customerAddress.count({
    where: { customerId, isActive: true },
  });

  // Make default if it's the first address or explicitly requested
  const shouldBeDefault = existingCount === 0 || normalized.isDefault;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault && existingCount > 0) {
      await tx.customerAddress.updateMany({
        where: { customerId, isActive: true },
        data: { isDefault: false },
      });
    }

    const newAddr = await tx.customerAddress.create({
      data: {
        customerId,
        label: normalized.label,
        recipientName: normalized.recipientName,
        phone: normalized.phone,
        city: normalized.city,
        deliveryZone: normalized.deliveryZone,
        neighborhood: normalized.neighborhood,
        addressLine: normalized.addressLine,
        latitude: normalized.latitude,
        longitude: normalized.longitude,
        isDefault: shouldBeDefault,
        isActive: true,
      },
    });

    return newAddr;
  });

  return formatAddress(created);
}

/**
 * Updates an existing address belonging to the authenticated customer.
 */
export async function updateAddress(customerId, addressId, data) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const existing = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
      isActive: true,
    },
  });

  if (!existing) {
    throw ApiError.notFound('Address not found or access denied', 'ADDRESS_NOT_FOUND');
  }

  const recipientName = data.recipientName !== undefined || data.fullName !== undefined
    ? (data.recipientName || data.fullName).trim()
    : undefined;

  const addressLine = data.addressLine !== undefined || data.specificAddress !== undefined || data.streetAddress !== undefined
    ? (data.addressLine || data.specificAddress || data.streetAddress).trim()
    : undefined;

  const deliveryZone = data.deliveryZone !== undefined || data.subcity !== undefined
    ? ((data.deliveryZone || data.subcity || '').trim() || null)
    : undefined;

  const neighborhood = data.neighborhood !== undefined
    ? ((data.neighborhood || '').trim() || null)
    : undefined;

  const phone = data.phone !== undefined ? data.phone.trim() : undefined;
  const city = data.city !== undefined ? data.city.trim() : undefined;
  const label = data.label !== undefined ? data.label.trim() : undefined;
  const isDefault = data.isDefault !== undefined ? Boolean(data.isDefault) : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    if (isDefault === true) {
      await tx.customerAddress.updateMany({
        where: { customerId, isActive: true },
        data: { isDefault: false },
      });
    }

    const addr = await tx.customerAddress.update({
      where: { id: existing.id },
      data: {
        ...(recipientName !== undefined && { recipientName }),
        ...(addressLine !== undefined && { addressLine }),
        ...(deliveryZone !== undefined && { deliveryZone }),
        ...(neighborhood !== undefined && { neighborhood }),
        ...(phone !== undefined && { phone }),
        ...(city !== undefined && { city }),
        ...(label !== undefined && { label }),
        ...(isDefault !== undefined && { isDefault }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
      },
    });

    return addr;
  });

  return formatAddress(updated);
}

/**
 * Sets an address as the default delivery address in an atomic transaction.
 */
export async function setDefaultAddress(customerId, addressId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const existing = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
      isActive: true,
    },
  });

  if (!existing) {
    throw ApiError.notFound('Address not found or access denied', 'ADDRESS_NOT_FOUND');
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Unset all customer addresses
    await tx.customerAddress.updateMany({
      where: { customerId, isActive: true },
      data: { isDefault: false },
    });

    // 2. Set targeted address as default
    const defaultAddr = await tx.customerAddress.update({
      where: { id: existing.id },
      data: { isDefault: true },
    });

    return defaultAddr;
  });

  return formatAddress(updated);
}

/**
 * Deletes (soft-deletes) an address belonging to the authenticated customer.
 * If the deleted address was default, another active address becomes default.
 */
export async function deleteAddress(customerId, addressId) {
  if (!customerId) {
    throw ApiError.unauthorized('Customer authentication required');
  }

  const existing = await prisma.customerAddress.findFirst({
    where: {
      id: addressId,
      customerId,
      isActive: true,
    },
  });

  if (!existing) {
    throw ApiError.notFound('Address not found or access denied', 'ADDRESS_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    // Soft delete to protect any historical references
    await tx.customerAddress.update({
      where: { id: existing.id },
      data: { isActive: false, isDefault: false },
    });

    // If the deleted address was the default, make the most recent remaining address default
    if (existing.isDefault) {
      const nextDefault = await tx.customerAddress.findFirst({
        where: { customerId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (nextDefault) {
        await tx.customerAddress.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return { deleted: true, addressId };
}
