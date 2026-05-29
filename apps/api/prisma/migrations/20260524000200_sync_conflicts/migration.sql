-- Add conflict resolution enums
CREATE TYPE "ConflictResolutionPolicy" AS ENUM ('SERVER_WINS', 'CLIENT_WINS', 'MANUAL_REVIEW');
CREATE TYPE "ConflictStatus" AS ENUM ('OPEN', 'RESOLVED');

-- Create sync_conflicts table
CREATE TABLE "sync_conflicts" (
  "id" TEXT NOT NULL,
  "affectedEntity" TEXT NOT NULL,
  "affectedId" TEXT NOT NULL,
  "policy" "ConflictResolutionPolicy",
  "status" "ConflictStatus" NOT NULL DEFAULT 'OPEN',
  "details" JSONB,
  "resolutionNotes" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_conflicts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sync_conflicts_status_idx" ON "sync_conflicts" ("status");
CREATE INDEX "sync_conflicts_affectedEntity_affectedId_idx" ON "sync_conflicts" ("affectedEntity", "affectedId");
