import { Deal, DealChange, DealNote } from "@prisma/client";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
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
import { Fragment } from "react";
import clsx from "clsx";
import { addNote, createDeal, deleteDeal, quickUpdateDeal, updateDeal } from "@/app/actions";
import {
  daysUntil,
  dealStatuses,
  formatDate,
  getTrafficLight,
  inputDate,
  isWithinDays,
  statusLabels,
  trafficLightLabel,
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
  preset?: string;
};

type PoReminder = {
  id: string;
  deal: DealWithRelations;
  title: string;
  detail: string;
  date: Date;
  days: number;
  tone: "red" | "yellow" | "blue";
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
    return light === "red" || light === "yellow";
  });

  const redDeals = deals.filter((deal) => getTrafficLight(deal) === "red");
  const yellowDeals = deals.filter((deal) => getTrafficLight(deal) === "yellow");
  const etaWeek = deals.filter((deal) => getPoSchedules(deal).some((po) => po.number && isWithinDays(po.eta, 7)));
  const etdWeek = deals.filter((deal) => getPoSchedules(deal).some((po) => po.number && isWithinDays(po.etd, 7)));
  const dueToday = deals.filter((deal) => daysUntil(deal.bearbeitenBis) === 0);
  const missingEta = deals.filter((deal) => !deal.eta && !deal.etaUnbekannt);
  const poReminders = buildPoReminders(deals);

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#17202c]">
      <header className="border-b border-[#dde4ec] bg-white/95">
        <div className="mx-auto max-w-[1560px] px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#637389]">Verzollung CRM · Einkauf 2026</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#17202c]">
                China Deals, PO- und Fristen-Cockpit
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
            missingEta={missingEta}
            poReminders={poReminders}
            params={params}
          />
        )}
      </div>
      <ReminderPopup reminders={poReminders} />
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
          Nach dem Login siehst du alle Deals, PO-Termine, Dokumente und Notizen.
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
  missingEta,
  poReminders,
  params,
}: {
  allDeals: DealWithRelations[];
  criticalDeals: DealWithRelations[];
  redDeals: DealWithRelations[];
  yellowDeals: DealWithRelations[];
  etaWeek: DealWithRelations[];
  etdWeek: DealWithRelations[];
  dueToday: DealWithRelations[];
  missingEta: DealWithRelations[];
  poReminders: PoReminder[];
  params: Search;
}) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Rot / überfällig" value={redDeals.length} tone="red" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Heute fällig" value={dueToday.length} tone="yellow" icon={<CalendarClock size={18} />} />
        <MetricCard label="Gelb" value={yellowDeals.length} tone="yellow" icon={<Hourglass size={18} />} />
        <MetricCard label="ETA 7 Tage" value={etaWeek.length} icon={<PackageCheck size={18} />} />
        <MetricCard label="ETD 7 Tage" value={etdWeek.length} icon={<Ship size={18} />} />
        <MetricCard label="ETA fehlt" value={missingEta.length} tone="yellow" icon={<AlertTriangle size={18} />} />
        <MetricCard label="PO Erinnerungen" value={poReminders.length} tone="yellow" icon={<BellRing size={18} />} />
      </div>

      <ReminderPanel reminders={poReminders} />

      <section className="rounded-md border border-[#dfe5ec] bg-white">
        <PanelHeader
          icon={<TrendingUp size={18} />}
          title="Heute handeln"
          detail="Fehlende ETA, kritische Deals und Fristen zuerst"
        />
        <CompactDealTable deals={criticalDeals.slice(0, 10)} empty="Aktuell brennt nichts." />
      </section>

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
  const presets = ["Silvercrest", "Sanitas", "Kaufland", "Hartmann"];

  return (
    <div className="border-b border-[#dfe5ec] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase text-[#637389]">Fertige Übersichten</span>
        {presets.map((preset) => (
          <Link
            key={preset}
            href={`/?tab=deals&preset=${encodeURIComponent(preset)}`}
            className={clsx(
              "rounded-md border px-3 py-2 text-sm font-semibold",
              params.preset === preset
                ? "border-[#17202c] bg-[#17202c] text-white"
                : "border-[#dfe5ec] bg-[#f8fafc] text-[#425166]",
            )}
          >
            {preset}
          </Link>
        ))}
        {params.preset ? (
          <Link href="/?tab=deals" className="px-2 py-2 text-sm font-semibold text-[#637389]">
            Filter zurücksetzen
          </Link>
        ) : null}
      </div>
      <form className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/">
        <input type="hidden" name="tab" value="deals" />
        {params.preset ? <input type="hidden" name="preset" value={params.preset} /> : null}
        <label className="flex h-10 items-center gap-2 rounded-md border border-[#dfe5ec] bg-[#f8fafc] px-3">
          <Search size={16} className="text-[#637389]" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Suche Kunde, Marke, Artikel, Deal oder PO..."
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
    </div>
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
      <table className="w-full min-w-[1320px] border-collapse text-left text-sm">
        <thead className="bg-[#f8fafc] text-xs font-semibold uppercase text-[#637389]">
          <tr>
            <th className="px-4 py-3">Marke / LIDL Deal</th>
            <th className="px-4 py-3">Artikel / Lieferung</th>
            <th className="px-4 py-3">Menge / Preis</th>
            <th className="px-4 py-3">POs mit ETD / ETA</th>
            <th className="px-4 py-3">Bearbeiten</th>
            <th className="px-4 py-3">Nächster Schritt</th>
            <th className="px-4 py-3">Aktion</th>
            <th className="px-4 py-3 text-right">Ampel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#edf1f5]">
          {deals.map((deal) => {
            const light = getTrafficLight(deal);
            return (
              <Fragment key={deal.id}>
                <tr
                  key={`${deal.id}-summary`}
                  className={clsx(
                    "align-top hover:bg-[#fafbfc]",
                    light !== "green" && "crm-soft-pulse",
                  )}
                >
                  <td className="px-3 py-4">
                    <p className="font-semibold text-[#17202c]">{deal.marke || "Marke fehlt"}</p>
                    <p className="mt-1 text-xs text-[#637389]">{deal.kunde}</p>
                    <p className="mt-2 font-semibold text-[#17202c]">LIDL Deal {deal.dealnummer || "-"}</p>
                    <p className="mt-1 text-xs text-[#637389]">Ausmusterung: {deal.ausmusterung || "-"}</p>
                  </td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-[#17202c]">{deal.artikel}</p>
                    <p className="mt-2 font-semibold text-[#17202c]">Liefertermin: {deal.liefertermin || "-"}</p>
                    <p className="mt-1 font-semibold text-[#17202c]">CRD Window: {deal.crdZeitfenster || "-"}</p>
                  </td>
                  <td className="px-3 py-4">
                    <p>{deal.stueckzahl || "-"}</p>
                    <p className="mt-1 text-xs text-[#637389]">Preis: {deal.preis || "-"}</p>
                    <p className="mt-1 text-xs text-[#637389]">Warenwert: {deal.warenwert || "-"}</p>
                  </td>
                  <td className="min-w-[330px] px-3 py-4"><PoOverview deal={deal} /></td>
                  <td className="px-3 py-4">
                    <p>{formatDate(deal.bearbeitenBis) || "-"}</p>
                    <p className="text-xs text-[#637389]">{relativeDate(deal.bearbeitenBis)}</p>
                  </td>
                  <td className="max-w-[240px] px-3 py-4">
                    <p className="line-clamp-3 text-[#425166]">{deal.naechsterSchritt || "-"}</p>
                    {deal.notizenKurz ? <p className="mt-2 line-clamp-2 text-xs text-[#637389]">{deal.notizenKurz}</p> : null}
                  </td>
                  <td className="px-3 py-4">
                    {showDetails ? (
                      <span className="text-sm font-medium text-[#637389]">Quick Actions unten</span>
                    ) : (
                      <Link href="/?tab=deals" className="font-semibold text-[#244ac8]">
                        Öffnen
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className={clsx("inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold", badgeClass(light))}>
                      <span className={clsx("h-2 w-2 rounded-full", lightDot(light))} />
                      {trafficLightLabel(light)}
                    </span>
                    <DealSignals deal={deal} />
                  </td>
                </tr>
                {showDetails ? (
                  <tr key={`${deal.id}-quick-actions`} className="bg-white">
                    <td colSpan={8} className="px-3 pb-4">
                      <QuickActionBar deal={deal} />
                    </td>
                  </tr>
                ) : null}
                {showDetails ? (
                  <tr key={`${deal.id}-details`} className="bg-white">
                    <td colSpan={8} className="px-3 pb-5">
                      <DealDetails deal={deal} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PoOverview({ deal }: { deal: Deal }) {
  return (
    <div className="grid gap-2">
      {getPoSchedules(deal).map((po) => (
        <div key={po.key} className="grid grid-cols-[112px_1fr] gap-2 rounded-md bg-[#f8fafc] px-2 py-1.5 text-xs">
          <span className="font-semibold text-[#425166]">{po.shortLabel}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[#17202c]">PO {po.number || "-"}</span>
            <span className="mt-0.5 block text-[#637389]">
              ETD {formatDate(po.etd) || "-"} · ETA {formatDate(po.eta) || (po.etaUnknown ? "bewusst offen" : "-")}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DealDetails({ deal }: { deal: DealWithRelations }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#dfe5ec] bg-white px-3 py-2 text-sm font-semibold text-[#425166] group-open:hidden">
        <Pencil size={15} /> Details
      </summary>
      <div className="mt-3 grid w-full gap-4 rounded-md border border-[#dfe5ec] bg-white p-4 xl:grid-cols-[minmax(0,1fr)_340px]">
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

function QuickActionBar({ deal }: { deal: DealWithRelations }) {
  return (
    <div className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr_auto]">
        <form action={quickUpdateDeal.bind(null, deal.id)} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="quickAction" value="eta" />
          <label className="grid gap-1 text-xs font-semibold text-[#637389]">
            ETA Mass Production
            <input
              name="eta"
              type="date"
              defaultValue={inputDate(deal.eta)}
              className="h-9 rounded-md border border-[#dfe5ec] bg-white px-2 text-sm outline-none"
            />
          </label>
          <label className="flex h-9 items-center gap-2 rounded-md border border-[#dfe5ec] bg-white px-2 text-xs font-semibold text-[#637389]">
            <input name="etaUnbekannt" type="checkbox" defaultChecked={deal.etaUnbekannt} />
            ETA unbekannt
          </label>
          <button className="h-9 rounded-md bg-[#17202c] px-3 text-sm font-semibold text-white" type="submit">
            Speichern
          </button>
        </form>

        <form action={quickUpdateDeal.bind(null, deal.id)} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="quickAction" value="nextStep" />
          <label className="grid min-w-56 flex-1 gap-1 text-xs font-semibold text-[#637389]">
            Nächster Schritt
            <input
              name="naechsterSchritt"
              defaultValue={deal.naechsterSchritt ?? ""}
              placeholder="z. B. ETA beim Lieferanten anfragen"
              className="h-9 rounded-md border border-[#dfe5ec] bg-white px-2 text-sm outline-none"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#637389]">
            Bearbeiten bis
            <input
              name="bearbeitenBis"
              type="date"
              defaultValue={inputDate(deal.bearbeitenBis)}
              className="h-9 rounded-md border border-[#dfe5ec] bg-white px-2 text-sm outline-none"
            />
          </label>
          <button className="h-9 rounded-md bg-[#17202c] px-3 text-sm font-semibold text-white" type="submit">
            Setzen
          </button>
        </form>

        <form action={quickUpdateDeal.bind(null, deal.id)} className="flex items-end">
          <input type="hidden" name="quickAction" value="done" />
          <button className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700" type="submit">
            <CheckCircle2 size={15} /> Erledigt
          </button>
        </form>
      </div>
    </div>
  );
}

function DealSignals({ deal }: { deal: DealWithRelations }) {
  const signals = [
    !deal.eta && !deal.etaUnbekannt ? { label: "ETA fehlt", tone: "yellow" } : null,
    !deal.eta && deal.etaUnbekannt ? { label: "ETA bewusst offen", tone: "neutral" } : null,
    signalForDate("ETD", deal.etd),
    signalForDate("ETA", deal.eta),
    signalForDate("To-do", deal.bearbeitenBis),
  ].filter(Boolean) as { label: string; tone: "red" | "yellow" | "neutral" }[];

  if (signals.length === 0) return null;

  return (
    <div className="mt-2 ml-auto flex max-w-40 flex-wrap justify-end gap-1">
      {signals.slice(0, 3).map((signal) => (
        <span key={signal.label} className={clsx("rounded px-1.5 py-0.5 text-[11px] font-semibold", signalClass(signal.tone))}>
          {signal.label}
        </span>
      ))}
    </div>
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
      <SectionTitle icon={<ClipboardList size={17} />} title="Deal-Grunddaten" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field name="kunde" label="Kunde" required defaultValue={deal?.kunde} placeholder="Lidl, Kaufland..." />
        <Field name="marke" label="Marke" defaultValue={deal?.marke} placeholder="Silvercrest, Sanitas..." />
        <Field name="dealnummer" label="LIDL Deal Nummer" defaultValue={deal?.dealnummer} />
        <Field name="ausmusterung" label="Ausmusterung" defaultValue={deal?.ausmusterung} placeholder="Datum, KW oder Hinweis" />
        <Field name="artikel" label="Artikel" required defaultValue={deal?.artikel} />
        <Field name="liefertermin" label="Liefertermin / KW" defaultValue={deal?.liefertermin} />
        <Field name="crdZeitfenster" label="CRD Window" defaultValue={deal?.crdZeitfenster} />
        <Field name="stueckzahl" label="Stückzahl" defaultValue={deal?.stueckzahl} />
        <Field name="preis" label="Preis" defaultValue={deal?.preis} />
        <Field name="warenwert" label="Warenwert" defaultValue={deal?.warenwert} />
        <Field name="marge" label="Marge" defaultValue={deal?.marge} />
        <Field name="bearbeitenBis" label="Bearbeiten bis" type="date" defaultValue={inputDate(deal?.bearbeitenBis)} />
      </div>

      <SectionTitle icon={<Ship size={17} />} title="POs und Termine" />
      <div className="grid gap-3 xl:grid-cols-2">
        <PoInputBlock
          title="PO Mass Production"
          poName="po"
          poValue={deal?.po}
          etdName="etd"
          etdValue={deal?.etd}
          etaName="eta"
          etaValue={deal?.eta}
          etaUnknownName="etaUnbekannt"
          etaUnknown={deal?.etaUnbekannt}
        />
        <PoInputBlock
          title="PO Drittlandsware"
          poName="drittlandswarePo"
          poValue={deal?.drittlandswarePo}
          etdName="drittlandswareEtd"
          etdValue={deal?.drittlandswareEtd}
          etaName="drittlandswareEta"
          etaValue={deal?.drittlandswareEta}
        />
        <PoInputBlock
          title="PO Fotomuster"
          poName="fotomusterPo"
          poValue={deal?.fotomusterPo}
          etdName="fotomusterEtd"
          etdValue={deal?.fotomusterEtd}
          etaName="fotomusterEta"
          etaValue={deal?.fotomusterEta}
        />
        <PoInputBlock
          title="PO QS Muster"
          poName="qsMusterPo"
          poValue={deal?.qsMusterPo}
          etdName="qsMusterEtd"
          etdValue={deal?.qsMusterEtd}
          etaName="qsMusterEta"
          etaValue={deal?.qsMusterEta}
        />
        <PoInputBlock
          title="PO Serviceware"
          poName="servicewarePo"
          poValue={deal?.servicewarePo}
          etdName="servicewareEtd"
          etdValue={deal?.servicewareEtd}
          etaName="servicewareEta"
          etaValue={deal?.servicewareEta}
        />
      </div>

      <SectionTitle icon={<FileCheck2 size={17} />} title="Prozessdokumente" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ProcessDocumentCheckbox name="dokumentenDrafts" label="Dokumenten Drafts" status={deal?.dokumentenDrafts} />
        <ProcessDocumentCheckbox name="verschiffungspapiere" label="Verschiffungspapiere" status={deal?.verschiffungspapiere} />
        <ProcessDocumentCheckbox name="telexBl" label="Telex B/L" status={deal?.telexBl} />
        <ProcessDocumentCheckbox name="proformaDrittlandsware" label="Proforma Rechnung Drittlandsware" status={deal?.proformaDrittlandsware} />
        <ProcessDocumentCheckbox name="inspektion100" label="100% Inspektion" status={deal?.inspektion100} />
        <ProcessDocumentCheckbox name="shipmentRelease" label="Shipment Release" status={deal?.shipmentRelease} />
        <ProcessDocumentCheckbox name="releaseDocument" label="Release Document" status={deal?.releaseDocument} />
        <ProcessDocumentCheckbox name="h1Document" label="H1 Document" status={deal?.h1Document} />
        <ProcessDocumentCheckbox name="t1Document" label="T1 Document" status={deal?.t1Document} />
        <ProcessDocumentCheckbox name="entladebericht" label="Entladebericht" status={deal?.entladebericht} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Textarea name="naechsterSchritt" label="Nächster Schritt" defaultValue={deal?.naechsterSchritt} />
        <Textarea name="notizenKurz" label="Aktueller Status / allgemeine Notizen" defaultValue={deal?.notizenKurz} />
      </div>

      <button className="h-11 rounded-md bg-[#17202c] px-4 text-sm font-semibold text-white" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}

function PoInputBlock({
  title,
  poName,
  poValue,
  etdName,
  etdValue,
  etaName,
  etaValue,
  required = false,
  etaUnknownName,
  etaUnknown = false,
}: {
  title: string;
  poName: string;
  poValue?: string | null;
  etdName: string;
  etdValue?: Date | null;
  etaName: string;
  etaValue?: Date | null;
  required?: boolean;
  etaUnknownName?: string;
  etaUnknown?: boolean;
}) {
  return (
    <section className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <h3 className="text-sm font-semibold text-[#17202c]">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field name={poName} label="PO Nummer" required={required} defaultValue={poValue} />
        <Field name={etdName} label="ETD" type="date" required={required} defaultValue={inputDate(etdValue)} />
        <Field name={etaName} label="ETA" type="date" defaultValue={inputDate(etaValue)} />
      </div>
      {etaUnknownName ? (
        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-[#425166]">
          <input name={etaUnknownName} type="checkbox" defaultChecked={etaUnknown} />
          ETA bewusst unbekannt
        </label>
      ) : null}
    </section>
  );
}

function ProcessDocumentCheckbox({
  name,
  label,
  status,
}: {
  name: string;
  label: string;
  status?: Deal["dokumentenDrafts"];
}) {
  const checked = Boolean(status && status !== "FEHLT");

  return (
    <label
      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-[#dfe5ec] bg-[#f8fafc] px-3 py-2 text-sm font-semibold text-[#425166] [&:has(input:checked)]:border-emerald-200 [&:has(input:checked)]:bg-emerald-50 [&:has(input:checked)]:text-emerald-800"
    >
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
        className="peer h-5 w-5 shrink-0 accent-emerald-600"
      />
      <span>{label}</span>
      <span className="ml-auto text-xs font-semibold text-rose-700 peer-checked:hidden">Fehlt</span>
      <span className="ml-auto hidden text-xs font-semibold text-emerald-700 peer-checked:inline">Erledigt</span>
    </label>
  );
}

function ReminderPanel({ reminders }: { reminders: PoReminder[] }) {
  return (
    <section className="rounded-md border border-[#dfe5ec] bg-white">
      <PanelHeader
        icon={<BellRing size={18} />}
        title="PO Erinnerungen"
        detail="Die Termine werden immer aus dem aktuell gespeicherten ETD-/ETA-Datum berechnet."
      />
      {reminders.length === 0 ? (
        <p className="p-4 text-sm text-[#637389]">Aktuell ist keine PO-Erinnerung fällig.</p>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {reminders.slice(0, 9).map((reminder) => (
            <div key={reminder.id} className={clsx("rounded-md border p-3", reminderClass(reminder.tone))}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{reminder.title}</p>
                <span className="whitespace-nowrap text-xs font-semibold">{relativeDate(reminder.date)}</span>
              </div>
              <p className="mt-1 text-sm">{reminder.deal.marke || reminder.deal.kunde} · {reminder.deal.artikel}</p>
              <p className="mt-2 text-xs opacity-80">{reminder.detail}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReminderPopup({ reminders }: { reminders: PoReminder[] }) {
  if (reminders.length === 0) return null;

  return (
    <aside className="fixed bottom-5 left-5 z-30 w-[min(360px,calc(100vw-2.5rem))] rounded-md border border-[#dfe5ec] bg-white p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <BellRing size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#17202c]">Erinnerungen</p>
          <p className="mt-1 text-sm text-[#637389]">
            {reminders.length} PO-Termin{reminders.length === 1 ? "" : "e"} brauchen Aufmerksamkeit.
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {reminders.slice(0, 3).map((reminder) => (
          <div key={reminder.id} className="rounded-md bg-[#f8fafc] px-3 py-2 text-sm">
            <p className="font-semibold">{reminder.title}</p>
            <p className="mt-1 text-xs text-[#637389]">{reminder.deal.kunde} · {reminder.deal.artikel} · {relativeDate(reminder.date)}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function DocumentStatusGrid({ deal }: { deal: Deal }) {
  const docs = [
    ["Dokumenten Drafts", deal.dokumentenDrafts],
    ["Verschiffungspapiere", deal.verschiffungspapiere],
    ["Telex B/L", deal.telexBl],
    ["Proforma Drittlandsware", deal.proformaDrittlandsware],
    ["100% Inspektion", deal.inspektion100],
    ["Shipment Release", deal.shipmentRelease],
    ["Release Document", deal.releaseDocument],
    ["H1 Document", deal.h1Document],
    ["T1 Document", deal.t1Document],
    ["Entladebericht", deal.entladebericht],
  ] as const;

  return (
    <section className="rounded-md border border-[#dfe5ec] bg-[#f8fafc] p-3">
      <SectionTitle icon={<FileCheck2 size={16} />} title="Prozessdokumente" />
      <div className="mt-3 grid gap-2">
        {docs.map(([label, status]) => {
          const complete = status !== "FEHLT";
          return (
            <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
              <span>{label}</span>
              <span
                className={clsx(
                  "rounded px-2 py-1 text-xs font-semibold",
                  complete ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
                )}
              >
                {complete ? "Erledigt" : "Fehlt"}
              </span>
            </div>
          );
        })}
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

function Textarea({
  name,
  label,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[#425166]">
      {label}
      <textarea
        name={name}
        required={required}
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
    preset: value("preset"),
  };
}

function filterDeals(deals: DealWithRelations[], params: Search) {
  const q = (params.q ?? "").toLowerCase();
  const kunde = (params.kunde ?? "").toLowerCase();
  const preset = (params.preset ?? "").toLowerCase();

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
      deal.drittlandswarePo,
      deal.fotomusterPo,
      deal.qsMusterPo,
      deal.servicewarePo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (q && !haystack.includes(q)) return false;
    if (kunde && !deal.kunde.toLowerCase().includes(kunde)) return false;
    if (preset && ![deal.kunde, deal.marke].filter(Boolean).some((value) => value?.toLowerCase().includes(preset))) return false;
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

function signalForDate(label: string, value?: Date | null) {
  const diff = daysUntil(value);
  if (diff === null) return null;
  if (diff < 0) return { label: `${label} überfällig`, tone: "red" as const };
  if (diff === 0) return { label: `${label} heute`, tone: "red" as const };
  if (diff === 1) return { label: `${label} morgen`, tone: "yellow" as const };
  if (diff <= 7) return { label: `${label} in ${diff} Tagen`, tone: "neutral" as const };
  return null;
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

function getPoSchedules(deal: Deal) {
  return [
    {
      key: "mass-production",
      label: "Mass Production",
      shortLabel: "Mass Prod.",
      number: deal.po,
      etd: deal.etd,
      eta: deal.eta,
      etaUnknown: deal.etaUnbekannt,
      customsReminder: true,
    },
    {
      key: "drittlandsware",
      label: "Drittlandsware",
      shortLabel: "Drittland",
      number: deal.drittlandswarePo,
      etd: deal.drittlandswareEtd,
      eta: deal.drittlandswareEta,
      etaUnknown: false,
      customsReminder: true,
    },
    {
      key: "fotomuster",
      label: "Fotomuster",
      shortLabel: "Fotomuster",
      number: deal.fotomusterPo,
      etd: deal.fotomusterEtd,
      eta: deal.fotomusterEta,
      etaUnknown: false,
      customsReminder: false,
    },
    {
      key: "qs-muster",
      label: "QS Muster",
      shortLabel: "QS Muster",
      number: deal.qsMusterPo,
      etd: deal.qsMusterEtd,
      eta: deal.qsMusterEta,
      etaUnknown: false,
      customsReminder: false,
    },
    {
      key: "serviceware",
      label: "Serviceware",
      shortLabel: "Serviceware",
      number: deal.servicewarePo,
      etd: deal.servicewareEtd,
      eta: deal.servicewareEta,
      etaUnknown: false,
      customsReminder: false,
    },
  ];
}

function buildPoReminders(deals: DealWithRelations[]) {
  const reminders: PoReminder[] = [];

  for (const deal of deals) {
    if (deal.status === "ABGESCHLOSSEN") continue;

    for (const po of getPoSchedules(deal)) {
      if (!po.number) continue;

      const etdDays = daysUntil(po.etd);
      if (po.etd && etdDays !== null && etdDays >= 0 && etdDays <= 3) {
        reminders.push({
          id: `${deal.id}-${po.key}-etd`,
          deal,
          title: `ETD ${po.label}`,
          detail: `PO ${po.number}: ETD am ${formatDate(po.etd)} prüfen und Verschiffung absichern.`,
          date: po.etd,
          days: etdDays,
          tone: etdDays === 0 ? "red" : "yellow",
        });
      }

      if (!po.customsReminder || !po.eta) continue;
      const etaDays = daysUntil(po.eta);
      if (etaDays === null || etaDays < 0) continue;

      if (etaDays <= 14) {
        reminders.push({
          id: `${deal.id}-${po.key}-customs`,
          deal,
          title: `Verzollung ${po.label}`,
          detail: `PO ${po.number}: Verzollung für die aktuelle ETA ${formatDate(po.eta)} vorbereiten.`,
          date: po.eta,
          days: etaDays,
          tone: etaDays <= 3 ? "yellow" : "blue",
        });
      }

      const h1T1Complete = [deal.h1Document, deal.t1Document].every((status) =>
        ["ERHALTEN", "GEPRUEFT", "NICHT_NOETIG"].includes(status),
      );

      if (etaDays <= 3 && !h1T1Complete) {
        reminders.push({
          id: `${deal.id}-${po.key}-h1-t1`,
          deal,
          title: `H1 + T1 ${po.label}`,
          detail: `PO ${po.number}: H1- und T1-Dokument für ETA ${formatDate(po.eta)} prüfen.`,
          date: po.eta,
          days: etaDays,
          tone: etaDays === 0 ? "red" : "yellow",
        });
      }
    }
  }

  return reminders.sort((a, b) => a.days - b.days || a.date.getTime() - b.date.getTime());
}

function buildEvents(deals: DealWithRelations[]) {
  return deals.flatMap((deal) => {
    const light = getTrafficLight(deal);
    const poEvents = getPoSchedules(deal).flatMap((po) => [
      po.number && po.etd ? { key: dateKey(po.etd), type: `${po.shortLabel} ETD`, deal, light } : null,
      po.number && po.eta ? { key: dateKey(po.eta), type: `${po.shortLabel} ETA`, deal, light } : null,
    ]);
    return [
      ...poEvents,
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

function signalClass(tone: "red" | "yellow" | "neutral") {
  if (tone === "red") return "bg-rose-50 text-rose-700";
  if (tone === "yellow") return "bg-amber-50 text-amber-700";
  return "bg-sky-50 text-sky-700";
}

function reminderClass(tone: "red" | "yellow" | "blue") {
  if (tone === "red") return "border-rose-200 bg-rose-50 text-rose-800";
  if (tone === "yellow") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}
