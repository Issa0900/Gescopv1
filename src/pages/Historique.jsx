import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import { History as HistoryIcon, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const dimLabels = {
  finance: "Finance", ventes: "Ventes", tresorerie: "Trésorerie", clients: "Clients",
  operations: "Opérations", marketing: "Marketing", productivite: "Productivité",
  risques: "Risques", croissance: "Croissance",
};

export default function Historique() {
  const { data: runs, isLoading } = useQuery({
    queryKey: ["analysis-runs"],
    queryFn: async () => { const l = await base44.entities.AnalysisRun.list("-run_date", 50); return l || []; },
  });
  // Event (journal d'événements métier datés : promotion, rupture, incident...)
  // n'avait aucune page — importé, jamais montré. Il vit ici, dans la
  // chronologie de l'entreprise, à côté des analyses.
  const { data: events, isLoading: le } = useQuery({
    queryKey: ["events"],
    queryFn: async () => { const l = await base44.entities.Event.list("-date", 50); return l || []; },
  });

  if (isLoading || le) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  const hasRuns = runs && runs.length > 0;
  const hasEvents = events && events.length > 0;
  if (!hasRuns && !hasEvents) return <EmptyState icon={HistoryIcon} title="Aucun historique" description="Lancez votre première analyse ou importez un journal d'événements pour suivre l'évolution de votre entreprise dans le temps." />;
  if (!hasRuns) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Historique</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Aucune analyse enregistrée pour l'instant. Voici le journal d'événements importé.</p>
        </div>
        <EventsSection events={events} />
      </div>
    );
  }

  const chartData = runs.slice().reverse().map((r) => ({
    date: new Date(r.run_date).toLocaleDateString("fr-CA", { day: "numeric", month: "short" }),
    // null (pas 0) quand aucune dimension n'a ete mesuree : Recharts saute le
    // point au lieu de dessiner une chute a zero qui n'a jamais eu lieu.
    score: r.health_score,
  }));

  const latest = runs[0];
  const previous = runs[1];
  const comparisons = [];
  if (latest?.dimension_scores && previous?.dimension_scores) {
    Object.keys(dimLabels).forEach((key) => {
      const newDim = latest.dimension_scores[key];
      const oldDim = previous.dimension_scores[key];
      // Une dimension mesurée dans une analyse mais pas dans l'autre ne doit
      // jamais apparaître comme une chute (ou une hausse) : ce n'est pas une
      // évolution réelle, c'est juste une mesure qui a disparu ou est apparue.
      if (!newDim || !oldDim || newDim.measured === false || oldDim.measured === false) return;
      const diff = Math.round((newDim.score || 0) - (oldDim.score || 0));
      if (diff !== 0) comparisons.push({ key, label: dimLabels[key], diff });
    });
  }
  const improvements = comparisons.filter((c) => c.diff > 0).sort((a, b) => b.diff - a.diff);
  const declines = comparisons.filter((c) => c.diff < 0).sort((a, b) => a.diff - b.diff);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Historique des analyses</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{runs.length} analyses enregistrées. Suivez l'évolution de votre entreprise dans le temps.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Évolution du score de santé</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {previous && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Qu'est-ce qui a changé ?</h2>
          <p className="mb-4 text-xs text-muted-foreground">Comparaison avec l'analyse du {new Date(previous.run_date).toLocaleDateString("fr-CA")}</p>
          {comparisons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun changement significatif depuis la dernière analyse.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {improvements.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" /> Améliorations</p>
                  <div className="space-y-1.5">
                    {improvements.map((c) => (
                      <div key={c.key} className="flex items-center justify-between rounded-lg bg-emerald-50/50 px-3 py-2 text-sm">
                        <span>{c.label}</span><span className="font-bold text-emerald-600">+{c.diff} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {declines.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-red-600"><TrendingDown className="h-3.5 w-3.5" /> Dégradations</p>
                  <div className="space-y-1.5">
                    {declines.map((c) => (
                      <div key={c.key} className="flex items-center justify-between rounded-lg bg-red-50/50 px-3 py-2 text-sm">
                        <span>{c.label}</span><span className="font-bold text-red-600">{c.diff} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Toutes les analyses</h2>
        <div className="space-y-2">
          {runs.map((r, i) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold", r.health_score == null ? "bg-slate-100 text-slate-500" : r.health_score >= 75 ? "bg-emerald-50 text-emerald-700" : r.health_score >= 50 ? "bg-orange-50 text-orange-700" : "bg-red-50 text-red-700")} title={r.health_score == null ? "Aucune dimension n'a pu être mesurée lors de cette analyse" : undefined}>
                  {r.health_score == null ? "N/A" : r.health_score}
                </div>
                <div>
                  <p className="text-sm font-medium">Analyse du {new Date(r.run_date).toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" })}</p>
                  <p className="text-xs text-muted-foreground">{r.counts ? `${(r.counts.anomalies || 0) + (r.counts.risks || 0)} problèmes · ${r.counts.opportunities || 0} opportunités · ${r.counts.recommendations || 0} recommandations` : ""}</p>
                </div>
              </div>
              {i === 0 && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Dernière</span>}
            </div>
          ))}
        </div>
      </div>

      {hasEvents && <EventsSection events={events} />}
    </div>
  );
}

function EventsSection({ events }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Journal des événements ({events.length})</h2>
      <div className="space-y-2">
        {events.map((e) => (
          <div key={e.id} className="flex items-start justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-sm font-medium">{e.event_type}{e.impact_area ? ` · ${e.impact_area}` : ""}</p>
              {e.description && <p className="mt-0.5 text-xs text-muted-foreground">{e.description}</p>}
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground">{e.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}