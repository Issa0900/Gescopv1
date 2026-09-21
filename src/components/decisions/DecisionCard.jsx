import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const statusStyles = {
  a_decider: "border-border",
  decidee: "border-blue-200 bg-blue-50/30",
  resultats: "border-emerald-200 bg-emerald-50/30",
};

const fmt = (v) => (v != null ? `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("fr-CA")} $` : "-");

/**
 * @param {Object} props
 * @param {Object} props.decision
 * @param {() => void} [props.onDecide]
 * @param {() => void} [props.onAddResult]
 * @param {boolean} [props.editing]
 * @param {string|number} [props.resultValue]
 * @param {(v: string) => void} [props.setResultValue]
 * @param {() => void} [props.submitResult]
 */
export default function DecisionCard({ decision, onDecide, onAddResult, editing, resultValue, setResultValue, submitResult }) {
  const perf = decision.actual_impact != null && decision.predicted_impact
    ? Math.round((decision.actual_impact / decision.predicted_impact) * 100) : null;

  return (
    <div className={cn("rounded-xl border bg-card p-5", statusStyles[decision.status] || statusStyles.a_decider)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">{decision.title}</p>
          {decision.description && <p className="mt-1 text-xs text-muted-foreground">{decision.description}</p>}
        </div>
        {decision.confidence_pct > 0 && <span className="shrink-0 text-xs text-muted-foreground">Confiance {decision.confidence_pct}%</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <div><span className="text-muted-foreground">Prévision: </span><span className="font-semibold">{fmt(decision.predicted_impact)}</span></div>
        {decision.status === "resultats" && <>
          <div><span className="text-muted-foreground">Résultat: </span><span className="font-semibold">{fmt(decision.actual_impact)}</span></div>
          {perf != null && <div><span className="text-muted-foreground">Performance: </span><span className={cn("font-semibold", perf >= 100 ? "text-emerald-600" : "text-orange-600")}>{perf}%</span></div>}
        </>}
        {decision.decision_date && <div className="text-muted-foreground">Décidé le {decision.decision_date}</div>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {decision.status === "a_decider" && onDecide && <Button size="sm" onClick={onDecide}>Décider</Button>}
        {decision.status === "decidee" && onAddResult && <Button size="sm" variant="outline" onClick={onAddResult}>Ajouter résultats</Button>}
        {editing && (
          <div className="flex items-center gap-2">
            <input type="number" placeholder="Impact réel ($)" value={resultValue} onChange={(e) => setResultValue(e.target.value)} className="w-32 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary" />
            <Button size="sm" onClick={submitResult}>Enregistrer</Button>
          </div>
        )}
      </div>
    </div>
  );
}