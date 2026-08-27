import type {
  Deal,
  DealPriority,
  DealStatus,
  DocumentStatus,
  RiskStatus,
  WaitTarget,
} from "@prisma/client";

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

export const priorityLabels: Record<DealPriority, string> = {
  NIEDRIG: "Niedrig",
  NORMAL: "Normal",
  HOCH: "Hoch",
  KRITISCH: "Kritisch",
};

export const riskLabels: Record<RiskStatus, string> = {
  NIEDRIG: "Niedrig",
  MITTEL: "Mittel",
  HOCH: "Hoch",
};

export const waitTargetLabels: Record<WaitTarget, string> = {
  INTERN: "Intern",
  LIEFERANT: "Lieferant",
  SPEDITION: "Spedition",
  KUNDE: "Kunde",
  ZOLL: "Zoll",
  KEIN_BLOCKER: "Kein Blocker",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  FEHLT: "Fehlt",
  ANGEFRAGT: "Angefragt",
  ERHALTEN: "Erhalten",
  GEPRUEFT: "Geprüft",
  NICHT_NOETIG: "Nicht nötig",
};

export const priorities = Object.keys(priorityLabels) as DealPriority[];
export const riskStatuses = Object.keys(riskLabels) as RiskStatus[];
export const waitTargets = Object.keys(waitTargetLabels) as WaitTarget[];
export const documentStatuses = Object.keys(documentStatusLabels) as DocumentStatus[];

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

export function getRiskLight(
  deal: Pick<
    Deal,
    | "riskStatus"
    | "commercialInvoice"
    | "packingList"
    | "billOfLading"
    | "ursprungsnachweis"
    | "hsCode"
    | "ceDokumente"
    | "pruefberichte"
  >,
): TrafficLight {
  if (deal.riskStatus === "HOCH") return "red";
  if (deal.riskStatus === "MITTEL") return "yellow";

  const docs = [
    deal.commercialInvoice,
    deal.packingList,
    deal.billOfLading,
    deal.ursprungsnachweis,
    deal.hsCode,
    deal.ceDokumente,
    deal.pruefberichte,
  ];

  if (docs.includes("FEHLT")) return "yellow";
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

export function daysUntil(value?: Date | null) {
  if (!value) return null;
  return diffInDays(startOfDay(new Date()), startOfDay(value));
}

export function isWithinDays(value: Date | null | undefined, days: number) {
  const diff = daysUntil(value);
  return diff !== null && diff >= 0 && diff <= days;
}

export function monthKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffInDays(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
