"use server";

import { DealPriority, DealStatus, DocumentStatus, RiskStatus, WaitTarget } from "@prisma/client";
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

function selectValue<T extends string>(formData: FormData, key: string, fallback: T) {
  return String(formData.get(key) ?? fallback) as T;
}

function dealPayload(formData: FormData) {
  const kunde = optionalText(formData, "kunde");
  const artikel = optionalText(formData, "artikel");

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
    liefertermin: optionalText(formData, "liefertermin"),
    po: optionalText(formData, "po"),
    drittlandswarePo: optionalText(formData, "drittlandswarePo"),
    drittlaender: optionalText(formData, "drittlaender"),
    fotomusterPo: optionalText(formData, "fotomusterPo"),
    qsMusterPo: optionalText(formData, "qsMusterPo"),
    servicewarePo: optionalText(formData, "servicewarePo"),
    etd: optionalDate(formData, "etd"),
    eta: optionalDate(formData, "eta"),
    crdZeitfenster: optionalText(formData, "crdZeitfenster"),
    status: selectValue<DealStatus>(formData, "status", "NEU"),
    priority: selectValue<DealPriority>(formData, "priority", "NORMAL"),
    riskStatus: selectValue<RiskStatus>(formData, "riskStatus", "NIEDRIG"),
    wartetAuf: selectValue<WaitTarget>(formData, "wartetAuf", "KEIN_BLOCKER"),
    naechsterSchritt: optionalText(formData, "naechsterSchritt"),
    bearbeitenBis: optionalDate(formData, "bearbeitenBis"),
    lieferant: optionalText(formData, "lieferant"),
    lieferantKontakt: optionalText(formData, "lieferantKontakt"),
    spedition: optionalText(formData, "spedition"),
    speditionKontakt: optionalText(formData, "speditionKontakt"),
    incoterm: optionalText(formData, "incoterm"),
    pol: optionalText(formData, "pol"),
    pod: optionalText(formData, "pod"),
    containerNummer: optionalText(formData, "containerNummer"),
    blNummer: optionalText(formData, "blNummer"),
    zahlungsstatus: optionalText(formData, "zahlungsstatus"),
    commercialInvoice: selectValue<DocumentStatus>(formData, "commercialInvoice", "FEHLT"),
    packingList: selectValue<DocumentStatus>(formData, "packingList", "FEHLT"),
    billOfLading: selectValue<DocumentStatus>(formData, "billOfLading", "FEHLT"),
    ursprungsnachweis: selectValue<DocumentStatus>(formData, "ursprungsnachweis", "FEHLT"),
    hsCode: selectValue<DocumentStatus>(formData, "hsCode", "FEHLT"),
    ceDokumente: selectValue<DocumentStatus>(formData, "ceDokumente", "NICHT_NOETIG"),
    pruefberichte: selectValue<DocumentStatus>(formData, "pruefberichte", "NICHT_NOETIG"),
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
    ["etd", "ETD"],
    ["eta", "ETA"],
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

function stringifyChangeValue(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}
