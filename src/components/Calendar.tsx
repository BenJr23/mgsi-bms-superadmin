"use client";

import React, { useMemo, useState } from "react";

export type CalendarEvent = {
  date: Date | string;
  label?: string;
  color?: "indigo" | "emerald" | "violet" | "amber" | "orange";
};

export type CalendarProps = {
  /** Events to highlight on the calendar. */
  events?: CalendarEvent[];
  /** Month to show initially (defaults to today). */
  initialMonth?: Date;
  /** Called whenever a date is selected. */
  onSelectDate?: (date: Date) => void;

  /** Determines whether a given day is selectable (in addition to being in the current month). */
  isDateSelectable?: (date: Date) => boolean;

  /** Show a small "View" trigger on hover for each day cell. */
  showViewButtonOnHover?: boolean;
  /** Called when the user clicks the "View" trigger for a specific day. */
  onViewDate?: (date: Date) => void;
  /** Determines whether a given day should show the "View" trigger. */
  isDateViewable?: (date: Date) => boolean;

  /** Controlled visible month (1st day of month is recommended). */
  month?: Date;
  /** Called when visible month changes (prev/next/today). */
  onMonthChange?: (month: Date) => void;

  /** Controlled selected date. */
  selectedDate?: Date | null;
  /** Called when selected date changes. */
  onSelectedDateChange?: (date: Date) => void;

  /** Visual layout. */
  variant?: "compact" | "full";
  /** Hide internal header when embedding in a page toolbar. */
  showHeader?: boolean;
  /** Show the “Selected date” panel under the grid. */
  showSelectedDate?: boolean;
  /** Optional wrapper className. */
  className?: string;

  /** Optional per-day indicator renderer (kept small; intended for availability badges/dots). */
  renderDateIndicator?: (date: Date) => React.ReactNode;
};

type CalendarCell = {
  date: Date;
  inMonth: boolean;
};

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateKeyLocal(date: Date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function parseDateInput(input: Date | string): Date {
  if (input instanceof Date) return input;

  // Parse YYYY-MM-DD as a *local* date (avoids UTC shifting).
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(input);
  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, monthIndex, day);
  }

  return new Date(input);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, deltaMonths: number) {
  return new Date(date.getFullYear(), date.getMonth() + deltaMonths, 1);
}

function buildMonthGrid(viewMonth: Date): CalendarCell[] {
  const first = startOfMonth(viewMonth);
  const year = first.getFullYear();
  const month = first.getMonth();

  const startWeekday = first.getDay(); // 0 (Sun) .. 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    if (i < startWeekday) {
      const day = daysInPrevMonth - startWeekday + i + 1;
      cells.push({ date: new Date(year, month - 1, day), inMonth: false });
      continue;
    }

    const dayOfMonth = i - startWeekday + 1;
    if (dayOfMonth <= daysInMonth) {
      cells.push({ date: new Date(year, month, dayOfMonth), inMonth: true });
      continue;
    }

    const dayNextMonth = dayOfMonth - daysInMonth;
    cells.push({
      date: new Date(year, month + 1, dayNextMonth),
      inMonth: false,
    });
  }

  return cells;
}

function eventToneClasses(tone: NonNullable<CalendarEvent["color"]>) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500 text-white";
    case "violet":
      return "bg-violet-500 text-white";
    case "amber":
      return "bg-amber-500 text-white";
    case "orange":
      return "bg-orange-500 text-white";
    case "indigo":
    default:
      return "bg-indigo-500 text-white";
  }
}

export default function Calendar({
  events,
  initialMonth,
  onSelectDate,
  isDateSelectable,
  showViewButtonOnHover,
  onViewDate,
  isDateViewable,
  month,
  onMonthChange,
  selectedDate: selectedDateProp,
  onSelectedDateChange,
  variant = "compact",
  showHeader = true,
  showSelectedDate = true,
  className,
  renderDateIndicator,
}: CalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [internalMonth, setInternalMonth] = useState<Date>(() =>
    startOfMonth(initialMonth ?? today),
  );
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(
    today,
  );

  const viewMonth = month ? startOfMonth(month) : internalMonth;
  const selectedDate =
    selectedDateProp === undefined ? internalSelectedDate : selectedDateProp;

  function setViewMonth(next: Date | ((prev: Date) => Date)) {
    const resolved =
      typeof next === "function"
        ? (next as (prev: Date) => Date)(viewMonth)
        : next;
    const normalized = startOfMonth(resolved);
    if (onMonthChange) onMonthChange(normalized);
    if (!month) setInternalMonth(normalized);
  }

  function setSelectedDate(next: Date) {
    onSelectDate?.(next);
    onSelectedDateChange?.(next);
    if (selectedDateProp === undefined) setInternalSelectedDate(next);
  }

  // Default sample events so event highlighting is visible out of the box.
  const effectiveEvents = useMemo<CalendarEvent[]>(() => {
    if (events && events.length > 0) return events;

    const t = new Date();
    const in2Days = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 2);
    const in7Days = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7);

    return [
      { date: t, label: "Today" },
      { date: in2Days, label: "Check-in" },
      { date: in7Days, label: "Milestone" },
    ];
  }, [events]);

  const eventsByKey = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of effectiveEvents) {
      const parsed = parseDateInput(ev.date);
      if (Number.isNaN(parsed.getTime())) continue;
      const key = toDateKeyLocal(parsed);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [effectiveEvents]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(viewMonth);
  }, [viewMonth]);

  const selectedLabel = useMemo(() => {
    if (!selectedDate) return "None";
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(selectedDate);
  }, [selectedDate]);

  const todayKey = useMemo(() => toDateKeyLocal(today), [today]);
  const selectedKey = selectedDate ? toDateKeyLocal(selectedDate) : null;

  const isFull = variant === "full";

  return (
    <section
      className={[
        "w-full rounded-xl border border-neutral-200 bg-white p-4 text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Calendar"
    >
      {showHeader ? (
        <header className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setViewMonth((d) => addMonths(d, -1))}
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
            aria-label="Previous month"
          >
            Prev
          </button>

          <h2 className="text-base font-semibold">{monthLabel}</h2>

          <button
            type="button"
            onClick={() => setViewMonth((d) => addMonths(d, 1))}
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 active:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
            aria-label="Next month"
          >
            Next
          </button>
        </header>
      ) : null}

      <div
        className={[
          showHeader ? "mt-4" : "mt-0",
          "grid grid-cols-7 gap-1",
        ].join(" ")}
        role="rowgroup"
        aria-label="Days of week"
      >
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-semibold tracking-wide text-neutral-600 dark:text-neutral-400"
            role="columnheader"
          >
            {label}
          </div>
        ))}
      </div>

      <div
        className={[
          "mt-1 grid grid-cols-7 gap-1",
          isFull ? "auto-rows-[7.5rem]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="grid"
        aria-label="Month days"
      >
        {cells.map((cell) => {
          const key = toDateKeyLocal(cell.date);
          const isToday = key === todayKey;
          const isSelected = selectedKey === key;
          const dayEvents = eventsByKey.get(key) ?? [];
          const hasEvent = dayEvents.length > 0;

          const isSelectable =
            cell.inMonth &&
            (isDateSelectable ? isDateSelectable(cell.date) : true);
          const isDisabled = !isSelectable;
          const canView =
            !!onViewDate &&
            !!showViewButtonOnHover &&
            !isDisabled &&
            (isDateViewable ? isDateViewable(cell.date) : true);

          const base = isFull
            ? [
                "group relative flex w-full flex-col items-stretch justify-start overflow-hidden rounded-md border border-neutral-200 bg-white p-2 text-sm",
                "transition-colors duration-150",
                "dark:border-neutral-800 dark:bg-neutral-950",
              ].join(" ")
            : "group relative flex h-10 w-full items-center justify-center rounded-md text-sm transition-transform transition-shadow duration-150";
          const hover = [
            // Keep cell hover minimal; the primary affordance is the fading View button.
            "cursor-pointer",
            "hover:bg-neutral-50 dark:hover:bg-neutral-900",
            "active:bg-neutral-100 dark:active:bg-neutral-800",
          ].join(" ");
          const disabled = "opacity-40 cursor-not-allowed";

          const ringToday = isToday
            ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white dark:ring-neutral-50 dark:ring-offset-neutral-950"
            : "";
          const selected = isSelected
            ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-950"
            : "";

          const fullSelected = isSelected
            ? "ring-2 ring-neutral-900 ring-offset-2 ring-offset-white dark:ring-neutral-50 dark:ring-offset-neutral-950"
            : "";

          const fullToday =
            isToday && !isSelected ? "bg-neutral-50 dark:bg-neutral-900" : "";

          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              disabled={isDisabled}
              onClick={() => setSelectedDate(cell.date)}
              className={[
                base,
                !isDisabled ? hover : disabled,
                isFull ? "text-left" : "",
                isFull ? fullToday : "",
                isFull ? fullSelected : selected,
                !isFull ? ringToday : "",
                !cell.inMonth ? "text-neutral-500 dark:text-neutral-400" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={new Intl.DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(cell.date)}
              aria-selected={isSelected}
            >
              {isFull ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={[
                        "text-xs font-semibold",
                        cell.inMonth
                          ? "text-neutral-900 dark:text-neutral-50"
                          : "text-neutral-500 dark:text-neutral-400",
                      ].join(" ")}
                    >
                      {cell.date.getDate()}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1">
                      {renderDateIndicator ? (
                        <span className="pointer-events-none" aria-hidden="true">
                          {renderDateIndicator(cell.date)}
                        </span>
                      ) : null}
                      {hasEvent ? (
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full bg-neutral-900 dark:bg-neutral-50"
                        />
                      ) : null}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1">
                    {dayEvents.slice(0, 3).map((ev, index) => (
                      <div
                        key={`${key}-${index}`}
                        className={[
                          "truncate rounded-md px-2 py-1 text-xs font-semibold",
                          eventToneClasses(ev.color ?? "indigo"),
                        ].join(" ")}
                        title={ev.label ?? "Event"}
                      >
                        {ev.label ?? "Event"}
                      </div>
                    ))}
                    {dayEvents.length > 3 ? (
                      <div className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                        +{dayEvents.length - 3} more
                      </div>
                    ) : null}
                  </div>

                  {canView ? (
                    <div className="mt-auto pt-2">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDate?.(cell.date);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          e.stopPropagation();
                          onViewDate?.(cell.date);
                        }}
                        className={[
                          "inline-flex w-full items-center justify-center rounded-md border border-red-900/30 bg-transparent px-2 py-1 text-xs font-semibold text-red-950",
                          "opacity-0 transition-opacity duration-150 ease-out",
                          "group-hover:opacity-100",
                          "transition-colors",
                          "hover:bg-red-900 hover:text-white hover:border-red-900",
                          "active:bg-red-950",
                          "dark:text-red-50 dark:border-red-800/35",
                          "dark:hover:bg-red-800 dark:hover:border-red-800",
                          "dark:active:bg-red-900",
                        ].join(" ")}
                      >
                        View
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="leading-none">{cell.date.getDate()}</span>
                  {hasEvent ? (
                    <span
                      aria-hidden="true"
                      className={[
                        "absolute bottom-1 h-1 w-1 rounded-full",
                        isSelected
                          ? "bg-white dark:bg-neutral-950"
                          : "bg-neutral-900 dark:bg-neutral-50",
                      ].join(" ")}
                    />
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>

      {showSelectedDate ? (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-neutral-600 dark:text-neutral-300">
            Selected date
          </div>
          <div className="mt-1 font-semibold">{selectedLabel}</div>
        </div>
      ) : null}
    </section>
  );
}
