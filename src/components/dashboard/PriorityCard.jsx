import React, { useState } from "react";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const urgencyStyles = {
  urgente: "bg-red-50 text-red-700",
  elevee: "bg-orange-50 text-orange-700",
  moyenne: "bg-amber-50 text-amber-700",
  faible: "bg-muted text-muted-foreground",
};
const urgencyLabels = { urgente: "Urgent", elevee: "Élevée", moyenne: "Moyenne", faible: "Faible" };

const confidenceColor = (pct) => (pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-orange-500" : "text-red-600");

export default function PriorityCard({ number, title, action, impact, priority, confidencePct, onAct }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {number}
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{title}</p>
          {impact && <p className="mt-1 text-sm font-bold text-primary">{impact}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {priority && (
              <span className={cn("rounded px-2 py-0.5 text-xs font-medium", urgencyStyles[priority] || urgencyStyles.faible)}>
                {urgencyLabels[priority] || priority}
              </span>
            )}
            {confidencePct > 0 && (
              <span className={cn("text-xs font-medium", confidenceColor(confidencePct))}>Confiance {confidencePct}%</span>
            )}
          </div>
        </div>
      </div>
      {action && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline">
            {expanded ? "Masquer" : "Comprendre"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expanded && <p className="mt-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">{action}</p>}
        </>
      )}
      {onAct && (
        <Button size="sm" variant="outline" className="mt-3 self-start" onClick={onAct}>
          Agir <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}