CREATE TABLE "DealReminder" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "systemKey" TEXT,
    "text" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "snoozedUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealReminder_dealId_idx" ON "DealReminder"("dealId");
CREATE INDEX "DealReminder_dueDate_idx" ON "DealReminder"("dueDate");
CREATE INDEX "DealReminder_completedAt_idx" ON "DealReminder"("completedAt");
CREATE INDEX "DealReminder_snoozedUntil_idx" ON "DealReminder"("snoozedUntil");
CREATE UNIQUE INDEX "DealReminder_systemKey_key" ON "DealReminder"("systemKey");

ALTER TABLE "DealReminder"
ADD CONSTRAINT "DealReminder_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
