-- Add idempotencyKey to sync_logs and backfill existing rows
ALTER TABLE "sync_logs" ADD COLUMN "idempotencyKey" TEXT;

UPDATE "sync_logs"
SET "idempotencyKey" = COALESCE("conflictDetails"->>'idempotencyKey', id)
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "sync_logs" ALTER COLUMN "idempotencyKey" SET NOT NULL;

CREATE UNIQUE INDEX "sync_logs_entity_action_idempotency_key"
ON "sync_logs" ("affectedEntity", "affectedId", "action", "idempotencyKey");
