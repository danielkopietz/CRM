CREATE TYPE "DocumentStatus" AS ENUM ('FEHLT', 'ANGEFRAGT', 'ERHALTEN', 'GEPRUEFT', 'NICHT_NOETIG');
CREATE TYPE "WaitTarget" AS ENUM ('INTERN', 'LIEFERANT', 'SPEDITION', 'KUNDE', 'ZOLL', 'KEIN_BLOCKER');
CREATE TYPE "DealPriority" AS ENUM ('NIEDRIG', 'NORMAL', 'HOCH', 'KRITISCH');
CREATE TYPE "RiskStatus" AS ENUM ('NIEDRIG', 'MITTEL', 'HOCH');

ALTER TABLE "Deal"
ADD COLUMN "warenwert" TEXT,
ADD COLUMN "marge" TEXT,
ADD COLUMN "priority" "DealPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN "riskStatus" "RiskStatus" NOT NULL DEFAULT 'NIEDRIG',
ADD COLUMN "wartetAuf" "WaitTarget" NOT NULL DEFAULT 'KEIN_BLOCKER',
ADD COLUMN "lieferant" TEXT,
ADD COLUMN "lieferantKontakt" TEXT,
ADD COLUMN "spedition" TEXT,
ADD COLUMN "speditionKontakt" TEXT,
ADD COLUMN "incoterm" TEXT,
ADD COLUMN "pol" TEXT,
ADD COLUMN "pod" TEXT,
ADD COLUMN "containerNummer" TEXT,
ADD COLUMN "blNummer" TEXT,
ADD COLUMN "zahlungsstatus" TEXT,
ADD COLUMN "commercialInvoice" "DocumentStatus" NOT NULL DEFAULT 'FEHLT',
ADD COLUMN "packingList" "DocumentStatus" NOT NULL DEFAULT 'FEHLT',
ADD COLUMN "billOfLading" "DocumentStatus" NOT NULL DEFAULT 'FEHLT',
ADD COLUMN "ursprungsnachweis" "DocumentStatus" NOT NULL DEFAULT 'FEHLT',
ADD COLUMN "hsCode" "DocumentStatus" NOT NULL DEFAULT 'FEHLT',
ADD COLUMN "ceDokumente" "DocumentStatus" NOT NULL DEFAULT 'NICHT_NOETIG',
ADD COLUMN "pruefberichte" "DocumentStatus" NOT NULL DEFAULT 'NICHT_NOETIG';

CREATE TABLE "DealChange" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DealChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deal_priority_idx" ON "Deal"("priority");
CREATE INDEX "Deal_wartetAuf_idx" ON "Deal"("wartetAuf");
CREATE INDEX "DealChange_dealId_idx" ON "DealChange"("dealId");
CREATE INDEX "DealChange_createdAt_idx" ON "DealChange"("createdAt");

ALTER TABLE "DealChange"
ADD CONSTRAINT "DealChange_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
