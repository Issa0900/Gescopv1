import React from "react";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const impactIcon = { positif: TrendingUp, negatif: TrendingDown, neutre: Minus };
const impactColor = { positif: "text-emerald-600", negatif: "text-red-600", neutre: "text-muted-foreground" };

export default function SignalCard({ signal, prominent = false }) {
  const IIcon = impactIcon[signal.impact] || Minus;
  return (
    <div className={cn("rounded-xl border bg-card p-5", prominent ? "border-primary/30 shadow-sm" : "border-border")}>
      <div className="flex items-start gap-2">
        <IIcon className={cn("h-4 w-4 shrink-0 mt-0.5", impactColor[signal.impact] || "")} />
        <div className="flex-1">
          <h3 className="text-sm font-semibold leading-tight">{signal.title}</h3>
          {signal.description && <p className="mt-1 text-xs text-muted-foreground">{signal.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{signal.relevance_score || 0}/100</span>
      </div>

      {signal.relevance_reason && (
        <div className="mt-3 rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pourquoi cela vous concerne</p>
          <p className="mt-1 text-xs leading-relaxed">{signal.relevance_reason}</p>
        </div>
      )}

      {signal.recommended_action && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Action recommandée</p>
          <p className="mt-0.5 text-xs">{signal.recommended_action}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        {signal.source && (
          signal.url
            ? <a href={signal.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{signal.source}</a>
            : <span>{signal.source}</span>
        )}
        {signal.date && <span>· {signal.date}</span>}
        {signal.url && <a href={signal.url} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-0.5 text-primary hover:underline">Consulter la source <ExternalLink className="h-3 w-3" /></a>}
      </div>
    </div>
  );
}