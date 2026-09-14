import React from "react";

export default function ForecastCard({ label, current, f30, f90 }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Aujourd'hui</span>
          <span className="text-lg font-bold">{current}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">+30 jours</span>
          <span className="text-sm font-semibold">{f30}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">+90 jours</span>
          <span className="text-sm font-semibold">{f90}</span>
        </div>
      </div>
    </div>
  );
}