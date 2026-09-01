"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthConfigured, getSessionUser } from "@/lib/auth0";
import { isHartmannCustomer } from "@/lib/customers";
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

function optionalCalendarDate(formData: FormData, key: string) {
  const value = optionalText(formData, key);
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
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
  const liefertermin = optionalText(formData, "liefertermin");
  const po = optionalText(formData, "po");
  const hartmann = isHartmannCustomer(kunde);
  const etd = optionalDate(formData, "etd");
  const etaUnbekannt = checkbox(formData, "etaUnbekannt");
  const eta = etaUnbekannt ? null : optionalDate(formData, "eta");
  const bearbeitenBis = hartmann ? null : optionalDate(formData, "bearbeitenBis");

  if (!kunde || !artikel) {
    throw new Error("Kunde und Artikel sind Pflichtfelder.");
  }
  if (hartmann && (!liefertermin || !po)) {
    throw new Error("Für Hartmann sind Liefertermin/KW und PO Pflichtfelder.");
  }

  return {
    kunde,
    artikel,
    marke: hartmann ? null : optionalText(formData, "marke"),
    stueckzahl: hartmann ? null : optionalText(formData, "stueckzahl"),
    preis: hartmann ? null : optionalText(formData, "preis"),
    warenwert: hartmann ? null : optionalText(formData, "warenwert"),
    marge: hartmann ? null : optionalText(formData, "marge"),
    dealnummer: hartmann ? null : optionalText(formData, "dealnummer"),
    ausmusterung: hartmann ? null : optionalText(formData, "ausmusterung"),
    liefertermin,
    po,
    drittlandswarePo: hartmann ? null : optionalText(formData, "drittlandswarePo"),
    drittlandswareEtd: hartmann ? null : optionalDate(formData, "drittlandswareEtd"),
    drittlandswareEta: hartmann ? null : optionalDate(formData, "drittlandswareEta"),
    fotomusterPo: hartmann ? null : optionalText(formData, "fotomusterPo"),
    fotomusterEtd: hartmann ? null : optionalDate(formData, "fotomusterEtd"),
    fotomusterEta: hartmann ? null : optionalDate(formData, "fotomusterEta"),
    qsMusterPo: hartmann ? null : optionalText(formData, "qsMusterPo"),
    qsMusterEtd: hartmann ? null : optionalDate(formData, "qsMusterEtd"),
    qsMusterEta: hartmann ? null : optionalDate(formData, "qsMusterEta"),
    servicewarePo: hartmann ? null : optionalText(formData, "servicewarePo"),
    servicewareEtd: hartmann ? null : optionalDate(formData, "servicewareEtd"),
    servicewareEta: hartmann ? null : optionalDate(formData, "servicewareEta"),
    etd,
    eta,
    etaUnbekannt,
    crdZeitfenster: hartmann ? null : optionalText(formData, "crdZeitfenster"),
    naechsterSchritt: optionalText(formData, "naechsterSchritt"),
    bearbeitenBis,
    dokumentenDrafts: hartmann ? "FEHLT" as const : processDocument(formData, "dokumentenDrafts"),
    verschiffungspapiere: hartmann ? "FEHLT" as const : processDocument(formData, "verschiffungspapiere"),
    telexBl: hartmann ? "FEHLT" as const : processDocument(formData, "telexBl"),
    proformaDrittlandsware: hartmann ? "FEHLT" as const : processDocument(formData, "proformaDrittlandsware"),
    inspektion100: hartmann ? "FEHLT" as const : processDocument(formData, "inspektion100"),
    shipmentRelease: hartmann ? "FEHLT" as const : processDocument(formData, "shipmentRelease"),
    releaseDocument: hartmann ? "FEHLT" as const : processDocument(formData, "releaseDocument"),
    h1Document: hartmann ? "FEHLT" as const : processDocument(formData, "h1Document"),
    t1Document: hartmann ? "FEHLT" as const : processDocument(formData, "t1Document"),
    entladebericht: hartmann ? "FEHLT" as const : processDocument(formData, "entladebericht"),
    notizenKurz: optionalText(formData, "notizenKurz"),
    ...(hartmann ? {
      poMassProductionDone: false,
      poDrittlandswareDone: false,
      poFotomusterDone: false,
      poQsMusterDone: false,
      poServicewareDone: false,
    } : {}),
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

export async function completeDeal(id: string) {
  await requireUser();
  await prisma.deal.updateMany({
    where: { id, status: { not: "ABGESCHLOSSEN" } },
    data: { status: "ABGESCHLOSSEN" },
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

export async function createDealReminder(dealId: string, formData: FormData) {
  await requireUser();
  const text = optionalText(formData, "text");
  const dueDate = optionalCalendarDate(formData, "dueDate");
  if (!text || !dueDate) return;

  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } });
  if (!deal) return;

  await prisma.dealReminder.create({
    data: { dealId: deal.id, text, dueDate },
  });
  revalidatePath("/");
}

export async function snoozeDealReminder(reminderId: string) {
  await requireUser();
  await prisma.dealReminder.updateMany({
    where: { id: reminderId, completedAt: null },
    data: { snoozedUntil: new Date(Date.now() + 15 * 60 * 1000) },
  });
  revalidatePath("/");
}

export async function completeDealReminder(reminderId: string) {
  await requireUser();
  await prisma.dealReminder.updateMany({
    where: { id: reminderId, completedAt: null },
    data: { completedAt: new Date(), snoozedUntil: null },
  });
  revalidatePath("/");
}

export async function snoozePoReminder(reminderKey: string, dealId: string, dueDate: string) {
  await requireUser();
  const date = parseBoundCalendarDate(dueDate);
  if (!date || !reminderKey.startsWith(`${dealId}-`)) return;
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } });
  if (!deal) return;

  await prisma.dealReminder.upsert({
    where: { systemKey: reminderKey },
    update: { snoozedUntil: new Date(Date.now() + 15 * 60 * 1000), completedAt: null },
    create: {
      dealId: deal.id,
      systemKey: reminderKey,
      text: "Automatische PO-Erinnerung",
      dueDate: date,
      snoozedUntil: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  revalidatePath("/");
}

export async function completePoReminder(reminderKey: string, dealId: string, dueDate: string) {
  await requireUser();
  const date = parseBoundCalendarDate(dueDate);
  if (!date || !reminderKey.startsWith(`${dealId}-`)) return;
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true } });
  if (!deal) return;

  await prisma.dealReminder.upsert({
    where: { systemKey: reminderKey },
    update: { completedAt: new Date(), snoozedUntil: null },
    create: {
      dealId: deal.id,
      systemKey: reminderKey,
      text: "Automatische PO-Erinnerung",
      dueDate: date,
      completedAt: new Date(),
    },
  });
  revalidatePath("/");
}

function parseBoundCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function stringifyChangeValue(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}
