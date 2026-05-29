-- Add IngestionStatus enum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- Extend boiler_models
ALTER TABLE "boiler_models"
  ADD COLUMN "series" TEXT,
  ADD COLUMN "fuelType" TEXT,
  ADD COLUMN "productionStartYear" INTEGER,
  ADD COLUMN "productionEndYear" INTEGER;

CREATE INDEX "boiler_models_manufacturerId_idx" ON "boiler_models" ("manufacturerId");
CREATE INDEX "boiler_models_modelName_idx" ON "boiler_models" ("modelName");

-- Extend parts
ALTER TABLE "parts"
  ADD COLUMN "brand" TEXT,
  ADD COLUMN "unitPrice" NUMERIC(10,2),
  ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN "inventoryStatus" TEXT;

CREATE UNIQUE INDEX "parts_sku_key" ON "parts" ("sku");

-- Extend fault_codes
ALTER TABLE "fault_codes"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "severity" TEXT;

CREATE UNIQUE INDEX "fault_codes_code_key" ON "fault_codes" ("code");

-- Extend manuals
ALTER TABLE "manuals"
  ADD COLUMN "version" TEXT,
  ADD COLUMN "language" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "isValidated" BOOLEAN NOT NULL DEFAULT false;

-- Create join tables
CREATE TABLE "model_fault_codes" (
  "modelId" TEXT NOT NULL,
  "faultCodeId" TEXT NOT NULL,
  CONSTRAINT "model_fault_codes_pkey" PRIMARY KEY ("modelId", "faultCodeId"),
  CONSTRAINT "model_fault_codes_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "model_fault_codes_faultCodeId_fkey" FOREIGN KEY ("faultCodeId") REFERENCES "fault_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "model_fault_codes_faultCodeId_idx" ON "model_fault_codes" ("faultCodeId");

CREATE TABLE "model_parts" (
  "modelId" TEXT NOT NULL,
  "partId" TEXT NOT NULL,
  CONSTRAINT "model_parts_pkey" PRIMARY KEY ("modelId", "partId"),
  CONSTRAINT "model_parts_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "model_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "model_parts_partId_idx" ON "model_parts" ("partId");

-- Create ingestion runs
CREATE TABLE "library_ingestion_runs" (
  "id" TEXT NOT NULL,
  "status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
  "sourceVersion" TEXT,
  "acceptedCount" INTEGER NOT NULL DEFAULT 0,
  "rejectedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorSummary" JSONB,
  CONSTRAINT "library_ingestion_runs_pkey" PRIMARY KEY ("id")
);
