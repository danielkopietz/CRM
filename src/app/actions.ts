"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthConfigured, getSessionUser } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  if (!isAuthConfigured()) return;
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");
}

function optionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalText(formData, key);
  return value ? new Date(`${value}T00:00:00`) : null;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function processDocument(formData: FormData, key: string) {
  return checkbox(formData, key) ? ("GEPRUEFT" as const) : ("FEHLT" as const);
}

function dealPayload(formData: FormData) {
  const kunde = optionalText(formData, "kunde");
  const artikel = optionalText(formData, "artikel");
  const etd = optionalDate(formData, "etd");
  const etaUnbekannt = checkbox(formData, "etaUnbekannt");
  const eta = etaUnbekannt ? null : optionalDate(formData, "eta");
  const bearbeitenBis = optionalDate(formData, "bearbeitenBis");

  if (!kunde || !artikel) {
    throw new Error("Kunde und Artikel sind Pflichtfelder.");
  }

  return {
    kunde,
    artikel,
    marke: optionalText(formData, "marke"),
    stueckzahl: optionalText(formData, "stueckzahl"),
    preis: optionalText(formData, "preis"),
    warenwert: optionalText(formData, "warenwert"),
    marge: optionalText(formData, "marge"),
    dealnummer: optionalText(formData, "dealnummer"),
    ausmusterung: optionalText(formData, "ausmusterung"),
    liefertermin: optionalText(formData, "liefertermin"),
    po: optionalText(formData, "po"),
    drittlandswarePo: optionalText(formData, "drittlandswarePo"),
    drittlandswareEtd: optionalDate(formData, "drittlandswareEtd"),
    drittlandswareEta: optionalDate(formData, "drittlandswareEta"),
    fotomusterPo: optionalText(formData, "fotomusterPo"),
    fotomusterEtd: optionalDate(formData, "fotomusterEtd"),
    fotomusterEta: optionalDate(formData, "fotomusterEta"),
    qsMusterPo: optionalText(formData, "qsMusterPo"),
    qsMusterEtd: optionalDate(formData, "qsMusterEtd"),
    qsMusterEta: optionalDate(formData, "qsMusterEta"),
    servicewarePo: optionalText(formData, "servicewarePo"),
    servicewareEtd: optionalDate(formData, "servicewareEtd"),
    servicewareEta: optionalDate(formData, "servicewareEta"),
    etd,
    eta,
    etaUnbekannt,
    crdZeitfenster: optionalText(formData, "crdZeitfenster"),
    naechsterSchritt: optionalText(formData, "naechsterSchritt"),
    bearbeitenBis,
    dokumentenDrafts: processDocument(formData, "dokumentenDrafts"),
    verschiffungspapiere: processDocument(formData, "verschiffungspapiere"),
    telexBl: processDocument(formData, "telexBl"),
    proformaDrittlandsware: processDocument(formData, "proformaDrittlandsware"),
    inspektion100: processDocument(formData, "inspektion100"),
    shipmentRelease: processDocument(formData, "shipmentRelease"),
    releaseDocument: processDocument(formData, "releaseDocument"),
    h1Document: processDocument(formData, "h1Document"),
    t1Document: processDocument(formData, "t1Document"),
    entladebericht: processDocument(formData, "entladebericht"),
    notizenKurz: optionalText(formData, "notizenKurz"),
  };
}

export async function createDeal(formData: FormData) {
  await requireUser();
  await prisma.deal.create({ data: dealPayload(formData) });
  revalidatePath("/");
}

export async function updateDeal(id: string, formData: FormData) {
  await requireUser();
  const user = await getSessionUser();
  const previous = await prisma.deal.findUnique({ where: { id } });
  if (!previous) return;

  const data = dealPayload(formData);
  await prisma.deal.update({
    where: { id },
    data,
  });

  const trackedFields = [
    ["stueckzahl", "Menge"],
    ["preis", "Preis"],
    ["po", "PO Mass Production"],
    ["etd", "ETD Mass Production"],
    ["eta", "ETA Mass Production"],
    ["drittlandswarePo", "PO Drittlandsware"],
    ["drittlandswareEtd", "ETD Drittlandsware"],
    ["drittlandswareEta", "ETA Drittlandsware"],
    ["fotomusterPo", "PO Fotomuster"],
    ["fotomusterEtd", "ETD Fotomuster"],
    ["fotomusterEta", "ETA Fotomuster"],
    ["qsMusterPo", "PO QS Muster"],
    ["qsMusterEtd", "ETD QS Muster"],
    ["qsMusterEta", "ETA QS Muster"],
    ["servicewarePo", "PO Serviceware"],
    ["servicewareEtd", "ETD Serviceware"],
    ["servicewareEta", "ETA Serviceware"],
  ] as const;

  const changes = trackedFields.flatMap(([field, label]) => {
    const oldValue = stringifyChangeValue(previous[field]);
    const newValue = stringifyChangeValue(data[field]);
    if (oldValue === newValue) return [];
    return {
      dealId: id,
      field: label,
      oldValue,
      newValue,
      changedBy: user?.email ?? null,
    };
  });

  if (changes.length > 0) {
    await prisma.dealChange.createMany({ data: changes });
  }

  revalidatePath("/");
}

export async function deleteDeal(id: string) {
  await requireUser();
  await prisma.deal.delete({ where: { id } });
  revalidatePath("/");
}

export async function addNote(dealId: string, formData: FormData) {
  await requireUser();
  const text = optionalText(formData, "note");
  if (!text) return;

  await prisma.dealNote.create({
    data: { dealId, text },
  });
  revalidatePath("/");
}

export async function setPoCompleted(dealId: string, poKey: string, formData: FormData) {
  await requireUser();
  const completed = checkbox(formData, "completed");

  const data = (() => {
    switch (poKey) {
      case "mass-production":
        return { poMassProductionDone: completed };
      case "drittlandsware":
        return { poDrittlandswareDone: completed };
      case "fotomuster":
        return { poFotomusterDone: completed };
      case "qs-muster":
        return { poQsMusterDone: completed };
      case "serviceware":
        return { poServicewareDone: completed };
      default:
        return null;
    }
  })();

  if (!data) return;
  await prisma.deal.update({ where: { id: dealId }, data });
  revalidatePath("/");
}

function stringifyChangeValue(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}
