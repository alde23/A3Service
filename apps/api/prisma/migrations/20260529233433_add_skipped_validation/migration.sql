-- DropForeignKey
ALTER TABLE "consumed_parts" DROP CONSTRAINT "consumed_parts_partId_fkey";

-- DropForeignKey
ALTER TABLE "consumed_parts" DROP CONSTRAINT "consumed_parts_serviceLogId_fkey";

-- DropForeignKey
ALTER TABLE "model_fault_codes" DROP CONSTRAINT "model_fault_codes_faultCodeId_fkey";

-- DropForeignKey
ALTER TABLE "model_fault_codes" DROP CONSTRAINT "model_fault_codes_modelId_fkey";

-- DropForeignKey
ALTER TABLE "model_parts" DROP CONSTRAINT "model_parts_modelId_fkey";

-- DropForeignKey
ALTER TABLE "model_parts" DROP CONSTRAINT "model_parts_partId_fkey";

-- DropForeignKey
ALTER TABLE "reference_tables" DROP CONSTRAINT "reference_tables_boilerModelId_fkey";

-- DropForeignKey
ALTER TABLE "reference_tables" DROP CONSTRAINT "reference_tables_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "service_log_syncs" DROP CONSTRAINT "service_log_syncs_serviceLogId_fkey";

-- AlterTable
ALTER TABLE "consumed_parts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "expenses" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "labor_entries" ALTER COLUMN "hours" DROP DEFAULT,
ALTER COLUMN "hourlyRate" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "parts" ALTER COLUMN "aliases" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reference_tables" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "service_logs" ADD COLUMN     "skippedValidation" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sync_conflicts" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "technical_properties" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "warranties" ADD COLUMN     "skippedValidation" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "consumed_parts" ADD CONSTRAINT "consumed_parts_serviceLogId_fkey" FOREIGN KEY ("serviceLogId") REFERENCES "service_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumed_parts" ADD CONSTRAINT "consumed_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_tables" ADD CONSTRAINT "reference_tables_boilerModelId_fkey" FOREIGN KEY ("boilerModelId") REFERENCES "boiler_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_tables" ADD CONSTRAINT "reference_tables_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "technical_properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_fault_codes" ADD CONSTRAINT "model_fault_codes_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_fault_codes" ADD CONSTRAINT "model_fault_codes_faultCodeId_fkey" FOREIGN KEY ("faultCodeId") REFERENCES "fault_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_parts" ADD CONSTRAINT "model_parts_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "boiler_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_parts" ADD CONSTRAINT "model_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_log_syncs" ADD CONSTRAINT "service_log_syncs_serviceLogId_fkey" FOREIGN KEY ("serviceLogId") REFERENCES "service_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "sync_logs_entity_action_idempotency_key" RENAME TO "sync_logs_affectedEntity_affectedId_action_idempotencyKey_key";
