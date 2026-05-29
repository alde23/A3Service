-- Add ServiceLogStatus enum
CREATE TYPE "ServiceLogStatus" AS ENUM ('DRAFT', 'SYNCED');

-- Extend service_logs
ALTER TABLE "service_logs"
  ADD COLUMN "status" "ServiceLogStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "syncedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Extend labor_entries
ALTER TABLE "labor_entries"
  ADD COLUMN "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "hourlyRate" NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create consumed_parts
CREATE TABLE "consumed_parts" (
  "id" TEXT NOT NULL,
  "serviceLogId" TEXT NOT NULL,
  "partId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" NUMERIC(10,2),
  "notes" TEXT,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consumed_parts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "consumed_parts_serviceLogId_fkey" FOREIGN KEY ("serviceLogId") REFERENCES "service_logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "consumed_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "consumed_parts_serviceLogId_idx" ON "consumed_parts" ("serviceLogId");
CREATE INDEX "consumed_parts_partId_idx" ON "consumed_parts" ("partId");

-- Create service_log_syncs
CREATE TABLE "service_log_syncs" (
  "id" TEXT NOT NULL,
  "serviceLogId" TEXT NOT NULL,
  "jobId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "result" "SyncResult" NOT NULL DEFAULT 'SUCCESS',
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_log_syncs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_log_syncs_serviceLogId_fkey" FOREIGN KEY ("serviceLogId") REFERENCES "service_logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "service_log_syncs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "service_log_syncs_idempotencyKey_key" ON "service_log_syncs" ("idempotencyKey");
CREATE INDEX "service_log_syncs_serviceLogId_idx" ON "service_log_syncs" ("serviceLogId");
CREATE INDEX "service_log_syncs_jobId_idx" ON "service_log_syncs" ("jobId");
