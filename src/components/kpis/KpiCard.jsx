import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };

export default function KpiCard({ kpi, domainColor }) {
  const TIcon = trendIcon[kpi.trend] || Minus;
  const trendColor = kpi.trend === "up" ? "text-emerald-600" : kpi.trend === "down" ? "text-red-600" : "text-muted-foreground";
  const numeric = typeof kpi.value === "number" && Number.isFinite(kpi.value);
  const pct = kpi.target > 0 && numeric ? Math.round((kpi.value / kpi.target) * 100) : null;
  // An indicator that is ITSELF a percentage (margin, churn, conversion) moves
  // in POINTS. Showing "+100%" for a margin going from 2% to 4% overstated a
  // two-point move as a doubling.
  const isPctUnit = (kpi.unit || "").trim() === "%";
  const prevDelta = numeric && kpi.previous != null && kpi.previous !== 0 && !isPctUnit
    ? ((kpi.value - kpi.previous) / Math.abs(kpi.previous)) * 100
    : null;
  const pointDelta = numeric && kpi.previous != null && isPctUnit
    ? kpi.value - kpi.previous
    : null;

  return (
    <div className="animate-slide-up rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{kpi.name}</p>
        <TIcon className={`h-4 w-4 ${trendColor}`} />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">
        {kpi.value != null ? (numeric ? kpi.value.toLocaleString("fr-CA") : String(kpi.value)) : "—"}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{kpi.unit || ""}</span>
      </p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        {pointDelta != null ? (
          <span className={pointDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
            {pointDelta >= 0 ? "+" : ""}{Math.round(pointDelta * 10) / 10} pt vs période précédente
          </span>
        ) : prevDelta != null ? (
          <span className={prevDelta >= 0 ? "text-emerald-600" : "text-red-600"}>
            {prevDelta >= 0 ? "+" : ""}{Math.round(prevDelta)}% vs période précédente
          </span>
        ) : kpi.target > 0 ? (
          <span>Cible: {kpi.target.toLocaleString("fr-CA")} {kpi.unit || ""}</span>
        ) : (
          <span>&nbsp;</span>
        )}
        {pct != null && <span>{pct}% de l'objectif</span>}
      </div>
      {pct != null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: domainColor || "#2563eb" }}
          />
        </div>
      )}
    </div>
  );
}