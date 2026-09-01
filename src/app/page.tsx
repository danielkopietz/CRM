import { Deal, DealChange, DealNote } from "@prisma/client";
import {
  AlertTriangle,
  BellRing,
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
  X,
} from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import clsx from "clsx";
import { addNote, createDeal, deleteDeal, setPoCompleted, updateDeal } from "@/app/actions";
import { PoCompletionCheckbox } from "@/app/po-completion-checkbox";
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
  newDeal?: string;
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
      orderBy: [{ eta: "asc" }, { bearbeitenBis: "asc" }, { createdAt: "desc" }],
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
    <main className="min-h-screen bg-[#f4efe7] text-[#2a241d]">
      <header className="border-b border-[#e4ddd2] bg-[#fffdf8]/95 shadow-sm">
        <div className="mx-auto max-w-[1560px] px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[#746d63]">Verzollung CRM · Einkauf 2026</p>
              <h1 className="mt-1 font-serif text-4xl font-medium tracking-normal text-[#17130f] md:text-5xl">
                China Deals - Übersicht
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/?tab=${tab}&new=1`}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-[#4f6138] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#41522e]"
              >
                  <CirclePlus size={17} /> Neuer Deal
              </Link>
              <div className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8] px-3 py-2 text-sm text-[#5b554d] shadow-sm">
                {user?.email ?? "Lokaler Setup-Modus"}
              </div>
              {authConfigured ? (
                <a
                  href="/auth/logout"
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#e4ddd2] bg-[#fffdf8] px-3 text-sm font-medium text-[#2a241d] shadow-sm transition-colors hover:bg-[#faf8f3]"
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

      {params.newDeal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#4f6138]/45 p-4 backdrop-blur-[1px] sm:p-6">
          <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[1180px] overflow-x-hidden overflow-y-auto rounded-lg border border-[#ded4c6] bg-[#fffdf8] shadow-2xl sm:max-h-[calc(100vh-3rem)]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#e4ddd2] bg-[#fffdf8] px-5 py-4">
              <SectionTitle icon={<CirclePlus size={18} />} title="Neuen Deal erfassen" />
              <Link
                href={`/?tab=${tab}`}
                aria-label="Fenster schließen"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#e4ddd2] text-[#5b554d] hover:bg-[#f3eee6]"
              >
                <X size={18} />
              </Link>
            </div>
            <div className="p-5">
              <DealForm action={createDeal} submitLabel="Deal anlegen" />
            </div>
          </section>
        </div>
      ) : null}

      <div className="mx-auto max-w-[1560px] space-y-5 px-5 py-5">
        {!process.env.DATABASE_URL ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Keine Datenbank verbunden. In Coolify muss
            <code className="mx-1 rounded bg-[#fffdf8] px-1">DATABASE_URL</code>
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
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe7] px-5">
      <section className="w-full max-w-md rounded-lg border border-[#e4ddd2] bg-[#fffdf8] p-6 shadow-sm">
        <p className="text-sm font-medium text-[#746d63]">Verzollung CRM</p>
        <h1 className="mt-2 font-serif text-3xl font-medium text-[#17130f]">Bitte anmelden</h1>
        <p className="mt-3 text-sm leading-6 text-[#746d63]">
          Nach dem Login siehst du alle Deals, PO-Termine, Dokumente und Notizen.
        </p>
        <a
          href="/auth/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#4f6138] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#41522e]"
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

      <section className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8]">
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
    <section className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8]">
      <PanelHeader icon={<ClipboardList size={18} />} title="Deal-Übersicht" detail={`${deals.length} von ${allDeals.length} Deals`} />
      <Filters params={params} />
      <CompactDealTable deals={sortByAusmusterung(deals)} empty="Keine Deals für diese Filter." showDetails={!embedded} />
    </section>
  );
}

function CalendarView({ deals, params }: { deals: DealWithRelations[]; params: Search }) {
  const month = parseMonth(params.month);
  const days = buildCalendarDays(month);
  const events = buildEvents(deals);

  return (
    <section className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8]">
      <div className="flex flex-col gap-3 border-b border-[#e4ddd2] p-4 lg:flex-row lg:items-center lg:justify-between">
        <PanelTitle icon={<CalendarClock size={18} />} title="Kalender" detail="ETD, ETA und interne Bearbeitungsfristen" />
        <div className="flex items-center gap-2">
          <Link href={`/?tab=kalender&month=${shiftMonth(month, -1)}`} className="rounded-md border border-[#e4ddd2] px-3 py-2 text-sm font-medium">
            Zurück
          </Link>
          <div className="min-w-40 rounded-md bg-[#f3eee6] px-3 py-2 text-center text-sm font-semibold">
            {month.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </div>
          <Link href={`/?tab=kalender&month=${shiftMonth(month, 1)}`} className="rounded-md border border-[#e4ddd2] px-3 py-2 text-sm font-medium">
            Weiter
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-[#e4ddd2] bg-[#faf8f3] text-xs font-semibold uppercase text-[#746d63]">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
          <div key={day} className="border-r border-[#eee7dc] px-3 py-2 last:border-r-0">
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
            <div key={key} className={clsx("min-h-36 border-b border-r border-[#eee7dc] p-2 last:border-r-0", outside && "bg-[#fffdf8] text-[#9aa6b5]")}>
              <div className="text-sm font-semibold">{day.getDate()}</div>
              <div className="mt-2 space-y-1">
                {dayEvents.slice(0, 4).map((event) => (
                  <div key={`${event.type}-${event.deal.id}`} className={clsx("rounded px-2 py-1 text-xs font-medium", calendarEventClass(event.light))}>
                    <span className="font-semibold">{event.type}</span> · {event.deal.kunde} · {event.deal.artikel}
                  </div>
                ))}
                {dayEvents.length > 4 ? <p className="text-xs text-[#746d63]">+{dayEvents.length - 4} weitere</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Filters({ params }: { params: Search }) {
  const presets = ["Sensiplast", "Sanitas", "Kaufland", "Hartmann"];

  return (
    <div className="border-b border-[#e4ddd2] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase text-[#746d63]">Fertige Übersichten</span>
        {presets.map((preset) => (
          <Link
            key={preset}
            href={`/?tab=deals&preset=${encodeURIComponent(preset)}`}
            className={clsx(
              "rounded-md border px-3 py-2 text-sm font-semibold",
              params.preset === preset
                ? "border-[#4f6138] bg-[#4f6138] text-white"
                : "border-[#e4ddd2] bg-[#faf8f3] text-[#5b554d]",
            )}
          >
            {preset}
          </Link>
        ))}
        {params.preset ? (
          <Link href="/?tab=deals" className="px-2 py-2 text-sm font-semibold text-[#746d63]">
            Filter zurücksetzen
          </Link>
        ) : null}
      </div>
      <form className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" action="/">
        <input type="hidden" name="tab" value="deals" />
        {params.preset ? <input type="hidden" name="preset" value={params.preset} /> : null}
        <label className="flex h-10 items-center gap-2 rounded-md border border-[#e4ddd2] bg-[#faf8f3] px-3">
          <Search size={16} className="text-[#746d63]" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Suche Kunde, Marke, Artikel, Deal oder PO..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <input name="kunde" defaultValue={params.kunde ?? ""} placeholder="Kunde" className="h-10 rounded-md border border-[#e4ddd2] px-3 text-sm outline-none" />
        <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-[#e4ddd2] px-3 text-sm outline-none">
          <option value="">Alle Status</option>
          {dealStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
        <select name="ampel" defaultValue={params.ampel ?? ""} className="h-10 rounded-md border border-[#e4ddd2] px-3 text-sm outline-none">
          <option value="">Alle Ampeln</option>
          <option value="red">Rot</option>
          <option value="yellow">Gelb</option>
          <option value="green">Grün</option>
        </select>
        <button className="h-10 rounded-md bg-[#4f6138] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#41522e]" type="submit">
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
    return <p className="p-5 text-sm text-[#746d63]">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
        <thead className="bg-[#faf8f3] text-xs font-semibold uppercase text-[#746d63]">
          <tr>
            <th className="px-4 py-3">Keyfacts</th>
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
                    "align-top hover:bg-[#fffdf8]",
                    light !== "green" && "crm-soft-pulse",
                  )}
                >
                  <td className="min-w-[300px] px-3 py-4">
                    <div className="space-y-1.5 font-semibold leading-5 text-[#7a284f]">
                      <p>{deal.marke || "-"}</p>
                      <p>{deal.kunde}</p>
                      <p>{deal.dealnummer || "-"}</p>
                      <p>{deal.ausmusterung || "-"}</p>
                      <p className="whitespace-pre-line">{deal.artikel}</p>
                      <p>LT: {deal.liefertermin || "-"}</p>
                      <p>CRD: {deal.crdZeitfenster || "-"}</p>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <p>{deal.stueckzahl || "-"}</p>
                    <p className="mt-1 text-xs text-[#746d63]">Preis: {deal.preis || "-"}</p>
                    <p className="mt-1 text-xs text-[#746d63]">Warenwert: {deal.warenwert || "-"}</p>
                  </td>
                  <td className="min-w-[330px] px-3 py-4"><PoOverview deal={deal} /></td>
                  <td className="px-3 py-4">
                    <p>{formatDate(deal.bearbeitenBis) || "-"}</p>
                    <p className="text-xs text-[#746d63]">{relativeDate(deal.bearbeitenBis)}</p>
                  </td>
                  <td className="max-w-[240px] px-3 py-4">
                    <p className="line-clamp-3 text-[#5b554d]">{deal.naechsterSchritt || "-"}</p>
                    {deal.notizenKurz ? <p className="mt-2 line-clamp-2 text-xs text-[#746d63]">{deal.notizenKurz}</p> : null}
                  </td>
                  <td className="px-3 py-4">
                    {showDetails ? (
                      <span className="text-sm font-medium text-[#746d63]">Details unten</span>
                    ) : (
                      <Link href="/?tab=deals" className="font-semibold text-[#4f6138]">
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
                  <tr key={`${deal.id}-details`} className="bg-[#fffdf8]">
                    <td colSpan={7} className="px-3 pb-5">
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
        <div
          key={po.key}
          className="grid grid-cols-[112px_1fr_auto] items-center gap-2 rounded-md border border-transparent bg-[#faf8f3] px-2 py-1.5 text-xs transition-colors has-[input:checked]:border-emerald-200 has-[input:checked]:bg-emerald-100"
        >
          <span className="font-semibold text-[#5b554d]">{po.shortLabel}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[#2a241d]">PO {po.number || "-"}</span>
            <span className="mt-0.5 block text-[#746d63]">
              ETD {formatDate(po.etd) || "-"} · ETA {formatDate(po.eta) || (po.etaUnknown ? "bewusst offen" : "-")}
            </span>
          </span>
          <PoCompletionCheckbox
            action={setPoCompleted.bind(null, deal.id, po.key)}
            checked={po.completed}
            label={`${po.label} erledigt`}
          />
        </div>
      ))}
    </div>
  );
}

function DealDetails({ deal }: { deal: DealWithRelations }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#e4ddd2] bg-[#fffdf8] px-3 py-2 text-sm font-semibold text-[#5b554d] group-open:hidden">
        <Pencil size={15} /> Details
      </summary>
      <div className="mt-3 grid w-full gap-4 rounded-lg border border-[#e4ddd2] bg-[#fffdf8] p-4 shadow-sm xl:grid-cols-[minmax(0,1fr)_340px]">
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
        <Textarea
          name="artikel"
          label="Artikel"
          required
          rows={4}
          className="md:col-span-2 xl:col-span-3"
          defaultValue={deal?.artikel}
        />
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

      <button className="h-11 rounded-md bg-[#4f6138] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#41522e]" type="submit">
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
    <section className="rounded-md border border-[#e4ddd2] bg-[#faf8f3] p-3">
      <h3 className="text-sm font-semibold text-[#2a241d]">{title}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field name={poName} label="PO Nummer" required={required} defaultValue={poValue} />
        <Field name={etdName} label="ETD" type="date" required={required} defaultValue={inputDate(etdValue)} />
        <Field name={etaName} label="ETA" type="date" defaultValue={inputDate(etaValue)} />
      </div>
      {etaUnknownName ? (
        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-[#5b554d]">
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
      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-[#e4ddd2] bg-[#faf8f3] px-3 py-2 text-sm font-semibold text-[#5b554d] [&:has(input:checked)]:border-emerald-200 [&:has(input:checked)]:bg-emerald-50 [&:has(input:checked)]:text-emerald-800"
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
    <section className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8]">
      <PanelHeader
        icon={<BellRing size={18} />}
        title="PO Erinnerungen"
        detail="Die Termine werden immer aus dem aktuell gespeicherten ETD-/ETA-Datum berechnet."
      />
      {reminders.length === 0 ? (
        <p className="p-4 text-sm text-[#746d63]">Aktuell ist keine PO-Erinnerung fällig.</p>
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
    <aside className="fixed bottom-5 left-5 z-30 w-[min(360px,calc(100vw-2.5rem))] rounded-lg border border-[#e4ddd2] bg-[#fffdf8] p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <BellRing size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#2a241d]">Erinnerungen</p>
          <p className="mt-1 text-sm text-[#746d63]">
            {reminders.length} PO-Termin{reminders.length === 1 ? "" : "e"} brauchen Aufmerksamkeit.
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {reminders.slice(0, 3).map((reminder) => (
          <div key={reminder.id} className="rounded-md bg-[#faf8f3] px-3 py-2 text-sm">
            <p className="font-semibold">{reminder.title}</p>
            <p className="mt-1 text-xs text-[#746d63]">{reminder.deal.kunde} · {reminder.deal.artikel} · {relativeDate(reminder.date)}</p>
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
    <section className="rounded-md border border-[#e4ddd2] bg-[#faf8f3] p-3">
      <SectionTitle icon={<FileCheck2 size={16} />} title="Prozessdokumente" />
      <div className="mt-3 grid gap-2">
        {docs.map(([label, status]) => {
          const complete = status !== "FEHLT";
          return (
            <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-[#fffdf8] px-3 py-2 text-sm">
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
    <section className="rounded-md border border-[#e4ddd2] bg-[#faf8f3] p-3">
      <SectionTitle icon={<StickyNote size={16} />} title="Verlauf" />
      <form action={addNote.bind(null, deal.id)} className="mt-3 flex gap-2">
        <input name="note" placeholder="Stand, Rückfrage, nächster Step..." className="min-w-0 flex-1 rounded-lg border border-[#e4ddd2] bg-[#fffdf8] px-3 text-sm outline-none" />
        <button className="h-10 rounded-md bg-[#4f6138] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#41522e]" type="submit">
          Hinzufügen
        </button>
      </form>
      <div className="mt-3 space-y-2">
        {deal.notes.length === 0 ? (
          <p className="text-sm text-[#746d63]">Noch kein Verlauf.</p>
        ) : (
          deal.notes.map((note) => (
            <div key={note.id} className="rounded-md bg-[#fffdf8] p-3">
              <p className="text-sm leading-5">{note.text}</p>
              <p className="mt-2 text-xs text-[#746d63]">{formatDate(note.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ChangeHistory({ changes }: { changes: DealChange[] }) {
  return (
    <section className="rounded-md border border-[#e4ddd2] bg-[#faf8f3] p-3">
      <SectionTitle icon={<TrendingUp size={16} />} title="Änderungen" />
      <div className="mt-3 space-y-2">
        {changes.length === 0 ? (
          <p className="text-sm text-[#746d63]">Noch keine ETA/ETD/Menge/Preis-Änderung.</p>
        ) : (
          changes.map((change) => (
            <div key={change.id} className="rounded-md bg-[#fffdf8] p-3 text-sm">
              <p className="font-semibold">{change.field}</p>
              <p className="mt-1 text-[#746d63]">
                {change.oldValue || "-"} → {change.newValue || "-"}
              </p>
              <p className="mt-1 text-xs text-[#746d63]">{formatDate(change.createdAt)}</p>
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
    <div className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8] p-4 shadow-sm">
      <div
        className={clsx(
          "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md",
          tone === "green" && "bg-emerald-50 text-emerald-700",
          tone === "yellow" && "bg-amber-50 text-amber-700",
          tone === "red" && "bg-rose-50 text-rose-700",
          tone === "default" && "bg-[#efeee5] text-[#4f6138]",
        )}
      >
        {icon}
      </div>
      <p className="text-sm text-[#746d63]">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function PanelHeader({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="border-b border-[#e4ddd2] p-4">
      <PanelTitle icon={icon} title={title} detail={detail} />
    </div>
  );
}

function PanelTitle({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#efeee5] text-[#4f6138]">{icon}</div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm text-[#746d63]">{detail}</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-[#5b554d]">
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
        active ? "bg-[#4f6138] text-white" : "border border-[#e4ddd2] bg-[#fffdf8] text-[#5b554d]",
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
    <label className="grid gap-1 text-sm font-medium text-[#5b554d]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="h-10 rounded-lg border border-[#e4ddd2] bg-[#fffdf8] px-3 text-sm text-[#2a241d] outline-none focus:border-[#6f7d4b]"
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
  required = false,
  rows = 3,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={clsx("grid gap-1 text-sm font-medium text-[#5b554d]", className)}>
      {label}
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        className="resize-y rounded-lg border border-[#e4ddd2] bg-[#fffdf8] px-3 py-2 text-sm text-[#2a241d] outline-none focus:border-[#6f7d4b]"
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
    newDeal: value("new"),
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

function sortByAusmusterung(deals: DealWithRelations[]) {
  return [...deals].sort((a, b) => {
    const aDate = parseAusmusterungDate(a.ausmusterung);
    const bDate = parseAusmusterungDate(b.ausmusterung);

    if (aDate !== null || bDate !== null) {
      if (aDate === null) return 1;
      if (bDate === null) return -1;
      if (aDate !== bDate) return bDate - aDate;
    } else {
      const aText = a.ausmusterung?.trim() ?? "";
      const bText = b.ausmusterung?.trim() ?? "";
      if (aText && !bText) return -1;
      if (!aText && bText) return 1;
      if (aText && bText) {
        const textDiff = bText.localeCompare(aText, "de", { numeric: true, sensitivity: "base" });
        if (textDiff !== 0) return textDiff;
      }
    }

    const createdDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (createdDiff !== 0) return createdDiff;
    return a.id.localeCompare(b.id);
  });
}

function parseAusmusterungDate(value?: string | null) {
  if (!value) return null;
  const text = value.trim();

  const isoDate = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoDate) {
    return validUtcDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  }

  const germanDate = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/);
  if (germanDate) {
    return validUtcDate(Number(germanDate[3]), Number(germanDate[2]), Number(germanDate[1]));
  }

  const calendarWeek = text.match(/\bKW\s*(\d{1,2})(?:\s*[-/.]\s*|\s+)(\d{4})\b/i);
  if (calendarWeek) {
    const week = Number(calendarWeek[1]);
    const year = Number(calendarWeek[2]);
    if (week < 1 || week > 53) return null;
    const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
    const weekday = (fourthOfJanuary.getUTCDay() + 6) % 7;
    return Date.UTC(year, 0, 4 - weekday + (week - 1) * 7);
  }

  return null;
}

function validUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.getTime();
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
      completed: deal.poMassProductionDone,
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
      completed: deal.poDrittlandswareDone,
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
      completed: deal.poFotomusterDone,
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
      completed: deal.poQsMusterDone,
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
      completed: deal.poServicewareDone,
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
