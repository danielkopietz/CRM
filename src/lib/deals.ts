import type { Deal, DealStatus } from "@prisma/client";

export const statusLabels: Record<DealStatus, string> = {
  NEU: "Neu",
  IN_KLAERUNG: "In Klärung",
  PO_OFFEN: "PO offen",
  MUSTER_OFFEN: "Muster offen",
  PRODUKTION: "Produktion",
  VERSCHIFFT: "Verschifft",
  VERZOLLUNG_VORBEREITEN: "Verzollung vorbereiten",
  BEIM_ZOLL: "Beim Zoll",
  FREIGEGEBEN: "Freigegeben",
  ABGESCHLOSSEN: "Abgeschlossen",
  PROBLEM_ROT: "Problem / Rot",
};

export const dealStatuses = Object.keys(statusLabels) as DealStatus[];

export type TrafficLight = "green" | "yellow" | "red";

export function getTrafficLight(deal: Pick<Deal, "eta" | "bearbeitenBis" | "status">): TrafficLight {
  if (deal.status === "ABGESCHLOSSEN" || deal.status === "FREIGEGEBEN") {
    return "green";
  }

  if (deal.status === "PROBLEM_ROT") {
    return "red";
  }

  const today = startOfDay(new Date());

  if (deal.eta && startOfDay(deal.eta).getTime() <= today.getTime()) {
    return "red";
  }

  if (deal.bearbeitenBis) {
    const daysUntilWork = diffInDays(today, startOfDay(deal.bearbeitenBis));
    if (daysUntilWork <= 1 && daysUntilWork >= 0) {
      return "yellow";
    }
    if (daysUntilWork < 0) {
      return "red";
    }
  }

  return "green";
}

export function trafficLightLabel(light: TrafficLight) {
  if (light === "red") return "Rot";
  if (light === "yellow") return "Gelb";
  return "Grün";
}

export function formatDate(value?: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function inputDate(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffInDays(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
