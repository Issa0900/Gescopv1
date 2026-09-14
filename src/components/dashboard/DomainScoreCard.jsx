import React from "react";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const dimLabels = {
  finance: "Finance", ventes: "Ventes", tresorerie: "Trésorerie", clients: "Clients",
  operations: "Opérations", marketing: "Marketing",
};

const trendConfig = {
  up: { icon: TrendingUp, color: "text-emerald-600", prefix: "+" },
  down: { icon: TrendingDown, color: "text-red-600", prefix: "" },
  stable: { icon: Minus, color: "text-muted-foreground", prefix: "" },
};

function scoreColor(score) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 55) return "text-blue-600";
  if (score >= 35) return "text-orange-600";
  return "text-red-600";
}

export default function DomainScoreCard({ domainKey, score, trend, trendDelta, problem, onAnalyze }) {
  const tc = trendConfig[trend] || trendConfig.stable;
  const TIcon = tc.icon;
  const label = dimLabels[domainKey] || domainKey;

  return (
    <div className="animate-slide-up rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className={cn("text-2xl font-bold", scoreColor(score || 0))}>{Math.round(score || 0)}<span className="text-sm font-medium text-muted-foreground">/100</span></p>
        <span className={cn("flex items-center gap-0.5 text-xs font-semibold", tc.color)}>
          <TIcon className="h-3 w-3" />
          {trend === "stable" ? "stable" : trendDelta ? `${tc.prefix}${Math.abs(trendDelta)}` : trend === "up" ? "en hausse" : "en baisse"}
        </span>
      </div>
      {problem && (
        <p className="mt-2 line-clamp-2 text-xs leading-snug text-muted-foreground">{problem}</p>
      )}
      {onAnalyze && (
        <button onClick={onAnalyze} className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Analyser <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}