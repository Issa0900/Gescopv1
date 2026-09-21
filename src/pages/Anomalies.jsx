import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import PriorityBadge from "@/components/PriorityBadge";
import { AlertTriangle, CheckCircle2, Plus, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Anomalies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ["anomalies"],
    queryFn: async () => {
      const list = await base44.entities.Anomaly.list("-created_date", 50);
      return list || [];
    },
  });

  const markResolved = async (id) => {
    await base44.entities.Anomaly.update(id, { status: "resolu" });
    qc.invalidateQueries({ queryKey: ["anomalies"] });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const active = (anomalies || []).filter((a) => a.status !== "resolu");
  const resolved = (anomalies || []).filter((a) => a.status === "resolu");

  if (!anomalies || anomalies.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Aucune anomalie détectée"
        description="Lancez l'analyse IA depuis le tableau de bord pour détecter les écarts par rapport à la normale."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Anomalies détectées</h1>
        <p className="mt-1 text-muted-foreground">
          Écarts par rapport à l'historique, la saisonnalité et les tendances.
        </p>
      </div>

      <div className="space-y-3">
        {active.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <PriorityBadge level={a.severity} />
                  {a.dimension && <span className="text-xs text-muted-foreground">{a.dimension}</span>}
                  {a.deviation_pct ? (
                    <span className="text-xs font-medium text-orange-600">{a.deviation_pct > 0 ? "+" : ""}{a.deviation_pct}%</span>
                  ) : null}
                </div>
                <h3 className="mt-2 font-semibold">{a.title}</h3>
                {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}
                {a.explanation && (
                  <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Explication</p>
                    <p className="mt-1">{a.explanation}</p>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  onClick={async () => {
                    try {
                      await base44.entities.Task.create({
                        title: `Investiguer: ${a.title}`,
                        description: a.explanation || a.description || "Anomalie IA",
                        category: "strategique",
                        priority: a.severity === "critique" ? "urgente" : "elevee",
                        status: "a_faire",
                      });
                      toast({ title: "Action créée", description: "Tâche ajoutée pour investigation." });
                      qc.invalidateQueries({ queryKey: ["tasks"] });
                    } catch(e) {
                      toast({ title: "Erreur", variant: "destructive" });
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  aria-label="Créer une tâche"
                >
                  <Plus className="h-3.5 w-3.5" /> Tâche
                </button>
                <button
                  onClick={() => markResolved(a.id)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Résolues ({resolved.length})</h2>
          <div className="space-y-2">
            {resolved.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}