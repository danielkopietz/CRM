import { Deal, DealNote } from "@prisma/client";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CirclePlus,
  ClipboardList,
  LogIn,
  LogOut,
  Pencil,
  Search,
  Ship,
  StickyNote,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { addNote, createDeal, deleteDeal, updateDeal } from "@/app/actions";
import {
  dealStatuses,
  formatDate,
  getTrafficLight,
  inputDate,
  statusLabels,
  trafficLightLabel,
} from "@/lib/deals";
import { getSessionUser, isAuthConfigured } from "@/lib/auth0";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DealWithNotes = Deal & { notes: DealNote[] };

async function loadDeals(): Promise<DealWithNotes[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    return await prisma.deal.findMany({
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ eta: "asc" }, { updatedAt: "desc" }],
    });
  } catch {
    return [];
  }
}

export default async function Home() {
  const authConfigured = isAuthConfigured();
  const user = await getSessionUser();

  if (authConfigured && !user) {
    return <LoginScreen />;
  }

  const deals = await loadDeals();
  const redDeals = deals.filter((deal) => getTrafficLight(deal) === "red");
  const yellowDeals = deals.filter((deal) => getTrafficLight(deal) === "yellow");
  const greenDeals = deals.filter((deal) => getTrafficLight(deal) === "green");

  return (
    <main className="min-h-screen bg-[#f6f7f9]">
      <header className="border-b border-[#dfe4ea] bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-[#617083]">Verzollung CRM</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-[#18202a]">
              Deal- und Fristen-Cockpit
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-[#dfe4ea] bg-[#f6f7f9] px-3 py-2 text-sm text-[#425166]">
              {user?.email ?? "Lokaler Setup-Modus"}
            </div>
            {authConfigured ? (
              <a
                href="/auth/logout"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#18202a] px-3 text-sm font-medium text-white"
              >
                <LogOut size={16} /> Logout
              </a>
            ) : (
              <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Auth0 Env fehlt
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-5 py-5 xl:grid-cols-[390px_1fr]">
        <aside className="h-fit rounded-md border border-[#dfe4ea] bg-white p-4">
          <SectionTitle icon={<CirclePlus size={18} />} title="Neuer Deal" />
          <DealForm action={createDeal} submitLabel="Deal anlegen" />
        </aside>

        <section className="space-y-5">
          {!process.env.DATABASE_URL ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Es ist noch keine Datenbank verbunden. In Coolify muss
              <code className="mx-1 rounded bg-white px-1">DATABASE_URL</code>
              gesetzt werden; danach speichert das CRM echte Deals.
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Alle Deals" value={deals.length} icon={<ClipboardList size={18} />} />
            <MetricCard label="Grün" value={greenDeals.length} tone="green" icon={<CheckCircle2 size={18} />} />
            <MetricCard label="Gelb" value={yellowDeals.length} tone="yellow" icon={<CalendarClock size={18} />} />
            <MetricCard label="Rot" value={redDeals.length} tone="red" icon={<AlertTriangle size={18} />} />
          </div>

          <div className="rounded-md border border-[#dfe4ea] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#dfe4ea] p-4 lg:flex-row lg:items-center lg:justify-between">
              <SectionTitle icon={<Ship size={18} />} title="Aktive Deals" />
              <div className="flex h-10 items-center gap-2 rounded-md border border-[#dfe4ea] bg-[#f6f7f9] px-3 text-sm text-[#617083]">
                <Search size={16} />
                Suche und Filter kommen im nächsten Schritt
              </div>
            </div>

            {deals.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-lg font-semibold text-[#18202a]">Noch keine Deals angelegt</p>
                <p className="mt-2 text-sm text-[#617083]">
                  Lege links den ersten Lidl-, Kaufland- oder Hartmann-Deal an.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8edf2]">
                {deals.map((deal) => (
                  <DealRow key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function LoginScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-5">
      <section className="w-full max-w-md rounded-md border border-[#dfe4ea] bg-white p-6">
        <p className="text-sm font-medium text-[#617083]">Verzollung CRM</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#18202a]">Bitte anmelden</h1>
        <p className="mt-3 text-sm leading-6 text-[#617083]">
          Das CRM ist mit Auth0 geschützt. Nach dem Login siehst du alle Deals,
          Fristen und Notizen.
        </p>
        <a
          href="/auth/login"
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#18202a] px-4 text-sm font-medium text-white"
        >
          <LogIn size={17} /> Mit E-Mail und Passwort einloggen
        </a>
      </section>
    </main>
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
    <div className="rounded-md border border-[#dfe4ea] bg-white p-4">
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
      <p className="text-sm text-[#617083]">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-[#18202a]">{value}</p>
    </div>
  );
}

function DealRow({ deal }: { deal: DealWithNotes }) {
  const light = getTrafficLight(deal);

  return (
    <article className="p-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={clsx("h-3 w-3 rounded-full", lightClass(light))} />
                <h2 className="text-lg font-semibold text-[#18202a]">
                  {deal.kunde} · {deal.marke ? `${deal.marke} · ` : ""}
                  {deal.artikel}
                </h2>
              </div>
              <p className="mt-1 text-sm text-[#617083]">
                {statusLabels[deal.status]} · {trafficLightLabel(light)}
              </p>
            </div>
            <form action={deleteDeal.bind(null, deal.id)}>
              <button
                className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 px-3 text-sm font-medium text-rose-700"
                type="submit"
              >
                <Trash2 size={15} /> Löschen
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Deal" value={deal.dealnummer} />
            <Info label="PO" value={deal.po} />
            <Info label="ETD" value={formatDate(deal.etd)} />
            <Info label="ETA" value={formatDate(deal.eta)} />
            <Info label="Menge" value={deal.stueckzahl} />
            <Info label="Preis" value={deal.preis} />
            <Info label="Liefertermin" value={deal.liefertermin} />
            <Info label="Bearbeiten bis" value={formatDate(deal.bearbeitenBis)} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <TextPanel label="Nächster Schritt" value={deal.naechsterSchritt} />
            <TextPanel label="Notizen" value={deal.notizenKurz} />
          </div>

          <details className="mt-4 rounded-md border border-[#dfe4ea] bg-[#fbfcfd]">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-[#425166]">
              <Pencil size={15} /> Deal bearbeiten
            </summary>
            <div className="border-t border-[#dfe4ea] p-3">
              <DealForm
                action={updateDeal.bind(null, deal.id)}
                deal={deal}
                submitLabel="Änderungen speichern"
              />
            </div>
          </details>
        </div>

        <div className="rounded-md border border-[#dfe4ea] bg-[#fbfcfd] p-3">
          <SectionTitle icon={<StickyNote size={17} />} title="Verlauf" />
          <form action={addNote.bind(null, deal.id)} className="mt-3 flex gap-2">
            <input
              name="note"
              placeholder="Aktueller Stand, Rückfrage, nächster Step..."
              className="min-w-0 flex-1 rounded-md border border-[#dfe4ea] bg-white px-3 text-sm outline-none focus:border-[#4f7cff]"
            />
            <button className="h-10 rounded-md bg-[#18202a] px-3 text-sm font-medium text-white" type="submit">
              Hinzufügen
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {deal.notes.length === 0 ? (
              <p className="text-sm text-[#617083]">Noch kein Verlauf.</p>
            ) : (
              deal.notes.map((note) => (
                <div key={note.id} className="rounded-md border border-[#e8edf2] bg-white p-3">
                  <p className="text-sm leading-5 text-[#18202a]">{note.text}</p>
                  <p className="mt-2 text-xs text-[#617083]">{formatDate(note.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </article>
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
    <form action={action} className="mt-4 grid gap-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        <Field name="kunde" label="Kunde" required defaultValue={deal?.kunde} placeholder="Lidl, Kaufland..." />
        <Field name="marke" label="Marke" defaultValue={deal?.marke} />
        <Field name="artikel" label="Artikel" required defaultValue={deal?.artikel} />
        <Field name="stueckzahl" label="Stückzahl" defaultValue={deal?.stueckzahl} />
        <Field name="preis" label="Preis" defaultValue={deal?.preis} />
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
        <Field name="crdZeitfenster" label="CRD / Zeitfenster" defaultValue={deal?.crdZeitfenster} />
        <Field name="bearbeitenBis" label="Bearbeiten bis" type="date" defaultValue={inputDate(deal?.bearbeitenBis)} />
      </div>

      <label className="grid gap-1 text-sm font-medium text-[#425166]">
        Status
        <select
          name="status"
          defaultValue={deal?.status ?? "NEU"}
          className="h-10 rounded-md border border-[#dfe4ea] bg-white px-3 text-sm text-[#18202a] outline-none focus:border-[#4f7cff]"
        >
          {dealStatuses.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>

      <Textarea name="naechsterSchritt" label="Nächster Schritt" defaultValue={deal?.naechsterSchritt} />
      <Textarea name="notizenKurz" label="Notizen" defaultValue={deal?.notizenKurz} />

      <button className="mt-1 h-11 rounded-md bg-[#18202a] px-4 text-sm font-semibold text-white" type="submit">
        {submitLabel}
      </button>
    </form>
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
        className="h-10 rounded-md border border-[#dfe4ea] bg-white px-3 text-sm text-[#18202a] outline-none focus:border-[#4f7cff]"
      />
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
        className="resize-y rounded-md border border-[#dfe4ea] bg-white px-3 py-2 text-sm text-[#18202a] outline-none focus:border-[#4f7cff]"
      />
    </label>
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

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-h-16 rounded-md border border-[#e8edf2] bg-[#fbfcfd] p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-[#617083]">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-[#18202a]">{value || "-"}</p>
    </div>
  );
}

function TextPanel({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border border-[#e8edf2] bg-[#fbfcfd] p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-[#617083]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#18202a]">{value || "-"}</p>
    </div>
  );
}

function lightClass(light: "green" | "yellow" | "red") {
  if (light === "red") return "bg-rose-500";
  if (light === "yellow") return "bg-amber-400";
  return "bg-emerald-500";
}
