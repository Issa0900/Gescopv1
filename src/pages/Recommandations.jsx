import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import PriorityBadge from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Lightbulb, Check, X, ArrowRight } from "lucide-react";

export default function Recommandations() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: recs, isLoading } = useQuery({
    queryKey: ["recommendations-all"],
    queryFn: async () => {
      const list = await base44.entities.Recommendation.list("-created_date", 50);
      return list || [];
    },
  });

  const convertToTask = async (r) => {
    const catMap = {
      risk: "strategique",
      opportunity: "commercial",
      anomaly: "operationnel",
    };
    await base44.entities.Task.create({
      title: r.action || r.title,
      description: r.situation || r.title,
      category: catMap[r.source_type] || "strategique",
      priority: r.priority || "moyenne",
      status: "a_faire",
      recommendation_id: r.id,
    });
    await base44.entities.Recommendation.update(r.id, { status: "convertie" });
    qc.invalidateQueries(["recommendations-all"]);
    qc.invalidateQueries(["tasks"]);
    toast({ title: "Tâche créée" });
  };

  const reject = async (r) => {
    await base44.entities.Recommendation.update(r.id, { status: "rejetee" });
    qc.invalidateQueries(["recommendations-all"]);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const active = (recs || []).filter((r) => r.status === "nouvelle");
  const done = (recs || []).filter((r) => r.status !== "nouvelle");

  if (!recs || recs.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Aucune recommandation"
        description="Lancez l'analyse IA pour obtenir des recommandations d'action priorisées."
      />
    );
  }

  const blocks = [
    { key: "situation", label: "Situation", q: "Que se passe-t-il ?" },
    { key: "analysis", label: "Analyse", q: "Pourquoi ?" },
    { key: "impact", label: "Impact", q: "Quel effet possible ?" },
    { key: "action", label: "Action", q: "Que faire ?" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommandations</h1>
        <p className="mt-1 text-muted-foreground">
          Chaque recommandation est structurée: situation, analyse, impact, action et priorité.
        </p>
      </div>

      <div className="space-y-4">
        {active.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <PriorityBadge level={r.priority} />
                <span className="text-xs text-muted-foreground">
                  Source: {r.source_type === "risk" ? "Risque" : r.source_type === "opportunity" ? "Opportunité" : "Anomalie"}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold">{r.title}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {blocks.map((b) => (
                <div key={b.key} className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{b.label} — {b.q}</p>
                  <p className="mt-1 text-sm">{r[b.key] || "—"}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => convertToTask(r)}>
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Convertir en tâche
              </Button>
              <Button size="sm" variant="ghost" onClick={() => reject(r)}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Rejeter
              </Button>
            </div>
          </div>
        ))}
      </div>

      {done.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Traitées ({done.length})</h2>
          <div className="space-y-2">
            {done.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-sm">
                {r.status === "convertie" ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
                <span className="text-muted-foreground">{r.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}