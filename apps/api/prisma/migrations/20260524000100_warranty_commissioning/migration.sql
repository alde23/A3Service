-- Add WarrantyStatus enum
CREATE TYPE "WarrantyStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'VOID');

-- Extend warranties
ALTER TABLE "warranties"
  ADD COLUMN "jobId" TEXT,
  ADD COLUMN "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "durationMonths" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "status" "WarrantyStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "warranties_jobId_idx" ON "warranties" ("jobId");
CREATE INDEX "warranties_status_idx" ON "warranties" ("status");
CREATE INDEX "warranties_expiresAt_idx" ON "warranties" ("expiresAt");

ALTER TABLE "warranties"
  ADD CONSTRAINT "warranties_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create technical_properties
CREATE TABLE "technical_properties" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "unit" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technical_properties_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "technical_properties_code_key" ON "technical_properties" ("code");

-- Create reference_tables
CREATE TABLE "reference_tables" (
  "id" TEXT NOT NULL,
  "boilerModelId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "minValue" NUMERIC(10,2),
  "maxValue" NUMERIC(10,2),
  "required" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reference_tables_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reference_tables_boilerModelId_fkey" FOREIGN KEY ("boilerModelId") REFERENCES "boiler_models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reference_tables_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "technical_properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "reference_tables_boilerModelId_propertyId_key" ON "reference_tables" ("boilerModelId", "propertyId");
CREATE INDEX "reference_tables_boilerModelId_idx" ON "reference_tables" ("boilerModelId");
CREATE INDEX "reference_tables_propertyId_idx" ON "reference_tables" ("propertyId");
