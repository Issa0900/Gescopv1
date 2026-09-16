import React from "react";
import { TrendingUp, TrendingDown, Minus, ArrowRight, Sparkles, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatValue(value, unit) {
  if (value === null || value === undefined) return "-";
  const num = Number(value) || 0;
  if (unit === "$") {
    return num.toLocaleString("fr-CA", { maximumFractionDigits: 0 }) + " $";
  }
  if (unit === "%") {
    return num + " %";
  }
  return num.toLocaleString("fr-CA", { maximumFractionDigits: 2 });
}

function TrendIcon({ trend }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5" />;
  return <Minus className="h-3.5 w-3.5" />;
}

function trendClasses(trend) {
  if (trend === "up") return "text-emerald-600 bg-emerald-50";
  if (trend === "down") return "text-red-600 bg-red-50";
  return "text-muted-foreground bg-muted";
}

function deltaLabel(metric) {
  const sign = metric.delta > 0 ? "+" : "";
  const deltaStr = metric.unit === "$"
    ? `${sign}${Math.abs(metric.delta).toLocaleString("fr-CA", { maximumFractionDigits: 0 })} $`
    : `${sign}${metric.delta}${metric.unit}`;
  const pctStr = metric.deltaPct > 0 ? `+${metric.deltaPct}%` : `${metric.deltaPct}%`;
  return `${deltaStr} (${pctStr})`;
}

export default function ReportComparison({ comparison }) {
  if (!comparison || !comparison.metrics || comparison.metrics.length === 0) return null;

  const { metrics, currentLabel, previousLabel, evolutionSummary, keyInsights } = comparison;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border bg-muted/40 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-tight text-foreground">Comparaison période contre période</h3>
          <p className="text-xs text-muted-foreground">Évolution des indicateurs clés</p>
        </div>
      </div>

      {/* Period labels */}
      <div className="flex items-center justify-center gap-3 border-b border-border bg-muted/20 px-5 py-2.5 text-xs">
        <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">{currentLabel}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">vs {previousLabel}</span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(odd)]:border-r sm:[&>*]:border-border">
        {metrics.map((m) => {
          const hasPrevious = m.previous !== 0 || m.current !== 0;
          return (
            <div key={m.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-muted-foreground">{m.label}</p>
                <p className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
                  {formatValue(m.current, m.unit)}
                </p>
              </div>
              {hasPrevious && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    préc. {formatValue(m.previous, m.unit)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                      trendClasses(m.trend)
                    )}
                  >
                    <TrendIcon trend={m.trend} />
                    {deltaLabel(m)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Evolution summary */}
      {evolutionSummary && (
        <div className="border-t border-border bg-primary/5 px-5 py-4">
          <div className="flex gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Analyse de l'évolution</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{evolutionSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key insights */}
      {keyInsights && keyInsights.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Points marquants</p>
          <ul className="space-y-1.5">
            {keyInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}