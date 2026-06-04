/*
  Warnings:

  - You are about to drop the column `title` on the `fault_codes` table. All the data in the column will be lost.
  - You are about to drop the `manuals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `model_fault_codes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reference_tables` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technical_properties` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `modelId` to the `fault_codes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "manuals" DROP CONSTRAINT "manuals_boilerModelId_fkey";

-- DropForeignKey
ALTER TABLE "model_fault_codes" DROP CONSTRAINT "model_fault_codes_faultCodeId_fkey";

-- DropForeignKey
ALTER TABLE "model_fault_codes" DROP CONSTRAINT "model_fault_codes_modelId_fkey";

-- DropForeignKey
ALTER TABLE "reference_tables" DROP CONSTRAINT "reference_tables_boilerModelId_fkey";

-- DropForeignKey
ALTER TABLE "reference_tables" DROP CONSTRAINT "reference_tables_propertyId_fkey";

-- DropIndex
DROP INDEX "fault_codes_code_key";

-- AlterTable
ALTER TABLE "boiler_models" ADD COLUMN     "derivedGuidance" JSONB,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "searchTerms" JSONB;

-- AlterTable
ALTER TABLE "fault_codes" DROP COLUMN "title",
ADD COLUMN     "cautionsOrNotes" TEXT[],
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "manufacturerSteps" JSONB,
ADD COLUMN     "modelId" TEXT NOT NULL,
ADD COLUMN     "possibleCauses" TEXT[],
ADD COLUMN     "relatedComponents" TEXT[],
ADD COLUMN     "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "safetyLevel" TEXT,
ADD COLUMN     "searchTags" TEXT[],
ADD COLUMN     "sourceRefs" JSONB,
ADD COLUMN     "symptoms" TEXT[];

-- DropTable
DROP TABLE "manuals";

-- DropTable
DROP TABLE "model_fault_codes";

-- DropTable
DROP TABLE "reference_tables";

-- DropTable
DROP TABLE "technical_properties";

-- CreateTable
CREATE TABLE "technical_specs" (
    "id" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "appliesToModels" TEXT[],
    "category" TEXT,
    "sourceRefs" JSONB,
    "confidence" DOUBLE PRECISION,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "technical_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "meaning" TEXT,
    "sourceRefs" JSONB,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "status_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "sourceRefs" JSONB,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "diagnostic_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_warnings" (
    "id" TEXT NOT NULL,
    "warningType" TEXT,
    "description" TEXT NOT NULL,
    "sourceRefs" JSONB,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "safety_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_tasks" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "interval" TEXT,
    "steps" TEXT[],
    "sourceRefs" JSONB,
    "modelId" TEXT NOT NULL,

    CONSTRAINT "maintenance_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "technical_specs_modelId_idx" ON "technical_specs"("modelId");

-- CreateIndex
CREATE INDEX "status_codes_modelId_idx" ON "status_codes"("modelId");

-- CreateIndex
CREATE INDEX "diagnostic_codes_modelId_idx" ON "diagnostic_codes"("modelId");

-- CreateIndex
CREATE INDEX "safety_warnings_modelId_idx" ON "safety_warnings"("modelId");

-- CreateIndex
CREATE INDEX "maintenance_tasks_modelId_idx" ON "maintenance_tasks"("modelId");

-- CreateIndex
CREATE INDEX "fault_codes_modelId_idx" ON "fault_codes"("modelId");

-- CreateIndex
CREATE INDEX "fault_codes_code_idx" ON "fault_codes"("code");

-- AddForeignKey
ALTER TABLE "fault_codes" ADD CONSTRAINT "fault_codes_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_specs" ADD CONSTRAINT "technical_specs_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_codes" ADD CONSTRAINT "status_codes_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_codes" ADD CONSTRAINT "diagnostic_codes_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_warnings" ADD CONSTRAINT "safety_warnings_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "maintenance_tasks_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
