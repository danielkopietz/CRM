CREATE TYPE "DealStatus" AS ENUM (
  'NEU',
  'IN_KLAERUNG',
  'PO_OFFEN',
  'MUSTER_OFFEN',
  'PRODUKTION',
  'VERSCHIFFT',
  'VERZOLLUNG_VORBEREITEN',
  'BEIM_ZOLL',
  'FREIGEGEBEN',
  'ABGESCHLOSSEN',
  'PROBLEM_ROT'
);

CREATE TABLE "Deal" (
  "id" TEXT NOT NULL,
  "kunde" TEXT NOT NULL,
  "marke" TEXT,
  "artikel" TEXT NOT NULL,
  "stueckzahl" TEXT,
  "preis" TEXT,
  "dealnummer" TEXT,
  "liefertermin" TEXT,
  "po" TEXT,
  "drittlandswarePo" TEXT,
  "drittlaender" TEXT,
  "fotomusterPo" TEXT,
  "qsMusterPo" TEXT,
  "servicewarePo" TEXT,
  "etd" TIMESTAMP(3),
  "eta" TIMESTAMP(3),
  "crdZeitfenster" TEXT,
  "status" "DealStatus" NOT NULL DEFAULT 'NEU',
  "naechsterSchritt" TEXT,
  "bearbeitenBis" TIMESTAMP(3),
  "notizenKurz" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealNote" (
  "id" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DealNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Deal_kunde_idx" ON "Deal"("kunde");
CREATE INDEX "Deal_status_idx" ON "Deal"("status");
CREATE INDEX "Deal_eta_idx" ON "Deal"("eta");
CREATE INDEX "Deal_bearbeitenBis_idx" ON "Deal"("bearbeitenBis");
CREATE INDEX "DealNote_dealId_idx" ON "DealNote"("dealId");

ALTER TABLE "DealNote"
ADD CONSTRAINT "DealNote_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
