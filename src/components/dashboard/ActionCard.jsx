import React from "react";
import { Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const priorityStyles = {
  urgente: "bg-red-50 text-red-700",
  elevee: "bg-orange-50 text-orange-700",
  moyenne: "bg-amber-50 text-amber-700",
  faible: "bg-muted text-muted-foreground",
};
const priorityLabels = { urgente: "Priorité urgente", elevee: "Priorité élevée", moyenne: "Priorité moyenne", faible: "Priorité faible" };

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.impact]
 * @param {string} [props.timeEstimate]
 * @param {string} [props.priority]
 * @param {() => void} [props.onExamine]
 * @param {() => void} [props.onApprove]
 */
export default function ActionCard({ title, impact, timeEstimate, priority, onExamine, onApprove }) {
  return (
    <div className="animate-slide-up flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      {priority && (
        <span className={cn("mb-3 w-fit rounded px-2 py-0.5 text-xs font-semibold", priorityStyles[priority] || priorityStyles.faible)}>
          {priorityLabels[priority] || priority}
        </span>
      )}
      <p className="text-sm font-semibold leading-snug">{title}</p>
      {impact && (
        <div className="mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Impact potentiel</p>
          <p className="text-sm font-bold text-emerald-600">{impact}</p>
        </div>
      )}
      {timeEstimate && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Temps estimé : {timeEstimate}
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onExamine && (
          <Button size="sm" variant="outline" onClick={onExamine}>Examiner</Button>
        )}
        {onApprove && (
          <Button size="sm" onClick={onApprove}>
            <Check className="mr-1 h-3 w-3" /> Approuver
          </Button>
        )}
      </div>
    </div>
  );
}