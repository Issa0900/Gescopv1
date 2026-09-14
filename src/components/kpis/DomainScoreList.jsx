import React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

const statusOf = (score) =>
  score >= 75
    ? { label: "Bon", text: "text-emerald-700", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" }
    : score >= 55
      ? { label: "Stable", text: "text-blue-700", bar: "bg-blue-500", chip: "bg-blue-50 text-blue-700" }
      : score >= 35
        ? { label: "Attention", text: "text-orange-700", bar: "bg-orange-500", chip: "bg-orange-50 text-orange-700" }
        : { label: "Critique", text: "text-red-700", bar: "bg-red-500", chip: "bg-red-50 text-red-700" };

const TrendIcon = ({ trend }) => {
  const Icon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const color = trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground";
  return <Icon className={`h-3.5 w-3.5 ${color}`} />;
};

export default function DomainScoreList({ domains }) {
  if (!domains || domains.length === 0) return null;
  // Les domaines sans donnee passent en fin de liste : les classer par un score
  // de repli les ferait passer pour les plus faibles.
  const sorted = [...domains].sort((a, b) => {
    if ((a.measured === false) !== (b.measured === false)) return a.measured === false ? 1 : -1;
    return a.score - b.score;
  });

  return (
    <div className="animate-slide-up divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {sorted.map((d) => {
        const s = statusOf(d.score);
        return (
          <div key={d.key} className="flex items-center gap-4 px-4 py-3">
            <span className="w-24 shrink-0 text-sm font-medium">{d.label}</span>

            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${s.bar} transition-all duration-500`} style={{ width: d.measured === false ? "0%" : `${Math.max(2, Math.min(100, d.score))}%` }} />
              </div>
              {d.explanation && <p className="mt-1.5 truncate text-xs text-muted-foreground">{d.explanation}</p>}
            </div>

            <div className="flex w-32 shrink-0 items-center justify-end gap-2">
              {d.measured === false ? (
                <>
                  <span className="text-lg font-bold tabular-nums text-muted-foreground">—</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Non mesuré</span>
                </>
              ) : (
                <>
                  <TrendIcon trend={d.trend} />
                  <span className={`text-lg font-bold tabular-nums ${s.text}`}>{d.score}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.chip}`}>{s.label}</span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}