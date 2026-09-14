import React from "react";
import HealthGauge from "@/components/HealthGauge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const dimLabels = {
  finance: "Finance", ventes: "Ventes", tresorerie: "Trésorerie", clients: "Clients",
  operations: "Opérations", marketing: "Marketing",
};

function dimStatus(score) {
  if (score >= 75) return { label: "Bon", color: "text-emerald-600" };
  if (score >= 55) return { label: "Stable", color: "text-blue-600" };
  if (score >= 35) return { label: "Attention", color: "text-orange-600" };
  return { label: "Critique", color: "text-red-600" };
}

const trendIcons = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColors = { up: "text-emerald-600", down: "text-red-600", stable: "text-muted-foreground" };

export default function HealthHero({ score, dimensions, summary, trend, onDomainClick }) {
  const dimMap = {};
  (dimensions || []).forEach((d) => { dimMap[d.key] = d; });
  const topKeys = ["finance", "ventes", "tresorerie", "operations"];

  const healthLabel = score >= 75 ? "Bonne performance" : score >= 50 ? "Sous surveillance" : "Attention requise";
  const healthColor = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-orange-600" : "text-red-600";

  return (
    <div className="animate-slide-up rounded-2xl border border-border bg-card p-6 md:p-8">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Santé de l'entreprise</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_1fr] lg:gap-8">
        <div className="flex flex-col items-center justify-center">
          <HealthGauge score={score || 0} size={160} label={null} />
          <p className={cn("mt-3 text-sm font-semibold", healthColor)}>{healthLabel}</p>
          {trend && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {trend.direction === "up" && <TrendingUp className="h-3 w-3 text-emerald-600" />}
              {trend.direction === "down" && <TrendingDown className="h-3 w-3 text-red-600" />}
              {trend.direction === "stable" && <Minus className="h-3 w-3" />}
              {trend.text}
            </p>
          )}
        </div>
        <div className="flex flex-col justify-between gap-4">
          {summary && (
            <p className="text-sm leading-relaxed text-foreground">{summary}</p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {topKeys.map((key) => {
              const d = dimMap[key] || { key, score: 0, trend: "stable" };
              const st = dimStatus(d.score || 0);
              const TIcon = trendIcons[d.trend] || Minus;
              return (
                <button
                  key={key}
                  onClick={() => onDomainClick && onDomainClick(key)}
                  className="group rounded-xl border border-border p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <p className="text-xs font-medium text-muted-foreground">{dimLabels[key]}</p>
                  {d.measured === false ? (
                    <>
                      <p className="mt-1 text-xl font-bold text-muted-foreground">—</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">Non mesuré</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xl font-bold">{Math.round(d.score || 0)}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <TIcon className={cn("h-3 w-3", trendColors[d.trend] || "")} />
                        <span className={cn("text-xs font-medium", st.color)}>{st.label}</span>
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}