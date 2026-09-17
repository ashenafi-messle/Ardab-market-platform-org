-- ==============================================================================
-- Ardab Market - Migration: Add Maintenance, System Health & Operational Cities
-- ==============================================================================

-- 1. Create Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComponentCategory') THEN
    CREATE TYPE "ComponentCategory" AS ENUM (
      'CORE_API',
      'DATABASE',
      'GIS_ENGINE',
      'CACHE',
      'TELEMETRY',
      'PAYMENTS'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceHealthStatus') THEN
    CREATE TYPE "ServiceHealthStatus" AS ENUM (
      'HEALTHY',
      'DEGRADED',
      'MAINTENANCE',
      'OFFLINE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaintenanceType') THEN
    CREATE TYPE "MaintenanceType" AS ENUM (
      'SCHEDULED',
      'EMERGENCY',
      'PREVENTIVE',
      'CORRECTIVE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaintenanceStatus') THEN
    CREATE TYPE "MaintenanceStatus" AS ENUM (
      'PLANNED',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaintenancePriority') THEN
    CREATE TYPE "MaintenancePriority" AS ENUM (
      'LOW',
      'NORMAL',
      'HIGH',
      'CRITICAL'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaintenanceScope') THEN
    CREATE TYPE "MaintenanceScope" AS ENUM (
      'PLATFORM',
      'SERVICE',
      'CITY',
      'INFRASTRUCTURE',
      'DATABASE',
      'API'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaintenanceTaskCategory') THEN
    CREATE TYPE "MaintenanceTaskCategory" AS ENUM (
      'DATABASE',
      'CACHE',
      'STORAGE',
      'SECURITY'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskExecutionStatus') THEN
    CREATE TYPE "TaskExecutionStatus" AS ENUM (
      'SUCCESS',
      'RUNNING',
      'FAILED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IncidentSeverity') THEN
    CREATE TYPE "IncidentSeverity" AS ENUM (
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IncidentStatus') THEN
    CREATE TYPE "IncidentStatus" AS ENUM (
      'OPEN',
      'INVESTIGATING',
      'IDENTIFIED',
      'MONITORING',
      'RESOLVED',
      'CLOSED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EquipmentServiceStatus') THEN
    CREATE TYPE "EquipmentServiceStatus" AS ENUM (
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED'
    );
  END IF;
END $$;

-- 2. Create operational_cities table
CREATE TABLE IF NOT EXISTS "operational_cities" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "latitude" DECIMAL(10, 8),
  "longitude" DECIMAL(11, 8),
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Addis_Ababa',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operational_cities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "operational_cities_name_key" ON "operational_cities"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "operational_cities_code_key" ON "operational_cities"("code");
CREATE INDEX IF NOT EXISTS "operational_cities_code_idx" ON "operational_cities"("code");
CREATE INDEX IF NOT EXISTS "operational_cities_isActive_idx" ON "operational_cities"("isActive");

-- 3. Create system_components table
CREATE TABLE IF NOT EXISTS "system_components" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "category" "ComponentCategory" NOT NULL DEFAULT 'CORE_API',
  "description" TEXT,
  "serverNode" TEXT NOT NULL DEFAULT 'node-eth-east-1',
  "status" "ServiceHealthStatus" NOT NULL DEFAULT 'HEALTHY',
  "latencyMs" INTEGER NOT NULL DEFAULT 12,
  "uptimePercentage" DECIMAL(5, 2) NOT NULL DEFAULT 99.98,
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_components_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_components_name_key" ON "system_components"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "system_components_code_key" ON "system_components"("code");
CREATE INDEX IF NOT EXISTS "system_components_code_idx" ON "system_components"("code");
CREATE INDEX IF NOT EXISTS "system_components_category_idx" ON "system_components"("category");
CREATE INDEX IF NOT EXISTS "system_components_status_idx" ON "system_components"("status");
CREATE INDEX IF NOT EXISTS "system_components_isActive_idx" ON "system_components"("isActive");

-- 4. Create system_health_checks table
CREATE TABLE IF NOT EXISTS "system_health_checks" (
  "id" TEXT NOT NULL,
  "componentId" TEXT NOT NULL,
  "cityId" TEXT,
  "status" "ServiceHealthStatus" NOT NULL DEFAULT 'HEALTHY',
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "httpStatus" INTEGER,
  "message" TEXT,
  "metadata" JSONB,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_health_checks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "system_health_checks_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "system_components"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "system_health_checks_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "operational_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "system_health_checks_componentId_idx" ON "system_health_checks"("componentId");
CREATE INDEX IF NOT EXISTS "system_health_checks_cityId_idx" ON "system_health_checks"("cityId");
CREATE INDEX IF NOT EXISTS "system_health_checks_status_idx" ON "system_health_checks"("status");
CREATE INDEX IF NOT EXISTS "system_health_checks_checkedAt_idx" ON "system_health_checks"("checkedAt");

-- 5. Create maintenance_records table
CREATE TABLE IF NOT EXISTS "maintenance_records" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "maintenanceType" "MaintenanceType" NOT NULL DEFAULT 'SCHEDULED',
  "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
  "scope" "MaintenanceScope" NOT NULL DEFAULT 'SERVICE',
  "affectedServices" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "announcedToUsers" BOOLEAN NOT NULL DEFAULT true,
  "cityId" TEXT,
  "scheduledStart" TIMESTAMP(3) NOT NULL,
  "scheduledEnd" TIMESTAMP(3),
  "actualStart" TIMESTAMP(3),
  "actualEnd" TIMESTAMP(3),
  "createdById" TEXT,
  "createdByName" TEXT,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_records_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "operational_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "maintenance_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "maintenance_records_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_records_status_idx" ON "maintenance_records"("status");
CREATE INDEX IF NOT EXISTS "maintenance_records_maintenanceType_idx" ON "maintenance_records"("maintenanceType");
CREATE INDEX IF NOT EXISTS "maintenance_records_priority_idx" ON "maintenance_records"("priority");
CREATE INDEX IF NOT EXISTS "maintenance_records_cityId_idx" ON "maintenance_records"("cityId");
CREATE INDEX IF NOT EXISTS "maintenance_records_scheduledStart_idx" ON "maintenance_records"("scheduledStart");
CREATE INDEX IF NOT EXISTS "maintenance_records_scheduledEnd_idx" ON "maintenance_records"("scheduledEnd");

-- 6. Create maintenance_status_history table
CREATE TABLE IF NOT EXISTS "maintenance_status_history" (
  "id" TEXT NOT NULL,
  "maintenanceId" TEXT NOT NULL,
  "previousStatus" "MaintenanceStatus" NOT NULL,
  "newStatus" "MaintenanceStatus" NOT NULL,
  "changedById" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "maintenance_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_status_history_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "maintenance_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_status_history_maintenanceId_idx" ON "maintenance_status_history"("maintenanceId");
CREATE INDEX IF NOT EXISTS "maintenance_status_history_createdAt_idx" ON "maintenance_status_history"("createdAt");

-- 7. Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS "maintenance_tasks" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" "MaintenanceTaskCategory" NOT NULL DEFAULT 'DATABASE',
  "description" TEXT,
  "frequency" TEXT NOT NULL DEFAULT 'Daily at 03:00 AM',
  "status" "TaskExecutionStatus" NOT NULL DEFAULT 'SUCCESS',
  "lastRunAt" TIMESTAMP(3),
  "lastDurationMs" INTEGER NOT NULL DEFAULT 0,
  "lastTriggeredById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_tasks_lastTriggeredById_fkey" FOREIGN KEY ("lastTriggeredById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_tasks_category_idx" ON "maintenance_tasks"("category");
CREATE INDEX IF NOT EXISTS "maintenance_tasks_status_idx" ON "maintenance_tasks"("status");

-- 8. Create system_incidents table
CREATE TABLE IF NOT EXISTS "system_incidents" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "incidentType" TEXT NOT NULL DEFAULT 'SERVICE_DEGRADATION',
  "severity" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "componentId" TEXT,
  "cityId" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  "createdById" TEXT,
  "assignedToId" TEXT,
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "system_incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "system_incidents_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "system_components"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "system_incidents_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "operational_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "system_incidents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "system_incidents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "system_incidents_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "system_incidents_status_idx" ON "system_incidents"("status");
CREATE INDEX IF NOT EXISTS "system_incidents_severity_idx" ON "system_incidents"("severity");
CREATE INDEX IF NOT EXISTS "system_incidents_cityId_idx" ON "system_incidents"("cityId");
CREATE INDEX IF NOT EXISTS "system_incidents_componentId_idx" ON "system_incidents"("componentId");
CREATE INDEX IF NOT EXISTS "system_incidents_detectedAt_idx" ON "system_incidents"("detectedAt");

-- 9. Create fleet_equipment_logs table
CREATE TABLE IF NOT EXISTS "fleet_equipment_logs" (
  "id" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "vehicleReg" TEXT NOT NULL,
  "serviceType" TEXT NOT NULL,
  "cityId" TEXT,
  "cityName" TEXT NOT NULL DEFAULT 'Gondar',
  "workshopLocation" TEXT NOT NULL,
  "costEtb" DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "status" "EquipmentServiceStatus" NOT NULL DEFAULT 'SCHEDULED',
  "technicianNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fleet_equipment_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fleet_equipment_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "fleet_equipment_logs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "operational_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "fleet_equipment_logs_vehicleId_idx" ON "fleet_equipment_logs"("vehicleId");
CREATE INDEX IF NOT EXISTS "fleet_equipment_logs_cityId_idx" ON "fleet_equipment_logs"("cityId");
CREATE INDEX IF NOT EXISTS "fleet_equipment_logs_cityName_idx" ON "fleet_equipment_logs"("cityName");
CREATE INDEX IF NOT EXISTS "fleet_equipment_logs_status_idx" ON "fleet_equipment_logs"("status");
CREATE INDEX IF NOT EXISTS "fleet_equipment_logs_scheduledDate_idx" ON "fleet_equipment_logs"("scheduledDate");
