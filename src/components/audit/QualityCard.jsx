import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";

const config = {
  ok: { Icon: CheckCircle2, cls: "text-emerald-600" },
  warn: { Icon: AlertTriangle, cls: "text-amber-600" },
  error: { Icon: XCircle, cls: "text-red-600" },
  skip: { Icon: MinusCircle, cls: "text-muted-foreground" },
};

export default function QualityCard({ set }) {
  const { Icon, cls } = config[set.status] || config.skip;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${cls}`} />
          <span className="text-sm font-semibold">{set.name}</span>
        </div>
        <span className="text-xs text-muted-foreground">{set.rows} lignes</span>
      </div>
      {set.coverage && <p className="mt-2 text-xs text-muted-foreground">Couverture : {set.coverage}</p>}
      {set.partialMonth && (
        <p className="mt-1 text-xs text-amber-600">
          Mois en cours ({set.partialMonth}) présent — exclu des comparaisons
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {set.issues.map((i) => (
          <li key={i} className="text-xs text-muted-foreground">• {i}</li>
        ))}
      </ul>
    </div>
  );
}