import { Deal, DealChange, DealNote } from "@prisma/client";
import {
  AlertTriangle,
  CalendarClock,
  CirclePlus,
  ClipboardList,
  FileCheck2,
  Hourglass,
  LogIn,
  LogOut,
  PackageCheck,
  Pencil,
  Search,
  Ship,
  StickyNote,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { addNote, createDeal, deleteDeal, updateDeal } from "@/app/actions";
import {
  daysUntil,
  dealStatuses,
  documentStatuses,
  documentStatusLabels,
  formatDate,
  getRiskLight,
  getTrafficLight,
  inputDate,
  isWithinDays,
  priorityLabels,
  priorities,
  riskLabels,
  riskStatuses,
  statusLabels,
  trafficLightLabel,
  waitTargetLabels,
  waitTargets,
} from "@/lib/deals";
import { getSessionUser, isAuthConfigured } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DealWithRelations = Deal & {
  notes: DealNote[];
  changes: DealChange[];
};

type Search = {
  tab?: string;
  q?: string;
  kunde?: string;
  status?: string;
  ampel?: string;
  month?: string;
};

async function loadDeals(): Promise<DealWithRelations[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    return await prisma.deal.findMany({
      include: {
        notes: { orderBy: { createdAt: "desc" }, take: 4 },
        changes: { orderBy: { createdAt: "desc" }, take: 6 },
      },
      orderBy: [{ eta: "asc" }, { bearbeitenBis: "asc" }, { updatedAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = normalizeSearchParams(await searchParams);
  const tab = params.tab ?? "uebersicht";
  const authConfigured = isAuthConfigured();
  const user = await getSessionUser();

  if (authConfigured && !user) {
    return <LoginScreen />;
  }

  const deals = await loadDeals();
  const filteredDeals = filterDeals(deals, params);
  const criticalDeals = sortByUrgency(deals).filter((deal) => {
    const light = getTrafficLight(deal);
    return light === "red" || light === "yellow" || deal.wartetAuf !== "KEIN_BLOCKER";
  });

  const redDeals = deals.filter((deal) => getTrafficLight(deal) === "red");
  const yellowDeals = deals.filter((deal) => getTrafficLight(deal) === "yellow");
  const etaWeek = deals.filter((deal) => isWithinDays(deal.eta, 7));
  const etdWeek = deals.filter((deal) => isWithinDays(deal.etd, 7));
  const dueToday = deals.filter((deal) => daysUntil(deal.bearbeitenBis) === 0);
  const blocked = deals.filter((deal) => deal.wartetAuf !== "KEIN_BLOCKER");
  const docGaps = deals.filter((deal) => getRiskLight(deal) !== "green");

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17202c]">
      <header className="border-b border-[#dde4ec] bg-white/95">
        <div className="mx-auto max-w-[1560px] px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#637389]">Verzollung CRM · Einkauf 2026</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#17202c]">
                China Deals, Fristen und Risiko-Cockpit
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <details className="relative">
                <summary className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md bg-[#17202c] px-4 text-sm font-semibold text-white">
                  <CirclePlus size={17} /> Neuer Deal
                </summary>
                <div className="absolute right-0 z-20 mt-2 max-h-[80vh] w-[min(760px,calc(100vw-2rem))] overflow-auto rounded-md border border-[#d6e0ea] bg-white p-4 shadow-xl">
                  <SectionTitle icon={<CirclePlus size={18} />} title="Neuen Deal erfassen" />
                  <DealForm action={createDeal} submitLabel="Deal anlegen" />
                </div>
              </details>
              <div className="rounded-md border border-[#dfe5ec] bg-[#f7f9fb] px-3 py-2 text-sm text-[#425166]">
                {user?.email ?? "Lokaler Setup-Modus"}
              </div>
              {authConfigured ? (
                <a
                  href="/auth/logout"
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-[#dfe5ec] bg-white px-3 text-sm font-medium text-[#17202c]"
                >
                  <LogOut size={16} /> Logout
                </a>
              ) : null}
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            <TabLink active={tab === "uebersicht"} href="/?tab=uebersicht" label="Übersicht" />
            <TabLink active={tab === "kalender"} href="/?tab=kalender" label="Kalender" />
            <TabLink active={tab === "deals"} href="/?tab=deals" label="Deals" />
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] space-y-5 px-5 py-5">
        {!process.env.DATABASE_URL ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Keine Datenbank verbunden. In Coolify muss
            <code className="mx-1 rounded bg-white px-1">DATABASE_URL</code>
            gesetzt werden.
          </div>
        ) : null}

        {tab === "kalender" ? (
          <CalendarView deals={filteredDeals} params={params} />
        ) : tab === "deals" ? (
          <DealsView deals={filteredDeals} allDeals={deals} params={params} />
        ) : (
          <DashboardView
            allDeals={deals}
            criticalDeals={criticalDeals}
            redDeals={redDeals}
            yellowDeals={yellowDeals}
            etaWeek={etaWeek}
            etdWeek={etdWeek}
            dueToday={dueToday}
            blocked={blocked}
            docGaps={docGaps}
            params={params}
          />
        )}
      </div>
    </main>
  );
}

function LoginScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f8] px-5">
      <section className="w-full max-w-md rounded-md border border-[#dfe4ea] bg-white p-6">
        <p className="text-sm font-medium text-[#637389]">Verzollung CRM</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#17202c]">Bitte anmelden</h1>
        <p className="mt-3 text-sm leading-6 text-[#637389]">
          Nach dem Login siehst du alle Deals, Fristen, Dokumentenlücken und Notizen.
        </p>
        <a
          href="/auth/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#17202c] px-4 text-sm font-medium text-white"
        >
          <LogIn size={17} /> Mit E-Mail und Passwort einloggen
        </a>
      </section>
    </main>
  );
}

function DashboardView({
  allDeals,
  criticalDeals,
  redDeals,
  yellowDeals,
  etaWeek,
  etdWeek,
  dueToday,
  blocked,
  docGaps,
  params,
}: {
  allDeals: DealWithRelations[];
  criticalDeals: DealWithRelations[];
  redDeals: DealWithRelations[];
  yellowDeals: DealWithRelations[];
  etaWeek: DealWithRelations[];
  etdWeek: DealWithRelations[];
  dueToday: DealWithRelations[];
  blocked: DealWithRelations[];
  docGaps: DealWithRelations[];
  params: Search;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Rot / überfällig" value={redDeals.length} tone="red" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Heute fällig" value={dueToday.length} tone="yellow" icon={<CalendarClock size={18} />} />
        <MetricCard label="Gelb" value={yellowDeals.length} tone="yellow" icon={<Hourglass size={18} />} />
        <MetricCard label="ETA 7 Tage" value={etaWeek.length} icon={<PackageCheck size={18} />} />
        <MetricCard label="ETD 7 Tage" value={etdWeek.length} icon={<Ship size={18} />} />
        <MetricCard label="Dokumentenlücken" value={docGaps.length} tone="red" icon={<FileCheck2 size={18} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-md border border-[#dfe5ec] bg-white">
          <PanelHeader
            icon={<TrendingUp size={18} />}
            title="Heute handeln"
            detail="Kritische Deals, Blocker und Fristen zuerst"
          />
          <CompactDealTable deals={criticalDeals.slice(0, 10)} empty="Aktuell brennt nichts." />
        </section>

        <section className="rounded-md border border-[#dfe5ec] bg-white">
          <PanelHeader icon={<Hourglass size={18} />} title="Wartet auf" detail="Nachfassliste" />
          <div className="divide-y divide-[#edf1f5]">
            {blocked.length === 0 ? (
              <p className="p-4 text-sm text-[#637389]">Keine Blocker eingetragen.</p>
            ) : (
              blocked.slice(0, 8).map((deal) => (
                <div key={deal.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#17202c]">{deal.kunde} · {deal.artikel}</p>
                    <span className="rounded-md bg-[#fff5df] px-2 py-1 text-xs font-semibold text-[#946100]">
                      {waitTargetLabels[deal.wartetAuf]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#637389]">{deal.naechsterSchritt || "Kein nächster Schritt gepflegt."}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <DealsView deals={filterDeals(allDeals, params)} allDeals={allDeals} params={params} embedded />
    </>
  );
}

function DealsView({
  deals,
  allDeals,
  params,
  embedded = false,
}: {
  deals: DealWithRelations[];
  allDeals: DealWithRelations[];
  params: Search;
  embedded?: boolean;
}) {
  return (
    <section className="rounded-md border border-[#dfe5ec] bg-white">
      <PanelHeader icon={<ClipboardList size={18} />} title="Deal-Übersicht" detail={`${deals.length} von ${allDeals.length} Deals`} />
      <Filters params={params} />
      <CompactDealTable deals={sortByUrgency(deals)} empty="Keine Deals für diese Filter." showDetails={!embedded} />
    </section>
  );
}

function CalendarView({ deals, params }: { deals: DealWithRelations[]; params: Search }) {
  const month = parseMonth(params.month);
  const days = buildCalendarDays(month);
  const events = buildEvents(deals);

  return (
    <section className="rounded-md border border-[#dfe5ec] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#dfe5ec] p-4 lg:flex-row lg:items-center lg:justify-between">
        <PanelTitle icon={<CalendarClock size={18} />} title="Kalender" detail="ETD, ETA und interne Bearbeitungsfristen" />
        <div className="flex items-center gap-2">
          <Link href={`/?tab=kalender&month=${shiftMonth(month, -1)}`} className="rounded-md border border-[#dfe5ec] px-3 py-2 text-sm font-medium">
            Zurück
          </Link>
          <div className="min-w-40 rounded-md bg-[#f4f6f8] px-3 py-2 text-center text-sm font-semibold">
            {month.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </div>
          <Link href={`/?tab=kalender&month=${shiftMonth(month, 1)}`} className="rounded-md border border-[#dfe5ec] px-3 py-2 text-sm font-medium">
            Weiter
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-[#dfe5ec] bg-[#f8fafc] text-xs font-semibold uppercase text-[#637389]">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <div key={day} className="border-r border-[#edf1f5] px-3 py-2 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = events.filter((event) => event.key === key);
          const outside = day.getMonth() !== month.getMonth();
          return (
            <div key={key} className={clsx("min-h-36 border-b border-r border-[#edf1f5] p-2 last:border-r-0", outside && "bg-[#fafbfc] text-[#9aa6b5]")}>
              <div className="text-sm font-semibold">{day.getDate()}</div>
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 4).map((event) => (
                  <div key={`${event.type}-${event.deal.id}`} className={clsx("rounded px-2 py-1 text-xs font-medium", calendarEventClass(event.light))}>
                    <span className="font-semibold">{event.type}</span> · {event.deal.kunde} · {event.deal.artikel}
                  </div>
                ))}
                {dayEvents.length > 4 ? <p className="text-xs text-[#637389]">+{dayEvents.length - 4} weitere</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Filters({ params }: { params: Search }) {
  return (
    <form className="grid gap-3 border-b border-[#dfe5ec] p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/">
      <input type="hidden" name="tab" value="deals" />
      <label className="flex h-10 items-center gap-2 rounded-md border border-[#dfe5ec] bg-[#f8fafc] px-3">
        <Search size={16} className="text-[#637389]" />
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Suche Kunde, Artikel, PO, Lieferant..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <input name="kunde" defaultValue={params.kunde ?? ""} placeholder="Kunde" className="h-10 rounded-md border border-[#dfe5ec] px-3 text-sm outline-none" />
      <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-[#dfe5ec] px-3 text-sm outline-none">
        <option value="">Alle Status</option>
        {dealStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </select>
      <select name="ampel" defaultValue={params.ampel ?? ""} className="h-10 rounded-md border border-[#dfe5ec] px-3 text-sm outline-none">
        <option value="">Alle Ampeln</option>
        <option value="red">Rot</option>
        <option value="yellow">Gelb</option>
        <option value="green">Grün</option>
      </select>
      <button className="h-10 rounded-md bg-[#17202c] px-4 text-sm font-semibold text-white" type="submit">
        Filtern
      </button>
    </form>
  );
}

function CompactDealTable({
  deals,
  empty,
  showDetails = true,
}: {
  deals: DealWithRelations[];
  empty: string;
  showDetails?: boolean;
}) {
  if (deals.length === 0) {
    return <p className="p-5 text-sm text-[#637389]">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-xs font-semibold uppercase text-[#637389]">
          <tr>
            <th className="px-4 py-3">Ampel</th>
            <th className="px-4 py-3">Deal</th>
            <th className="px-4 py-3">Menge / Wert</th>
            <th className="px-4 py-3">ETD</th>
            <th className="px-4 py-3">ETA</th>
            <th className="px-4 py-3">Bearbeiten</th>
            <th className="px-4 py-3">Wartet auf</th>
            <th className="px-4 py-3">Risiko</th>
            <th className="px-4 py-3">Nächster Schritt</th>
            <th className="px-4 py-3">Aktion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1f5]">
          {deals.map((deal) => {
            const light = getTrafficLight(deal);
            const risk = getRiskLight(deal);
            return (
              <tr key={deal.id} className="align-top hover:bg-[#fafbfc]">
                <td className="px-4 py-4">
                  <span className={clsx("inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold", badgeClass(light))}>
                    <span className={clsx("h-2 w-2 rounded-full", lightDot(light))} />
                    {trafficLightLabel(light)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-[#17202c]">{deal.kunde} · {deal.artikel}</p>
                  <p className="mt-1 text-xs text-[#637389]">
                    {deal.marke || "-"} · {statusLabels[deal.status]} · {priorityLabels[deal.priority]}
                  </p>
                  <p className="mt-1 text-xs text-[#637389]">PO {deal.po || "-"} · Deal {deal.dealnummer || "-"}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{deal.stueckzahl || "-"}</p>
                  <p className="text-xs text-[#637389]">{deal.warenwert || deal.preis || "-"}</p>
                </td>
                <td className="px-4 py-4">{formatDate(deal.etd) || "-"}</td>
                <td className="px-4 py-4">
                  <p>{formatDate(deal.eta) || "-"}</p>
                  <p className="text-xs text-[#637389]">{relativeDate(deal.eta)}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{formatDate(deal.bearbeitenBis) || "-"}</p>
                  <p className="text-xs text-[#637389]">{relativeDate(deal.bearbeitenBis)}</p>
                </td>
                <td className="px-4 py-4">{waitTargetLabels[deal.wartetAuf]}</td>
                <td className="px-4 py-4">
                  <span className={clsx("rounded-md px-2 py-1 text-xs font-semibold", badgeClass(risk))}>
                    {riskLabels[deal.riskStatus]}
                  </span>
                </td>
                <td className="max-w-[280px] px-4 py-4">
                  <p className="line-clamp-3 text-[#425166]">{deal.naechsterSchritt || "-"}</p>
                </td>
                <td className="px-4 py-4">
                  {showDetails ? <DealDetails deal={deal} /> : <Link href="/?tab=deals" className="font-semibold text-[#244ac8]">Öffnen</Link>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DealDetails({ deal }: { deal: DealWithRelations }) {
  return (
    <details className="min-w-44">
      <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#dfe5ec] px-3 py-2 text-sm font-semibold text-[#425166]">
        <Pencil size={15} /> Details
      </summary>
      <div className="mt-3 grid w-[min(1100px,calc(100vw-3rem))] gap-4 rounded-md border border-[#dfe5ec] bg-white p-4 shadow-xl xl:grid-cols-[1fr_340px]">
        <div>
          <SectionTitle icon={<Pencil size={17} />} title="Deal bearbeiten" />
          <DealForm action={updateDeal.bind(null, deal.id)} deal={deal} submitLabel="Änderungen speichern" />
        </div>
        <div className="space-y-4">
          <DocumentStatusGrid deal={deal} />
          <NotesPanel deal={deal} />
          <ChangeHistory changes={deal.changes} />
          <form action={deleteDeal.bind(null, deal.id)}>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-semibold text-rose-700" type="submit">
              <Trash2 size={15} /> Deal löschen
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

function DealForm({
  action,
  submitLabel,
  deal,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  deal?: Deal;
}) {
  return (
    <form action={action} className="mt-4 grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field name="kunde" label="Kunde" required defaultValue={deal?.kunde} placeholder="Lidl, Kaufland..." />
        <Field name="marke" label="Marke" defaultValue={deal?.marke} />
        <Field name="artikel" label="Artikel" required defaultValue={deal?.artikel} />
        <Field name="stueckzahl" label="Stückzahl" defaultValue={deal?.stueckzahl} />
        <Field name="preis" label="Preis" defaultValue={deal?.preis} />
        <Field name="warenwert" label="Warenwert" defaultValue={deal?.warenwert} />
        <Field name="marge" label="Marge" defaultValue={deal?.marge} />
        <Field name="dealnummer" label="Dealnummer" defaultValue={deal?.dealnummer} />
        <Field name="liefertermin" label="Liefertermin / KW" defaultValue={deal?.liefertermin} />
        <Field name="po" label="PO" defaultValue={deal?.po} />
        <Field name="drittlandswarePo" label="Drittlandsware PO" defaultValue={deal?.drittlandswarePo} />
        <Field name="drittlaender" label="Drittländer" defaultValue={deal?.drittlaender} />
        <Field name="fotomusterPo" label="Fotomuster PO" defaultValue={deal?.fotomusterPo} />
        <Field name="qsMusterPo" label="QS Muster PO" defaultValue={deal?.qsMusterPo} />
        <Field name="servicewarePo" label="Serviceware PO" defaultValue={deal?.servicewarePo} />
        <Field name="etd" label="ETD" type="date" defaultValue={inputDate(deal?.etd)} />
        <Field name="eta" label="ETA" type="date" defaultValue={inputDate(deal?.eta)} />
        <Field name="bearbeitenBis" label="Bearbeiten bis" type="date" defaultValue={inputDate(deal?.bearbeitenBis)} />
        <Field name="crdZeitfenster" label="CRD / Zeitfenster" defaultValue={deal?.crdZeitfenster} />
        <Field name="lieferant" label="Lieferant" defaultValue={deal?.lieferant} />
        <Field name="lieferantKontakt" label="Kontakt Lieferant" defaultValue={deal?.lieferantKontakt} />
        <Field name="spedition" label="Spedition / Forwarder" defaultValue={deal?.spedition} />
        <Field name="speditionKontakt" label="Kontakt Spedition" defaultValue={deal?.speditionKontakt} />
        <Field name="incoterm" label="Incoterm" defaultValue={deal?.incoterm} placeholder="FOB, EXW, CIF..." />
        <Field name="pol" label="POL / Abgangshafen" defaultValue={deal?.pol} />
        <Field name="pod" label="POD / Zielhafen" defaultValue={deal?.pod} />
        <Field name="containerNummer" label="Container" defaultValue={deal?.containerNummer} />
        <Field name="blNummer" label="BL / AWB Nummer" defaultValue={deal?.blNummer} />
        <Field name="zahlungsstatus" label="Zahlungsstatus" defaultValue={deal?.zahlungsstatus} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select name="status" label="Status" options={dealStatuses} labels={statusLabels} defaultValue={deal?.status ?? "NEU"} />
        <Select name="priority" label="Priorität" options={priorities} labels={priorityLabels} defaultValue={deal?.priority ?? "NORMAL"} />
        <Select name="riskStatus" label="Risiko" options={riskStatuses} labels={riskLabels} defaultValue={deal?.riskStatus ?? "NIEDRIG"} />
        <Select name="wartetAuf" label="Wartet auf" options={waitTargets} labels={waitTargetLabels} defaultValue={deal?.wartetAuf ?? "KEIN_BLOCKER"} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select name="commercialInvoice" label="Commercial Invoice" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.commercialInvoice ?? "FEHLT"} />
        <Select name="packingList" label="Packing List" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.packingList ?? "FEHLT"} />
        <Select name="billOfLading" label="Bill of Lading / AWB" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.billOfLading ?? "FEHLT"} />
        <Select name="ursprungsnachweis" label="Ursprungsnachweis" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.ursprungsnachweis ?? "FEHLT"} />
        <Select name="hsCode" label="HS Code" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.hsCode ?? "FEHLT"} />
        <Select name="ceDokumente" label="CE Dokumente" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.ceDokumente ?? "NICHT_NOETIG"} />
        <Select name="pruefberichte" label="Prüfberichte" options={documentStatuses} labels={documentStatusLabels} defaultValue={deal?.pruefberichte ?? "NICHT_NOETIG"} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Textarea name="naechsterSchritt" label="Nächster Schritt" defaultValue={deal?.naechsterSchritt} />
        <Textarea name="notizenKurz" label="Notizen" defaultValue={deal?.notizenKurz} />
      </div>

      <button className="h-11 rounded-md bg-[#17202c] px-4 text-sm font-semibold text-white" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}

function DocumentStatusGrid({ deal }: { deal: Deal }) {
  const docs = [
    ["Commercial Invoice", deal.commercialInvoice],
    ["Packing List", deal.packingList],
    ["BL / AWB", deal.billOfLading],
    ["Ursprung", deal.ursprungsnachweis],
    ["HS Code", deal.hsCode],
    ["CE", deal.ceDokumente],
    ["Prüfberichte", deal.pruefberichte],
  ] as const;

  return (
    <section className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <SectionTitle icon={<FileCheck2 size={16} />} title="Dokumente" />
      <div className="mt-3 grid gap-2">
        {docs.map(([label, status]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
            <span>{label}</span>
            <span className={clsx("rounded px-2 py-1 text-xs font-semibold", documentClass(status))}>
              {documentStatusLabels[status]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesPanel({ deal }: { deal: DealWithRelations }) {
  return (
    <section className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <SectionTitle icon={<StickyNote size={16} />} title="Verlauf" />
      <form action={addNote.bind(null, deal.id)} className="mt-3 flex gap-2">
        <input name="note" placeholder="Stand, Rückfrage, nächster Step..." className="min-w-0 flex-1 rounded-md border border-[#dfe5ec] bg-white px-3 text-sm outline-none" />
        <button className="h-10 rounded-md bg-[#17202c] px-3 text-sm font-semibold text-white" type="submit">
          Hinzufügen
        </button>
      </form>
      <div className="mt-3 space-y-2">
        {deal.notes.length === 0 ? (
          <p className="text-sm text-[#637389]">Noch kein Verlauf.</p>
        ) : (
          deal.notes.map((note) => (
            <div key={note.id} className="rounded-md bg-white p-3">
              <p className="text-sm leading-5">{note.text}</p>
              <p className="mt-2 text-xs text-[#637389]">{formatDate(note.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ChangeHistory({ changes }: { changes: DealChange[] }) {
  return (
    <section className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <SectionTitle icon={<TrendingUp size={16} />} title="Änderungen" />
      <div className="mt-3 space-y-2">
        {changes.length === 0 ? (
          <p className="text-sm text-[#637389]">Noch keine ETA/ETD/Menge/Preis-Änderung.</p>
        ) : (
          changes.map((change) => (
            <div key={change.id} className="rounded-md bg-white p-3 text-sm">
              <p className="font-semibold">{change.field}</p>
              <p className="mt-1 text-[#637389]">
                {change.oldValue || "-"} → {change.newValue || "-"}
              </p>
              <p className="mt-1 text-xs text-[#637389]">{formatDate(change.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  return (
    <div className="rounded-md border border-[#dfe5ec] bg-white p-4">
      <div
        className={clsx(
          "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md",
          tone === "green" && "bg-emerald-50 text-emerald-700",
          tone === "yellow" && "bg-amber-50 text-amber-700",
          tone === "red" && "bg-rose-50 text-rose-700",
          tone === "default" && "bg-[#eef2f5] text-[#425166]",
        )}
      >
        {icon}
      </div>
      <p className="text-sm text-[#637389]">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function PanelHeader({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="border-b border-[#dfe5ec] p-4">
      <PanelTitle icon={icon} title={title} detail={detail} />
    </div>
  );
}

function PanelTitle({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef2f5] text-[#425166]">{icon}</div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-[#637389]">{detail}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#425166]">
      {icon}
      <span>{title}</span>
    </div>
  );
}

function TabLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-md px-4 py-2 text-sm font-semibold",
        active ? "bg-[#17202c] text-white" : "border border-[#dfe5ec] bg-white text-[#425166]",
      )}
    >
      {label}
    </Link>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#425166]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-10 rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#17202c] outline-none focus:border-[#4f7cff]"
      />
    </label>
  );
}

function Select<T extends string>({
  name,
  label,
  options,
  labels,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  defaultValue: T;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#425166]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-10 rounded-md border border-[#dfe5ec] bg-white px-3 text-sm text-[#17202c] outline-none focus:border-[#4f7cff]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#425166]">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={3}
        className="resize-y rounded-md border border-[#dfe5ec] bg-white px-3 py-2 text-sm text-[#17202c] outline-none focus:border-[#4f7cff]"
      />
    </label>
  );
}

function normalizeSearchParams(params?: Record<string, string | string[] | undefined>): Search {
  const value = (key: string) => {
    const param = params?.[key];
    return Array.isArray(param) ? param[0] : param;
  };
  return {
    tab: value("tab"),
    q: value("q"),
    kunde: value("kunde"),
    status: value("status"),
    ampel: value("ampel"),
    month: value("month"),
  };
}

function filterDeals(deals: DealWithRelations[], params: Search) {
  const q = (params.q ?? "").toLowerCase();
  const kunde = (params.kunde ?? "").toLowerCase();

  return deals.filter((deal) => {
    const haystack = [
      deal.kunde,
      deal.marke,
      deal.artikel,
      deal.po,
      deal.dealnummer,
      deal.lieferant,
      deal.spedition,
      deal.containerNummer,
      deal.blNummer,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (q && !haystack.includes(q)) return false;
    if (kunde && !deal.kunde.toLowerCase().includes(kunde)) return false;
    if (params.status && deal.status !== params.status) return false;
    if (params.ampel && getTrafficLight(deal) !== params.ampel) return false;
    return true;
  });
}

function sortByUrgency(deals: DealWithRelations[]) {
  const weight = { red: 0, yellow: 1, green: 2 };
  return [...deals].sort((a, b) => {
    const lightDiff = weight[getTrafficLight(a)] - weight[getTrafficLight(b)];
    if (lightDiff !== 0) return lightDiff;
    return (a.bearbeitenBis?.getTime() ?? a.eta?.getTime() ?? 9e15) - (b.bearbeitenBis?.getTime() ?? b.eta?.getTime() ?? 9e15);
  });
}

function relativeDate(value?: Date | null) {
  const diff = daysUntil(value);
  if (diff === null) return "";
  if (diff === 0) return "heute";
  if (diff === 1) return "morgen";
  if (diff < 0) return `${Math.abs(diff)} Tage überfällig`;
  return `in ${diff} Tagen`;
}

function parseMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function buildCalendarDays(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (start.getDay() + 6) % 7;
  const first = new Date(start);
  first.setDate(start.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    return day;
  });
}

function buildEvents(deals: DealWithRelations[]) {
  return deals.flatMap((deal) => {
    const light = getTrafficLight(deal);
    return [
      deal.etd ? { key: dateKey(deal.etd), type: "ETD", deal, light } : null,
      deal.eta ? { key: dateKey(deal.eta), type: "ETA", deal, light } : null,
      deal.bearbeitenBis ? { key: dateKey(deal.bearbeitenBis), type: "To-do", deal, light } : null,
    ].filter(Boolean) as { key: string; type: string; deal: DealWithRelations; light: "green" | "yellow" | "red" }[];
  });
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftMonth(month: Date, offset: number) {
  const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function badgeClass(light: "green" | "yellow" | "red") {
  if (light === "red") return "bg-rose-50 text-rose-700";
  if (light === "yellow") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function lightDot(light: "green" | "yellow" | "red") {
  if (light === "red") return "bg-rose-500";
  if (light === "yellow") return "bg-amber-400";
  return "bg-emerald-500";
}

function calendarEventClass(light: "green" | "yellow" | "red") {
  if (light === "red") return "bg-rose-50 text-rose-800";
  if (light === "yellow") return "bg-amber-50 text-amber-800";
  return "bg-emerald-50 text-emerald-800";
}

function documentClass(status: string) {
  if (status === "FEHLT") return "bg-rose-50 text-rose-700";
  if (status === "ANGEFRAGT") return "bg-amber-50 text-amber-700";
  if (status === "ERHALTEN") return "bg-sky-50 text-sky-700";
  if (status === "GEPRUEFT") return "bg-emerald-50 text-emerald-700";
  return "bg-[#eef2f5] text-[#637389]";
}
