"use server";

import { DealStatus } from "@prisma/client";
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
    status: String(formData.get("status") ?? "NEU") as DealStatus,
    naechsterSchritt: optionalText(formData, "naechsterSchritt"),
    bearbeitenBis: optionalDate(formData, "bearbeitenBis"),
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
  await prisma.deal.update({
    where: { id },
    data: dealPayload(formData),
  });
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
