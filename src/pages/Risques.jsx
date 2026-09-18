import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import PriorityBadge from "@/components/PriorityBadge";
import { ShieldAlert, Lightbulb, ArrowRight } from "lucide-react";

export default function Risques() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("risques");

  const { data: risks } = useQuery({
    queryKey: ["risks-all"],
    queryFn: async () => {
      const list = await base44.entities.Risk.list("-score", 50);
      return (list || []).sort((a, b) => (b.score || 0) - (a.score || 0));
    },
  });

  const { data: opportunities } = useQuery({
    queryKey: ["opportunities-all"],
    queryFn: async () => {
      const list = await base44.entities.Opportunity.list("-score", 50);
      return (list || []).sort((a, b) => (b.score || 0) - (a.score || 0));
    },
  });

  const convertToTask = async (item, type) => {
    const title = type === "risk" ? `Mitiguer: ${item.title}` : `Saisir: ${item.title}`;
    await base44.entities.Task.create({
      title,
      description: item.description || "",
      category: type === "risk" ? "strategique" : "commercial",
      priority: (item.score || 0) >= 75 ? "urgente" : "elevee",
      status: "a_faire",
    });
    if (type === "risk") {
      await base44.entities.Risk.update(item.id, { status: "attenuation" });
      qc.invalidateQueries({ queryKey: ["risks-all"] });
    } else {
      await base44.entities.Opportunity.update(item.id, { status: "en_cours" });
      qc.invalidateQueries({ queryKey: ["opportunities-all"] });
    }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  };

  const scoreColor = (score) =>
    score >= 75 ? "text-red-600" : score >= 50 ? "text-orange-600" : "text-amber-600";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risques & Opportunités</h1>
        <p className="mt-1 text-muted-foreground">
          Chaque signal reçoit un score combinant probabilité, impact, urgence et confiance.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setTab("risques")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "risques" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> Risques ({(risks || []).length})
        </button>
        <button
          onClick={() => setTab("opportunites")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "opportunites" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Lightbulb className="h-4 w-4" /> Opportunités ({(opportunities || []).length})
        </button>
      </div>

      {tab === "risques" && (
        <div className="space-y-3">
          {!risks || risks.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="Aucun risque détecté" description="Lancez l'analyse IA pour détecter les risques." />
          ) : (
            risks.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${scoreColor(r.score || 0)}`}>{r.score || 0}</span>
                      <div>
                        <h3 className="font-semibold">{r.title}</h3>
                        {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
                      </div>
                    </div>
                    {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PriorityBadge level={r.impact} />
                      <PriorityBadge level={r.urgency} />
                      <PriorityBadge level={r.confidence} />
                      {r.probability && <span className="text-xs text-muted-foreground">Probabilité: {r.probability}%</span>}
                      {r.horizon && <span className="text-xs text-muted-foreground">Horizon: {r.horizon}</span>}
                    </div>
                  </div>
                  {r.status === "actif" && (
                    <button
                      onClick={() => convertToTask(r, "risk")}
                      className="shrink-0 flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Tâche
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "opportunites" && (
        <div className="space-y-3">
          {!opportunities || opportunities.length === 0 ? (
            <EmptyState icon={Lightbulb} title="Aucune opportunité détectée" description="Lancez l'analyse IA pour détecter les opportunités." />
          ) : (
            opportunities.map((o) => (
              <div key={o.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${scoreColor(o.score || 0)}`}>{o.score || 0}</span>
                      <div>
                        <h3 className="font-semibold">{o.title}</h3>
                        {o.category && <p className="text-xs text-muted-foreground">{o.category}</p>}
                      </div>
                    </div>
                    {o.description && <p className="mt-2 text-sm text-muted-foreground">{o.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PriorityBadge level={o.potential} />
                      <PriorityBadge level={o.confidence} />
                      {o.probability && <span className="text-xs text-muted-foreground">Probabilité: {o.probability}%</span>}
                      {o.horizon && <span className="text-xs text-muted-foreground">Horizon: {o.horizon}</span>}
                    </div>
                  </div>
                  {o.status === "nouvelle" && (
                    <button
                      onClick={() => convertToTask(o, "opportunity")}
                      className="shrink-0 flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Saisir
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}