-- Create expenses table for analytics
CREATE TABLE "expenses" (
  "id" TEXT NOT NULL,
  "amount" NUMERIC(10,2) NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "incurredAt" TIMESTAMP(3) NOT NULL,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "expenses_incurredAt_idx" ON "expenses" ("incurredAt");
CREATE INDEX "expenses_category_idx" ON "expenses" ("category");
