"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { BellRing, CheckCircle2, Clock3, ExternalLink } from "lucide-react";
import {
  completeDealReminder,
  completePoReminder,
  snoozeDealReminder,
  snoozePoReminder,
} from "@/app/actions";

export type DealReminderPopupItem = {
  id: string;
  dealId: string;
  dealLabel: string;
  text: string;
  dueDate: string;
  snoozedUntil: string | null;
};

export type PoReminderPopupItem = {
  id: string;
  dealId: string;
  dealLabel: string;
  title: string;
  detail: string;
  dueDate: string;
  snoozedUntil: string | null;
};

export function DealReminderPopup({ reminders }: { reminders: DealReminderPopupItem[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = berlinDateKey(now);
  const dueReminders = reminders.filter((reminder) => {
    if (reminder.dueDate > today) return false;
    return !reminder.snoozedUntil || new Date(reminder.snoozedUntil).getTime() <= now;
  });

  if (dueReminders.length === 0) return null;

  return (
    <aside className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8] p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <BellRing size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#2a241d]">Deal-Erinnerungen</p>
          <p className="mt-1 text-sm text-[#746d63]">
            {dueReminders.length} Erinnerung{dueReminders.length === 1 ? " ist" : "en sind"} fällig.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {dueReminders.slice(0, 3).map((reminder) => (
          <div key={reminder.id} className="rounded-md border border-amber-100 bg-amber-50/70 p-3 text-sm">
            <p className="font-semibold text-[#2a241d]">{reminder.text}</p>
            <p className="mt-1 text-xs text-[#746d63]">{reminder.dealLabel} · fällig {formatReminderDate(reminder.dueDate)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/?tab=deals&deal=${encodeURIComponent(reminder.dealId)}#deal-${reminder.dealId}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#4f6138] px-2.5 text-xs font-semibold text-white"
              >
                <ExternalLink size={13} /> Zum Deal
              </Link>
              <form action={snoozeDealReminder.bind(null, reminder.id)}>
                <ReminderActionButton className="border border-[#e4ddd2] bg-[#fffdf8] text-[#5b554d]">
                  <Clock3 size={13} /> In 15 Min.
                </ReminderActionButton>
              </form>
              <form action={completeDealReminder.bind(null, reminder.id)}>
                <ReminderActionButton className="border border-emerald-200 bg-[#fffdf8] text-emerald-700">
                  <CheckCircle2 size={13} /> Erledigt
                </ReminderActionButton>
              </form>
            </div>
          </div>
        ))}
      </div>
      {dueReminders.length > 3 ? (
        <p className="mt-3 text-xs font-semibold text-[#746d63]">+{dueReminders.length - 3} weitere fällige Erinnerungen</p>
      ) : null}
    </aside>
  );
}

export function PoReminderPopup({ reminders }: { reminders: PoReminderPopupItem[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const dueReminders = reminders.filter(
    (reminder) => !reminder.snoozedUntil || new Date(reminder.snoozedUntil).getTime() <= now,
  );
  if (dueReminders.length === 0) return null;

  return (
    <aside className="rounded-lg border border-[#e4ddd2] bg-[#fffdf8] p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
          <BellRing size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#2a241d]">PO-Erinnerungen</p>
          <p className="mt-1 text-sm text-[#746d63]">
            {dueReminders.length} PO-Termin{dueReminders.length === 1 ? "" : "e"} brauchen Aufmerksamkeit.
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {dueReminders.slice(0, 3).map((reminder) => (
          <div key={reminder.id} className="rounded-md border border-amber-100 bg-amber-50/70 p-3 text-sm">
            <p className="font-semibold text-[#2a241d]">{reminder.title}</p>
            <p className="mt-1 text-xs text-[#746d63]">{reminder.dealLabel}</p>
            <p className="mt-1 text-xs text-[#746d63]">{reminder.detail}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/?tab=deals&deal=${encodeURIComponent(reminder.dealId)}#deal-${reminder.dealId}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#4f6138] px-2.5 text-xs font-semibold text-white"
              >
                <ExternalLink size={13} /> Zum Deal
              </Link>
              <form action={snoozePoReminder.bind(null, reminder.id, reminder.dealId, reminder.dueDate)}>
                <ReminderActionButton className="border border-[#e4ddd2] bg-[#fffdf8] text-[#5b554d]">
                  <Clock3 size={13} /> In 15 Min.
                </ReminderActionButton>
              </form>
              <form action={completePoReminder.bind(null, reminder.id, reminder.dealId, reminder.dueDate)}>
                <ReminderActionButton className="border border-emerald-200 bg-[#fffdf8] text-emerald-700">
                  <CheckCircle2 size={13} /> Erledigt
                </ReminderActionButton>
              </form>
            </div>
          </div>
        ))}
      </div>
      {dueReminders.length > 3 ? (
        <p className="mt-3 text-xs font-semibold text-[#746d63]">+{dueReminders.length - 3} weitere fällige PO-Erinnerungen</p>
      ) : null}
    </aside>
  );
}

function ReminderActionButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

function berlinDateKey(timestamp: number) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatReminderDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
