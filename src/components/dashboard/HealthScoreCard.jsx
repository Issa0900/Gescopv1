import React, { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from "lucide-react";
import HealthGauge from "@/components/HealthGauge";
import { cn } from "@/lib/utils";

const trendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };
const trendColor = { up: "text-emerald-600", down: "text-red-600", stable: "text-muted-foreground" };
const dimLabels = {
  finance: "Finance", ventes: "Ventes", tresorerie: "Trésorerie", clients: "Clients",
  operations: "Opérations", marketing: "Marketing", productivite: "Productivité",
  risques: "Risques", croissance: "Croissance",
};

export default function HealthScoreCard({ score, dimensions, lastAnalysisDate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6">
      <HealthGauge score={score || 0} size={140} label="Santé entreprise" />
      {lastAnalysisDate && (
        <p className="mt-2 text-xs text-muted-foreground">
          Analysé le {new Date(lastAnalysisDate).toLocaleDateString("fr-CA")}
        </p>
      )}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Pourquoi ce score ?
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-4 w-full space-y-2">
          {dimensions.map((d) => {
            const TIcon = trendIcon[d.trend] || Minus;
            return (
              <div key={d.key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{dimLabels[d.key] || d.key}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{Math.round(d.score || 0)}</span>
                  <TIcon className={cn("h-3 w-3", trendColor[d.trend] || "")} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}