import React from "react";

const badges = [
  { label: "Bon", range: "75 – 100", cls: "bg-emerald-50 text-emerald-700" },
  { label: "Stable", range: "55 – 74", cls: "bg-blue-50 text-blue-700" },
  { label: "Attention", range: "35 – 54", cls: "bg-amber-50 text-amber-700" },
  { label: "Critique", range: "0 – 34", cls: "bg-red-50 text-red-700" },
];

export default function DomainScoreLegend() {
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">Le score</span> mesure le niveau actuel du
        domaine sur les 3 derniers mois complets (marge pour la finance, autonomie pour la trésorerie,
        évolution du CA pour les ventes, ROAS pour le marketing, ruptures et stock dormant pour les
        opérations, taux de churn pour les clients).
      </p>
      <p className="mt-2">
        <span className="font-semibold text-foreground">La flèche</span> indique la direction par rapport
        à la période précédente - elle est indépendante du score. Un domaine peut donc être « Bon » et en
        baisse, ou « Attention » et en progression.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((b) => (
          <span key={b.label} className={`rounded-full px-2.5 py-1 font-medium ${b.cls}`}>
            {b.label} · {b.range}
          </span>
        ))}
      </div>
    </div>
  );
}