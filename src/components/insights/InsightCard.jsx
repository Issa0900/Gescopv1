import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const typeStyles = {
  anomalie: "bg-red-50 text-red-700 border-red-200",
  risque: "bg-orange-50 text-orange-700 border-orange-200",
  opportunite: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recommandation: "bg-blue-50 text-blue-700 border-blue-200",
};

const confidenceColor = (pct) => (pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-orange-500" : "text-red-600");

export default function InsightCard({ type, typeLabel, fait, analyse, impactLabel, confiance, recommandation, preuves, onCreateAction }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", typeStyles[type] || typeStyles.recommandation)}>
          {typeLabel}
        </span>
        {impactLabel && <span className="text-sm font-bold text-foreground">{impactLabel}</span>}
      </div>

      <p className="text-sm font-semibold leading-tight">{fait}</p>
      {analyse && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{analyse}</p>}

      {preuves && preuves.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/10 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70"></span>
            Preuves (Observations)
          </p>
          <ul className="space-y-1.5">
            {preuves.map((p, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-primary/70 mt-0.5">•</span>
                <span>
                  <span className="font-medium text-foreground">{p.concept}</span>
                  {p.value !== undefined ? ` : ${p.value} ${p.unit || ''}` : ''}
                  {p.text ? ` - ${p.text}` : ''}
                  <span className="ml-1 opacity-70">({p.observation_type})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommandation && (
        <div className="mt-3 rounded-lg bg-muted/30 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommandation</p>
          <p className="mt-1 text-xs leading-relaxed">{recommandation}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        {confiance > 0 ? (
          <span className={cn("text-xs font-medium", confidenceColor(confiance))}>Confiance {confiance}%</span>
        ) : (
          <span />
        )}
        {onCreateAction && (
          <Button size="sm" variant="outline" onClick={onCreateAction}>
            Créer une action <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}