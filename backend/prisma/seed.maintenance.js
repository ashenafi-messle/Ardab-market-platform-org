// ==============================================================================
// Ardab Market - Maintenance, System Health & Cities Seeder
// ==============================================================================
// Seeds: OperationalCity, SystemComponent, MaintenanceTask, MaintenanceRecord
// Run: node prisma/seed.maintenance.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Seeding Maintenance, System Health & Operational Cities data...');

  // --------------------------------------------------------------------------
  // 1. Operational Cities
  // --------------------------------------------------------------------------
  const citiesData = [
    {
      name: 'Gondar',
      code: 'GDR',
      description: 'Historic city in the Amhara region, major logistics hub',
      latitude: 12.6030,
      longitude: 37.4521,
      timezone: 'Africa/Addis_Ababa',
      isActive: true,
    },
    {
      name: 'Bahir Dar',
      code: 'BJR',
      description: 'Capital of Amhara region, Lake Tana gateway',
      latitude: 11.5942,
      longitude: 37.3866,
      timezone: 'Africa/Addis_Ababa',
      isActive: true,
    },
    {
      name: 'Addis Ababa',
      code: 'ADD',
      description: 'Federal capital and primary distribution center',
      latitude: 9.0320,
      longitude: 38.7469,
      timezone: 'Africa/Addis_Ababa',
      isActive: true,
    },
  ];

  const cities = {};
  for (const city of citiesData) {
    const c = await prisma.operationalCity.upsert({
      where: { code: city.code },
      update: { name: city.name, description: city.description, isActive: city.isActive },
      create: city,
    });
    cities[city.code] = c;
    console.log(`  [City] ${c.name} (${c.code}) - ${c.id}`);
  }

  // --------------------------------------------------------------------------
  // 2. System Components
  // --------------------------------------------------------------------------
  const componentsData = [
    {
      name: 'Ardab Core API',
      code: 'CORE_API',
      category: 'CORE_API',
      description: 'Primary REST API gateway serving all platform clients',
      serverNode: 'node-eth-east-1',
      status: 'HEALTHY',
      latencyMs: 12,
      uptimePercentage: 99.98,
    },
    {
      name: 'PostgreSQL Database Cluster',
      code: 'DB_PRIMARY',
      category: 'DATABASE',
      description: 'Neon-hosted PostgreSQL cluster (primary + read replicas)',
      serverNode: 'neon-pg-east-1',
      status: 'HEALTHY',
      latencyMs: 8,
      uptimePercentage: 99.99,
    },
    {
      name: 'PostGIS Spatial Engine',
      code: 'GIS_ENGINE',
      category: 'GIS_ENGINE',
      description: 'Geospatial routing, polygon delivery zones and map tile engine',
      serverNode: 'node-eth-east-1',
      status: 'HEALTHY',
      latencyMs: 24,
      uptimePercentage: 99.95,
    },
    {
      name: 'Redis Cache Layer',
      code: 'REDIS_CACHE',
      category: 'CACHE',
      description: 'In-memory cache for sessions, rate limiting, and real-time state',
      serverNode: 'cache-eth-east-1',
      status: 'HEALTHY',
      latencyMs: 3,
      uptimePercentage: 99.97,
    },
    {
      name: 'OpenTelemetry Collector',
      code: 'OTEL_COLLECTOR',
      category: 'TELEMETRY',
      description: 'Distributed traces, metrics, and structured log aggregation',
      serverNode: 'node-eth-east-1',
      status: 'HEALTHY',
      latencyMs: 18,
      uptimePercentage: 99.91,
    },
    {
      name: 'Chapa Payments Gateway',
      code: 'PAYMENTS_GW',
      category: 'PAYMENTS',
      description: 'Ethiopian payment processor (Chapa) integration and settlement service',
      serverNode: 'node-eth-east-1',
      status: 'HEALTHY',
      latencyMs: 145,
      uptimePercentage: 99.88,
    },
  ];

  for (const comp of componentsData) {
    const c = await prisma.systemComponent.upsert({
      where: { code: comp.code },
      update: { status: comp.status, latencyMs: comp.latencyMs, lastCheckedAt: new Date() },
      create: {
        ...comp,
        lastCheckedAt: new Date(),
        isActive: true,
      },
    });
    console.log(`  [Component] ${c.name} (${c.code}) - ${c.status}`);
  }

  // --------------------------------------------------------------------------
  // 3. Maintenance Tasks
  // --------------------------------------------------------------------------
  const tasksData = [
    {
      name: 'Dead Row Vacuum & ANALYZE',
      category: 'DATABASE',
      description: 'Reclaims storage from dead rows, updates query planner statistics for optimal execution plans',
      frequency: 'Daily at 03:00 AM',
      status: 'SUCCESS',
      lastDurationMs: 847,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    },
    {
      name: 'GIS Spatial Index Rebuild',
      category: 'DATABASE',
      description: 'Rebuilds GIST/SP-GIST spatial indexes on delivery zones and route geometries',
      frequency: 'Weekly, Sunday at 01:00 AM',
      status: 'SUCCESS',
      lastDurationMs: 2341,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    },
    {
      name: 'Redis Session Cache Flush',
      category: 'CACHE',
      description: 'Evicts expired session keys, trims stale rate-limit counters and pub/sub queues',
      frequency: 'Daily at 04:00 AM',
      status: 'SUCCESS',
      lastDurationMs: 312,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    },
    {
      name: 'Delivery Media Orphan Cleanup',
      category: 'STORAGE',
      description: 'Removes unreferenced photo uploads (proof-of-delivery images) from object storage',
      frequency: 'Weekly, Monday at 02:00 AM',
      status: 'SUCCESS',
      lastDurationMs: 1204,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      name: 'JWT Blacklist Token Purge',
      category: 'SECURITY',
      description: 'Purges revoked JWT tokens past their expiry window from the auth blacklist store',
      frequency: 'Daily at 05:00 AM',
      status: 'SUCCESS',
      lastDurationMs: 189,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
    {
      name: 'Audit Log Archival',
      category: 'SECURITY',
      description: 'Archives security audit logs older than 90 days to cold storage with integrity checksums',
      frequency: 'Monthly, 1st at 00:00 AM',
      status: 'SUCCESS',
      lastDurationMs: 5892,
      lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
    },
  ];

  for (const task of tasksData) {
    // Check if a task with the same name already exists
    const existing = await prisma.maintenanceTask.findFirst({ where: { name: task.name } });
    if (existing) {
      await prisma.maintenanceTask.update({ where: { id: existing.id }, data: { status: task.status, lastRunAt: task.lastRunAt, lastDurationMs: task.lastDurationMs } });
      console.log(`  [Task] Updated: ${task.name}`);
    } else {
      const t = await prisma.maintenanceTask.create({ data: task });
      console.log(`  [Task] Created: ${t.name} (${t.category})`);
    }
  }

  // --------------------------------------------------------------------------
  // 4. Sample Maintenance Windows
  // --------------------------------------------------------------------------
  const now = new Date();
  const windowsData = [
    {
      title: 'PostgreSQL Spatial Index Rebuild & VACUUM',
      description: 'Full vacuum and spatial index rebuild across all delivery zone geometry tables. Expected service interruption: <5 min for write operations.',
      maintenanceType: 'SCHEDULED',
      status: 'SCHEDULED',
      priority: 'NORMAL',
      scope: 'DATABASE',
      affectedServices: ['PostgreSQL Database Cluster', 'PostGIS Spatial Engine'],
      announcedToUsers: true,
      cityId: null,
      scheduledStart: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 2), // 2 days + 2 hours
      scheduledEnd: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 3.5),
      createdByName: 'Eden Tilahun (Sub Admin)',
    },
    {
      title: 'Redis Cache Cluster Rolling Upgrade',
      description: 'Rolling upgrade of Redis nodes to v7.2 with zero-downtime failover. Cache hit ratio may drop momentarily during key migration.',
      maintenanceType: 'PREVENTIVE',
      status: 'COMPLETED',
      priority: 'HIGH',
      scope: 'INFRASTRUCTURE',
      affectedServices: ['Redis Cache Layer'],
      announcedToUsers: false,
      cityId: null,
      scheduledStart: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
      scheduledEnd: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 90),
      actualStart: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
      actualEnd: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 78),
      createdByName: 'Eden Tilahun (Sub Admin)',
    },
    {
      title: 'Gondar City Node Security Patch',
      description: 'Emergency OS-level security patch (CVE-2026-3821) on Gondar edge compute nodes. Requires 12-minute downtime for node reboot.',
      maintenanceType: 'EMERGENCY',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      scope: 'CITY',
      affectedServices: ['Ardab Core API', 'Redis Cache Layer'],
      announcedToUsers: true,
      cityId: cities['GDR']?.id || null,
      scheduledStart: new Date(now.getTime() - 1000 * 60 * 30),
      scheduledEnd: new Date(now.getTime() + 1000 * 60 * 30),
      actualStart: new Date(now.getTime() - 1000 * 60 * 28),
      createdByName: 'Eden Tilahun (Sub Admin)',
    },
  ];

  for (const win of windowsData) {
    // Check duplicates by title
    const existing = await prisma.maintenanceRecord.findFirst({ where: { title: win.title } });
    if (!existing) {
      const w = await prisma.maintenanceRecord.create({ data: win });
      console.log(`  [Window] Created: "${w.title}" (${w.status})`);
    } else {
      console.log(`  [Window] Already exists: "${win.title}"`);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Sample System Incidents
  // --------------------------------------------------------------------------
  const component = await prisma.systemComponent.findFirst({ where: { code: 'PAYMENTS_GW' } });

  const incidentsData = [
    {
      title: 'Chapa Payment Gateway Elevated Latency',
      description: 'Payment confirmation callbacks are experiencing 450ms+ delays. Chapa engineering investigating upstream provider congestion.',
      incidentType: 'PERFORMANCE_DEGRADATION',
      severity: 'MEDIUM',
      status: 'MONITORING',
      componentId: component?.id || null,
      cityId: null,
      detectedAt: new Date(now.getTime() - 1000 * 60 * 90),
      acknowledgedAt: new Date(now.getTime() - 1000 * 60 * 75),
    },
  ];

  for (const inc of incidentsData) {
    const existing = await prisma.systemIncident.findFirst({ where: { title: inc.title } });
    if (!existing) {
      const i = await prisma.systemIncident.create({ data: inc });
      console.log(`  [Incident] Created: "${i.title}" (${i.severity})`);
    } else {
      console.log(`  [Incident] Already exists: "${inc.title}"`);
    }
  }

  console.log('\n[SEED] Maintenance & System Health data seeded successfully.');
}

main()
  .catch((e) => {
    console.error('[SEED] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
