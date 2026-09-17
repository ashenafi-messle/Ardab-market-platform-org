// ==============================================================================
// Ardab Market - Deliveries Operational Business Logic & Fulfillment Service
// ==============================================================================

import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/config/database.js';
import { ApiError } from '../../shared/utils/apiResponse.js';
import { generateNextDeliveryNumber } from './deliveryCode.service.js';
import {
  validateStatusTransition,
  getStatusTimestampUpdates,
} from './delivery.status.service.js';
import { STANDARD_VEHICLE_CAPACITY_KG } from '../constants/deliveryConstants.js';

const Decimal = Prisma.Decimal;

/**
 * Formats a raw Prisma delivery record with clean numeric and string representations.
 *
 * @param {object} delivery Raw delivery record with relation includes
 * @returns {object}
 */
export function formatDeliveryResponse(delivery) {
  if (!delivery) return null;

  return {
    id: delivery.id,
    deliveryNumber: delivery.deliveryNumber,
    orderId: delivery.orderId,
    customerId: delivery.customerId,
    tripId: delivery.tripId || null,
    driverId: delivery.driverId || null,
    vehicleId: delivery.vehicleId || null,
    status: delivery.status,
    city: delivery.city,
    deliveryZone: delivery.deliveryZone || null,
    neighborhood: delivery.neighborhood || null,
    addressLine: delivery.addressLine,
    recipientName: delivery.recipientName,
    recipientPhone: delivery.recipientPhone,
    latitude: delivery.latitude !== null && delivery.latitude !== undefined ? Number(delivery.latitude) : null,
    longitude: delivery.longitude !== null && delivery.longitude !== undefined ? Number(delivery.longitude) : null,
    scheduledAt: delivery.scheduledAt ? delivery.scheduledAt.toISOString() : null,
    estimatedDeliveryAt: delivery.estimatedDeliveryAt ? delivery.estimatedDeliveryAt.toISOString() : null,
    dispatchedAt: delivery.dispatchedAt ? delivery.dispatchedAt.toISOString() : null,
    deliveredAt: delivery.deliveredAt ? delivery.deliveredAt.toISOString() : null,
    failedAt: delivery.failedAt ? delivery.failedAt.toISOString() : null,
    cancelledAt: delivery.cancelledAt ? delivery.cancelledAt.toISOString() : null,
    deliveryFee: Number(delivery.deliveryFee || 0),
    deliveryNotes: delivery.deliveryNotes || null,
    failureReason: delivery.failureReason || null,
    cancellationReason: delivery.cancellationReason || null,
    proofOfDeliveryUrl: delivery.proofOfDeliveryUrl || null,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),

    // Relational Snapshots
    customer: delivery.customer
      ? {
          id: delivery.customer.id,
          customerCode: delivery.customer.customerCode,
          fullName: delivery.customer.fullName,
          phone: delivery.customer.phone,
          email: delivery.customer.email || null,
          city: delivery.customer.city,
          profileImageUrl: delivery.customer.profileImageUrl || null,
        }
      : null,

    order: delivery.order
      ? {
          id: delivery.order.id,
          orderNumber: delivery.order.orderNumber,
          status: delivery.order.status,
          totalAmount: Number(delivery.order.totalAmount || 0),
          totalWeight: Number(delivery.order.totalWeight || 0),
          paymentStatus: delivery.order.paymentStatus,
          itemCount: delivery.order.items ? delivery.order.items.length : 0,
          items: delivery.order.items
            ? delivery.order.items.map((it) => ({
                id: it.id,
                productName: it.productNameSnapshot,
                itemCode: it.itemCodeSnapshot,
                quantity: it.quantity,
                unit: it.unitSnapshot,
                unitPrice: Number(it.unitPrice || 0),
                subtotal: Number(it.subtotal || 0),
                weightPerUnit: Number(it.weightPerUnit || 0),
                totalWeight: Number(it.totalWeight || 0),
              }))
            : [],
        }
      : null,

    trip: delivery.trip
      ? {
          id: delivery.trip.id,
          tripNumber: delivery.trip.tripNumber,
          status: delivery.trip.status,
          city: delivery.trip.city,
          pickupHub: delivery.trip.pickupHub,
          maxCapacityKg: Number(delivery.trip.maxCapacityKg || STANDARD_VEHICLE_CAPACITY_KG),
          totalWeightKg: Number(delivery.trip.totalWeightKg || 0),
          vehicle: delivery.trip.vehicle
            ? {
                id: delivery.trip.vehicle.id,
                plateNumber: delivery.trip.vehicle.plateNumber,
                model: delivery.trip.vehicle.model,
              }
            : null,
          driver: delivery.trip.driver
            ? {
                id: delivery.trip.driver.id,
                driverCode: delivery.trip.driver.driverCode,
                fullName: delivery.trip.driver.fullName,
                phone: delivery.trip.driver.phone,
              }
            : null,
        }
      : null,

    driver: delivery.driver
      ? {
          id: delivery.driver.id,
          driverCode: delivery.driver.driverCode,
          fullName: delivery.driver.fullName,
          phone: delivery.driver.phone,
        }
      : delivery.trip?.driver
      ? {
          id: delivery.trip.driver.id,
          driverCode: delivery.trip.driver.driverCode,
          fullName: delivery.trip.driver.fullName,
          phone: delivery.trip.driver.phone,
        }
      : null,

    vehicle: delivery.vehicle
      ? {
          id: delivery.vehicle.id,
          plateNumber: delivery.vehicle.plateNumber,
          model: delivery.vehicle.model,
        }
      : delivery.trip?.vehicle
      ? {
          id: delivery.trip.vehicle.id,
          plateNumber: delivery.trip.vehicle.plateNumber,
          model: delivery.trip.vehicle.model,
        }
      : null,

    activities: delivery.activities
      ? delivery.activities.map((a) => ({
          id: a.id,
          action: a.action,
          fromStatus: a.fromStatus,
          toStatus: a.toStatus,
          description: a.description,
          actor: a.actor,
          timestamp: a.createdAt.toISOString(),
        }))
      : [],
  };
}

/**
 * Lists deliveries with server-side pagination, multi-field search, filters, and whitelisted sorting.
 * Employs Prisma relation includes to eliminate N+1 queries.
 *
 * @param {object} queryOptions
 * @returns {Promise<{ deliveries: any[], pagination: object }>}
 */
export async function listDeliveries(queryOptions = {}) {
  const {
    page = 1,
    pageSize = 25,
    search,
    city,
    deliveryZone,
    status,
    tripId,
    driverId,
    vehicleId,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryOptions;

  const take = Math.min(Math.max(Number(pageSize), 1), 100);
  const skip = (Math.max(Number(page), 1) - 1) * take;

  const where = {};

  // City filtering
  if (city && city !== 'All Cities') {
    where.city = { equals: city, mode: 'insensitive' };
  }

  // Delivery Zone filtering
  if (deliveryZone && deliveryZone !== 'All Zones') {
    where.deliveryZone = { equals: deliveryZone, mode: 'insensitive' };
  }

  // Status filtering
  if (status && status !== 'ALL') {
    where.status = status;
  }

  // Trip filtering
  if (tripId && tripId !== 'ALL') {
    where.tripId = tripId;
  }

  // Driver filtering
  if (driverId && driverId !== 'ALL') {
    where.driverId = driverId;
  }

  // Vehicle filtering
  if (vehicleId && vehicleId !== 'ALL') {
    where.vehicleId = vehicleId;
  }

  // Date range filtering
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Multi-field search
  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { deliveryNumber: { contains: term, mode: 'insensitive' } },
      { order: { orderNumber: { contains: term, mode: 'insensitive' } } },
      { customer: { fullName: { contains: term, mode: 'insensitive' } } },
      { customer: { customerCode: { contains: term, mode: 'insensitive' } } },
      { customer: { phone: { contains: term } } },
      { recipientName: { contains: term, mode: 'insensitive' } },
      { recipientPhone: { contains: term } },
      { deliveryZone: { contains: term, mode: 'insensitive' } },
      { addressLine: { contains: term, mode: 'insensitive' } },
      { trip: { tripNumber: { contains: term, mode: 'insensitive' } } },
    ];
  }

  // Safe sorting whitelist
  const allowedSorts = ['deliveryNumber', 'createdAt', 'scheduledAt', 'deliveredAt', 'status'];
  const sortField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
  const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const [total, rawDeliveries] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortDirection },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            fullName: true,
            phone: true,
            email: true,
            city: true,
            profileImageUrl: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            totalWeight: true,
            paymentStatus: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripNumber: true,
            status: true,
            city: true,
            pickupHub: true,
            maxCapacityKg: true,
            totalWeightKg: true,
            vehicle: {
              select: { id: true, plateNumber: true, model: true },
            },
            driver: {
              select: { id: true, driverCode: true, fullName: true, phone: true },
            },
          },
        },
        driver: {
          select: { id: true, driverCode: true, fullName: true, phone: true },
        },
        vehicle: {
          select: { id: true, plateNumber: true, model: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / take) || 1;
  const deliveries = rawDeliveries.map((d) => formatDeliveryResponse(d));

  return {
    deliveries,
    pagination: {
      page: Number(page),
      pageSize: take,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves a single delivery by internal UUID or deliveryNumber.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getDeliveryById(id) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: {
      customer: {
        select: {
          id: true,
          customerCode: true,
          fullName: true,
          phone: true,
          email: true,
          city: true,
          profileImageUrl: true,
        },
      },
      order: {
        include: {
          items: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      trip: {
        include: {
          vehicle: true,
          driver: true,
        },
      },
      driver: true,
      vehicle: true,
      activities: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  return formatDeliveryResponse(delivery);
}

/**
 * Retrieves chronological lifecycle timeline events for a delivery.
 *
 * @param {string} id
 * @returns {Promise<any[]>}
 */
export async function getDeliveryActivity(id) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    select: { id: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  const activities = await prisma.deliveryActivity.findMany({
    where: { deliveryId: delivery.id },
    orderBy: { createdAt: 'asc' },
  });

  return activities.map((a) => ({
    id: a.id,
    action: a.action,
    fromStatus: a.fromStatus,
    toStatus: a.toStatus,
    description: a.description,
    actor: a.actor,
    timestamp: a.createdAt.toISOString(),
  }));
}

/**
 * Creates a Delivery for an existing customer order.
 * Safely snapshots the destination address and derives authoritative relationships.
 *
 * @param {object} data Input data { orderId, scheduledAt, deliveryNotes }
 * @param {object} adminUser Requesting admin user
 * @param {string} ipAddress Requesting IP
 * @returns {Promise<object>}
 */
export async function createDeliveryForOrder(data, adminUser = null, ipAddress = null) {
  const { orderId, scheduledAt, deliveryNotes } = data;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  const order = await prisma.order.findFirst({
    where: isUuid ? { id: orderId } : { orderNumber: orderId },
    include: {
      customer: true,
      deliveryAddressSnapshot: true,
      delivery: true,
    },
  });

  if (!order) {
    throw ApiError.notFound(`Order "${orderId}" not found.`);
  }

  if (order.delivery) {
    throw ApiError.conflict(`Delivery already exists for Order "${order.orderNumber}": ${order.delivery.deliveryNumber}`);
  }

  // Derive immutable destination snapshot from order delivery address snapshot or defaults
  const recipientName = order.deliveryAddressSnapshot?.recipientName || order.customer.fullName;
  const recipientPhone = order.deliveryAddressSnapshot?.phone || order.customer.phone;
  const city = order.city;
  const deliveryZone = order.deliveryAddressSnapshot?.deliveryZone || order.deliveryZone || null;
  const neighborhood = order.deliveryAddressSnapshot?.neighborhood || null;
  const addressLine = order.deliveryAddressSnapshot?.addressLine || order.deliveryAddress || 'Standard Delivery Address';
  const latitude = order.deliveryAddressSnapshot?.latitude || null;
  const longitude = order.deliveryAddressSnapshot?.longitude || null;

  const deliveryNumber = await generateNextDeliveryNumber();

  const createdDelivery = await prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.create({
      data: {
        deliveryNumber,
        orderId: order.id,
        customerId: order.customerId,
        status: 'PENDING',
        city,
        deliveryZone,
        neighborhood,
        addressLine,
        recipientName,
        recipientPhone,
        latitude,
        longitude,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        deliveryFee: order.deliveryFee,
        deliveryNotes: deliveryNotes || null,
      },
      include: {
        customer: true,
        order: true,
        activities: true,
      },
    });

    // Record DeliveryActivity
    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Delivery created for Order',
        fromStatus: null,
        toStatus: 'PENDING',
        description: `Delivery ${deliveryNumber} created for Order ${order.orderNumber}`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    // Record AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_CREATED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Created Delivery ${deliveryNumber} for Order ${order.orderNumber}`,
        status: 'SUCCESS',
      },
    });

    return delivery;
  });

  return formatDeliveryResponse(createdDelivery);
}

/**
 * Transitions a delivery from PENDING to READY_FOR_ASSIGNMENT.
 *
 * @param {string} id
 * @param {object} adminUser
 * @param {string} ipAddress
 * @returns {Promise<object>}
 */
export async function prepareDelivery(id, adminUser = null, ipAddress = null) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: { order: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  validateStatusTransition(delivery.status, 'READY_FOR_ASSIGNMENT');

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'READY_FOR_ASSIGNMENT',
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        order: { include: { items: true } },
        trip: { include: { vehicle: true, driver: true } },
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });

    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Prepared for Trip Assignment',
        fromStatus: delivery.status,
        toStatus: 'READY_FOR_ASSIGNMENT',
        description: `Delivery ${delivery.deliveryNumber} marked ready for trip consolidation`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_PREPARED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Delivery ${delivery.deliveryNumber} moved to READY_FOR_ASSIGNMENT`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  return formatDeliveryResponse(updatedDelivery);
}

/**
 * Assigns a delivery to a Trip.
 * Validates city compatibility and enforces the strict 5,000 KG fleet capacity constraint.
 *
 * @param {string} id Delivery ID
 * @param {object} payload { tripId, driverId, vehicleId, scheduledAt }
 * @param {object} adminUser Requesting admin user
 * @param {string} ipAddress Requesting IP
 * @returns {Promise<object>}
 */
export async function assignDeliveryToTrip(id, payload, adminUser = null, ipAddress = null) {
  const { tripId, driverId, vehicleId, scheduledAt } = payload;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: { order: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  // Delivery must be in PENDING or READY_FOR_ASSIGNMENT
  if (delivery.status !== 'PENDING' && delivery.status !== 'READY_FOR_ASSIGNMENT') {
    throw ApiError.badRequest(
      `Delivery in "${delivery.status}" status cannot be assigned to a trip. Must be PENDING or READY_FOR_ASSIGNMENT.`
    );
  }

  // Fetch target trip
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: true,
      driver: true,
      deliveries: {
        include: { order: true },
      },
    },
  });

  if (!trip) {
    throw ApiError.notFound(`Trip "${tripId}" not found.`);
  }

  // Check city compatibility
  if (delivery.city.toLowerCase() !== trip.city.toLowerCase()) {
    throw ApiError.badRequest(
      `City mismatch: Delivery destination is "${delivery.city}" but Trip is routed for "${trip.city}".`
    );
  }

  // Calculate total existing weight on the trip
  const existingWeightKg = trip.deliveries.reduce((sum, d) => {
    return sum + Number(d.order?.totalWeight || 0);
  }, 0);

  const deliveryWeightKg = Number(delivery.order?.totalWeight || 0);
  const newTotalWeightKg = existingWeightKg + deliveryWeightKg;
  const maxCapacityKg = Number(trip.maxCapacityKg || STANDARD_VEHICLE_CAPACITY_KG);

  // Enforce 5,000 KG Vehicle Capacity Constraint
  if (newTotalWeightKg > maxCapacityKg) {
    throw ApiError.badRequest(
      `Capacity exceeded: Adding this delivery (${deliveryWeightKg} kg) would exceed the vehicle capacity limit of ${maxCapacityKg} kg. Current trip weight: ${existingWeightKg} kg, Required: ${newTotalWeightKg} kg.`
    );
  }

  // Authoritative vehicle and driver derived from Trip unless specifically supplied
  const finalVehicleId = trip.vehicleId || vehicleId || null;
  const finalDriverId = trip.driverId || driverId || null;

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    // Update delivery
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        tripId: trip.id,
        vehicleId: finalVehicleId,
        driverId: finalDriverId,
        status: 'ASSIGNED',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : delivery.scheduledAt,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        order: { include: { items: true } },
        trip: { include: { vehicle: true, driver: true } },
        driver: true,
        vehicle: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Update trip total weight
    await tx.trip.update({
      where: { id: trip.id },
      data: {
        totalWeightKg: newTotalWeightKg,
        updatedAt: new Date(),
      },
    });

    // Update order status to ASSIGNED_TO_TRIP
    await tx.order.update({
      where: { id: delivery.orderId },
      data: {
        status: 'ASSIGNED_TO_TRIP',
        updatedAt: new Date(),
      },
    });

    // Log DeliveryActivity
    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Assigned to Trip',
        fromStatus: delivery.status,
        toStatus: 'ASSIGNED',
        description: `Delivery assigned to Trip ${trip.tripNumber} (${newTotalWeightKg}/${maxCapacityKg} kg total load)`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
        metadata: JSON.stringify({ tripId: trip.id, tripNumber: trip.tripNumber, weightKg: deliveryWeightKg }),
      },
    });

    // Log OrderActivity
    await tx.orderActivity.create({
      data: {
        orderId: delivery.orderId,
        action: 'Order Assigned to Delivery Trip',
        fromStatus: delivery.order.status,
        toStatus: 'ASSIGNED_TO_TRIP',
        description: `Consignment assigned to Fleet Trip ${trip.tripNumber}`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    // Log AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_ASSIGNED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Delivery ${delivery.deliveryNumber} assigned to Trip ${trip.tripNumber}`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  return formatDeliveryResponse(updatedDelivery);
}

/**
 * Dispatches a delivery (transitions ASSIGNED to OUT_FOR_DELIVERY).
 * Synchronizes related Order status to IN_TRANSIT.
 *
 * @param {string} id Delivery ID
 * @param {object} adminUser Requesting admin user
 * @param {string} ipAddress Requesting IP
 * @returns {Promise<object>}
 */
export async function dispatchDelivery(id, adminUser = null, ipAddress = null) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: { order: true, trip: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  validateStatusTransition(delivery.status, 'OUT_FOR_DELIVERY');

  const now = new Date();

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'OUT_FOR_DELIVERY',
        dispatchedAt: now,
        updatedAt: now,
      },
      include: {
        customer: true,
        order: { include: { items: true } },
        trip: { include: { vehicle: true, driver: true } },
        driver: true,
        vehicle: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Update order status to IN_TRANSIT
    await tx.order.update({
      where: { id: delivery.orderId },
      data: {
        status: 'IN_TRANSIT',
        dispatchedAt: now,
        updatedAt: now,
      },
    });

    // If assigned to a trip and trip is still in PLANNING or LOADING, advance trip to IN_PROGRESS
    if (delivery.tripId) {
      await tx.trip.update({
        where: { id: delivery.tripId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: delivery.trip?.startedAt || now,
          updatedAt: now,
        },
      });
    }

    // Log DeliveryActivity
    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Dispatched Out for Delivery',
        fromStatus: delivery.status,
        toStatus: 'OUT_FOR_DELIVERY',
        description: `Delivery dispatched to recipient destination by vehicle fleet`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    // Log OrderActivity
    await tx.orderActivity.create({
      data: {
        orderId: delivery.orderId,
        action: 'Order in transit',
        fromStatus: delivery.order.status,
        toStatus: 'IN_TRANSIT',
        description: `Vehicle en route with customer consignment`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    // Log AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_DISPATCHED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Delivery ${delivery.deliveryNumber} dispatched OUT_FOR_DELIVERY`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  return formatDeliveryResponse(updatedDelivery);
}

/**
 * Completes a delivery (transitions OUT_FOR_DELIVERY to DELIVERED).
 * Synchronizes related Order status to DELIVERED and updates payment if COD.
 *
 * @param {string} id Delivery ID
 * @param {object} payload { proofOfDeliveryUrl, notes }
 * @param {object} adminUser Requesting admin user
 * @param {string} ipAddress Requesting IP
 * @returns {Promise<object>}
 */
export async function completeDelivery(id, payload = {}, adminUser = null, ipAddress = null) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: { order: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  validateStatusTransition(delivery.status, 'DELIVERED');

  const now = new Date();

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
        proofOfDeliveryUrl: payload.proofOfDeliveryUrl || delivery.proofOfDeliveryUrl,
        deliveryNotes: payload.notes || delivery.deliveryNotes,
        updatedAt: now,
      },
      include: {
        customer: true,
        order: { include: { items: true } },
        trip: { include: { vehicle: true, driver: true } },
        driver: true,
        vehicle: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Update related Order status to DELIVERED
    const orderUpdate = {
      status: 'DELIVERED',
      deliveredAt: now,
      updatedAt: now,
    };

    // If order was pending payment on delivery, settle payment
    if (delivery.order.paymentStatus === 'PENDING') {
      orderUpdate.paymentStatus = 'PAID';
    }

    await tx.order.update({
      where: { id: delivery.orderId },
      data: orderUpdate,
    });

    // Log DeliveryActivity
    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Delivery Completed',
        fromStatus: delivery.status,
        toStatus: 'DELIVERED',
        description: `Customer order fulfilled and delivered successfully`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
        metadata: payload.proofOfDeliveryUrl ? JSON.stringify({ proofOfDeliveryUrl: payload.proofOfDeliveryUrl }) : null,
      },
    });

    // Log OrderActivity
    await tx.orderActivity.create({
      data: {
        orderId: delivery.orderId,
        action: 'Order Fulfilled & Delivered',
        fromStatus: delivery.order.status,
        toStatus: 'DELIVERED',
        description: `Customer received delivery consignment`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    // Log AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_COMPLETED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Delivery ${delivery.deliveryNumber} marked DELIVERED`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  return formatDeliveryResponse(updatedDelivery);
}

/**
 * Records a delivery failure with a structured reason.
 *
 * @param {string} id Delivery ID
 * @param {string} reason Failure reason
 * @param {string|null} notes Additional operational notes
 * @param {object} adminUser Requesting admin user
 * @param {string} ipAddress Requesting IP
 * @returns {Promise<object>}
 */
export async function failDelivery(id, reason, notes = null, adminUser = null, ipAddress = null) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: { order: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  validateStatusTransition(delivery.status, 'FAILED');

  const now = new Date();

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        failedAt: now,
        failureReason: reason,
        deliveryNotes: notes || delivery.deliveryNotes,
        updatedAt: now,
      },
      include: {
        customer: true,
        order: { include: { items: true } },
        trip: { include: { vehicle: true, driver: true } },
        driver: true,
        vehicle: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Update related Order status to FAILED
    await tx.order.update({
      where: { id: delivery.orderId },
      data: {
        status: 'FAILED',
        updatedAt: now,
      },
    });

    // Log DeliveryActivity
    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Delivery Attempt Failed',
        fromStatus: delivery.status,
        toStatus: 'FAILED',
        description: `Delivery failed: ${reason}${notes ? ` - ${notes}` : ''}`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
        metadata: JSON.stringify({ failureReason: reason, notes }),
      },
    });

    // Log OrderActivity
    await tx.orderActivity.create({
      data: {
        orderId: delivery.orderId,
        action: 'Delivery fulfillment failed',
        fromStatus: delivery.order.status,
        toStatus: 'FAILED',
        description: `Delivery attempt failed: ${reason}`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
      },
    });

    // Log AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_FAILED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Delivery ${delivery.deliveryNumber} marked FAILED (Reason: ${reason})`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  return formatDeliveryResponse(updatedDelivery);
}

/**
 * Cancels a delivery with a structured cancellation reason.
 *
 * @param {string} id Delivery ID
 * @param {string} reason Cancellation reason
 * @param {object} adminUser Requesting admin user
 * @param {string} ipAddress Requesting IP
 * @returns {Promise<object>}
 */
export async function cancelDelivery(id, reason, adminUser = null, ipAddress = null) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const delivery = await prisma.delivery.findFirst({
    where: isUuid ? { id } : { deliveryNumber: id },
    include: { order: true, trip: true },
  });

  if (!delivery) {
    throw ApiError.notFound(`Delivery "${id}" not found.`);
  }

  validateStatusTransition(delivery.status, 'CANCELLED');

  const now = new Date();

  const updatedDelivery = await prisma.$transaction(async (tx) => {
    // If delivery was assigned to a trip, adjust trip's totalWeightKg
    if (delivery.tripId && delivery.trip) {
      const weightToRemove = Number(delivery.order?.totalWeight || 0);
      const newTripWeight = Math.max(0, Number(delivery.trip.totalWeightKg || 0) - weightToRemove);
      await tx.trip.update({
        where: { id: delivery.tripId },
        data: {
          totalWeightKg: newTripWeight,
          updatedAt: now,
        },
      });
    }

    const updated = await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason,
        tripId: null,
        updatedAt: now,
      },
      include: {
        customer: true,
        order: { include: { items: true } },
        trip: { include: { vehicle: true, driver: true } },
        driver: true,
        vehicle: true,
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Update related Order status to CANCELLED if not already
    if (delivery.order && delivery.order.status !== 'CANCELLED') {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancelledReason: reason,
          updatedAt: now,
        },
      });

      await tx.orderActivity.create({
        data: {
          orderId: delivery.orderId,
          action: 'Order Cancelled with Delivery',
          fromStatus: delivery.order.status,
          toStatus: 'CANCELLED',
          description: `Order cancelled during delivery operations: ${reason}`,
          actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
          actorId: adminUser?.id || null,
        },
      });
    }

    // Log DeliveryActivity
    await tx.deliveryActivity.create({
      data: {
        deliveryId: delivery.id,
        action: 'Delivery Cancelled',
        fromStatus: delivery.status,
        toStatus: 'CANCELLED',
        description: `Delivery cancelled: ${reason}`,
        actor: adminUser?.fullName || adminUser?.email || 'Super Admin',
        actorId: adminUser?.id || null,
        metadata: JSON.stringify({ cancellationReason: reason }),
      },
    });

    // Log AuditLog
    await tx.auditLog.create({
      data: {
        adminId: adminUser?.id || null,
        adminEmail: adminUser?.email || 'superadmin@ardabmarket.com',
        action: 'DELIVERY_CANCELLED',
        entity: 'Delivery',
        entityId: delivery.id,
        ipAddress: ipAddress || null,
        changesSummary: `Delivery ${delivery.deliveryNumber} marked CANCELLED (Reason: ${reason})`,
        status: 'SUCCESS',
      },
    });

    return updated;
  });

  return formatDeliveryResponse(updatedDelivery);
}

/**
 * Lists available trips for delivery assignment in a given city.
 * Calculates remaining capacity out of 5,000 KG.
 *
 * @param {string|null} city
 * @returns {Promise<any[]>}
 */
export async function listAvailableTrips(city = null) {
  const where = {
    status: { in: ['PLANNING', 'LOADING', 'READY'] },
  };

  if (city && city !== 'All Cities') {
    where.city = { equals: city, mode: 'insensitive' };
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      vehicle: true,
      driver: true,
      deliveries: {
        select: {
          id: true,
          order: { select: { totalWeight: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return trips.map((t) => {
    const currentLoadKg = t.deliveries.reduce((sum, d) => sum + Number(d.order?.totalWeight || 0), 0);
    const capacityKg = Number(t.maxCapacityKg || STANDARD_VEHICLE_CAPACITY_KG);
    const remainingCapacityKg = Math.max(0, capacityKg - currentLoadKg);
    const utilizationPercentage = capacityKg > 0 ? Math.round((currentLoadKg / capacityKg) * 100) : 0;

    return {
      id: t.id,
      tripNumber: t.tripNumber,
      city: t.city,
      status: t.status,
      pickupHub: t.pickupHub,
      deliveryZones: t.deliveryZones,
      vehicleId: t.vehicleId,
      vehiclePlate: t.vehicle?.plateNumber || 'Unassigned',
      vehicleModel: t.vehicle?.model || '',
      driverId: t.driverId,
      driverName: t.driver?.fullName || 'Unassigned',
      driverPhone: t.driver?.phone || '',
      capacityKg,
      currentLoadKg,
      remainingCapacityKg,
      utilizationPercentage,
      orderCount: t.deliveries.length,
      createdAt: t.createdAt.toISOString(),
    };
  });
}
