"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { formatIsoWeek } from "@/lib/calendar-week";

export function WeekDateInput({
  name,
  defaultValue,
  required = false,
  ariaLabel,
}: {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  ariaLabel: string;
}) {
  const initialDate = parseIsoDate(defaultValue);
  const [value, setValue] = useState(initialDate ? toIsoDate(initialDate) : "");
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(initialDate ?? new Date()));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedDate = parseIsoDate(value);
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const weeks = Array.from({ length: 6 }, (_, index) => calendarDays.slice(index * 7, index * 7 + 7));

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function toggleCalendar() {
    if (!open) setVisibleMonth(monthStart(selectedDate ?? new Date()));
    setOpen((current) => !current);
  }

  function selectDate(date: Date) {
    setValue(toIsoDate(date));
    setVisibleMonth(monthStart(date));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectToday() {
    selectDate(new Date());
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggleCalendar}
        className="flex h-10 w-full items-center overflow-hidden rounded-lg border border-[#e4ddd2] bg-[#fffdf8] text-left text-sm text-[#2a241d] outline-none transition-colors focus:border-[#6f7d4b]"
      >
        <span className="flex h-full min-w-[62px] items-center justify-center border-r border-[#e4ddd2] bg-[#f3eee6] px-2 text-xs font-semibold text-[#5b554d]">
          {selectedDate ? `KW ${formatIsoWeek(selectedDate)}` : "KW --"}
        </span>
        <span className={clsx("min-w-0 flex-1 px-3", !selectedDate && "text-[#746d63]")}> 
          {selectedDate ? formatDisplayDate(selectedDate) : "tt.mm.jjjj"}
        </span>
        <CalendarDays size={16} className="mr-3 shrink-0 text-[#746d63]" />
      </button>

      {required && !value ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value=""
          onChange={() => undefined}
          onInvalid={(event) => {
            event.preventDefault();
            setOpen(true);
            triggerRef.current?.focus();
          }}
          className="pointer-events-none absolute h-px w-px opacity-0"
        />
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-label={`Kalender für ${ariaLabel}`}
          className="absolute top-[calc(100%+6px)] left-1/2 z-[90] w-[320px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-[#d8d0c5] bg-[#fffdf8] p-3 text-[#2a241d] shadow-xl"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Vorheriger Monat"
              onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4ddd2] hover:bg-[#f3eee6]"
            >
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold">
              {visibleMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              aria-label="Nächster Monat"
              onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e4ddd2] hover:bg-[#f3eee6]"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-[42px_repeat(7,minmax(0,1fr))] gap-y-1 text-center text-xs">
            <span className="py-1 font-semibold text-[#7a284f]">KW</span>
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
              <span key={day} className="py-1 font-semibold text-[#746d63]">{day}</span>
            ))}
            {weeks.map((week) => (
              <Fragment key={toIsoDate(week[0])}>
                <span className="flex items-center justify-center rounded bg-[#f3eee6] font-semibold text-[#7a284f]">
                  {formatIsoWeek(week[0])}
                </span>
                {week.map((day) => {
                  const selected = selectedDate ? sameDay(day, selectedDate) : false;
                  const today = sameDay(day, new Date());
                  const outside = day.getMonth() !== visibleMonth.getMonth();
                  return (
                    <button
                      key={toIsoDate(day)}
                      type="button"
                      aria-label={day.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      onClick={() => selectDate(day)}
                      className={clsx(
                        "mx-auto inline-flex h-8 w-8 items-center justify-center rounded-md font-medium hover:bg-[#e8e2d8]",
                        outside && "text-[#a49d93]",
                        today && !selected && "border border-[#9eab87]",
                        selected && "bg-[#4f6138] text-white hover:bg-[#41522e]",
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#e4ddd2] pt-3 text-xs font-semibold">
            <button type="button" onClick={() => { setValue(""); setOpen(false); }} className="text-[#7a284f] hover:underline">
              Löschen
            </button>
            <button type="button" onClick={selectToday} className="text-[#4f6138] hover:underline">
              Heute
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function parseIsoDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function buildCalendarDays(month: Date) {
  const first = monthStart(month);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
