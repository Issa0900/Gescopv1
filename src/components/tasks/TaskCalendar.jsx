import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import PriorityBadge from "@/components/PriorityBadge";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const priorityDot = {
  urgente: "bg-red-500",
  elevee: "bg-orange-500",
  moyenne: "bg-blue-500",
  faible: "bg-slate-400",
};

export default function TaskCalendar({ tasks, onToggle }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const tasksByDate = useMemo(() => {
    const map = {};
    (tasks || []).forEach((t) => {
      if (!t.due_date) return;
      if (!map[t.due_date]) map[t.due_date] = [];
      map[t.due_date].push(t);
    });
    return map;
  }, [tasks]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const days = [];
    // Previous month padding
    for (let i = startOffset; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, inMonth: false });
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), inMonth: true });
    }
    // Next month padding to fill 6 rows (42 cells)
    while (days.length % 7 !== 0) {
      const next = new Date(days[days.length - 1].date);
      next.setDate(next.getDate() + 1);
      days.push({ date: next, inMonth: false });
    }
    return days;
  }, [viewDate]);

  const fmtKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isToday = (d) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  };

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // Tasks without due dates
  const noDateTasks = (tasks || []).filter((t) => !t.due_date && t.status !== "terminee" && t.status !== "annulee");

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="text-lg font-semibold">
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="rounded-lg px-3 py-1 text-sm font-medium hover:bg-muted">
            Aujourd'hui
          </button>
          <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((cell, i) => {
          const key = fmtKey(cell.date);
          const dayTasks = tasksByDate[key] || [];
          return (
            <div
              key={i}
              className={cn(
                "min-h-[88px] border-b border-r border-border p-1.5",
                !cell.inMonth && "bg-muted/30",
                (i + 1) % 7 === 0 && "border-r-0"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    !cell.inMonth && "text-muted-foreground/50",
                    isToday(cell.date) && "bg-primary text-primary-foreground font-semibold",
                    !isToday(cell.date) && cell.inMonth && "text-foreground"
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">{dayTasks.length}</span>
                )}
              </div>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onToggle(t)}
                    className={cn(
                      "flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent",
                      t.status === "terminee" && "opacity-50"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", priorityDot[t.priority] || priorityDot.faible)} />
                    <span className={cn("truncate", t.status === "terminee" && "line-through")}>{t.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="px-1.5 text-xs text-muted-foreground">+{dayTasks.length - 3} autres</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tasks without due date */}
      {noDateTasks.length > 0 && (
        <div className="border-t border-border p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sans échéance ({noDateTasks.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {noDateTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => onToggle(t)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs hover:bg-accent"
              >
                <Circle className="h-3 w-3 text-muted-foreground" />
                <span>{t.title}</span>
                <PriorityBadge level={t.priority} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}