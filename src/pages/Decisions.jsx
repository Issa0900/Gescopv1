import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DecisionCard from "@/components/decisions/DecisionCard";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import DataTable from "@/components/ui/DataTable";
import BadgeStatus from "@/components/ui/BadgeStatus";
import { formatNumber } from "@/lib/utils";
import { Target, Plus, X } from "lucide-react";

const goalColumns = [
  { key: "metric", header: "Métrique", searchValue: (g) => g.metric || "", sortValue: (g) => g.metric || "" },
  { key: "domain", header: "Domaine", render: (g) => g.domain || "-" },
  { key: "period", header: "Période", render: (g) => g.period || "-" },
  { key: "target", header: "Cible", align: "right", sortValue: (g) => Number(g.target) || 0, render: (g) => g.target != null ? formatNumber(g.target) : "-" },
  { key: "current", header: "Actuel", align: "right", sortValue: (g) => Number(g.current) || 0, render: (g) => g.current != null ? formatNumber(g.current) : "-" },
  {
    key: "status",
    header: "Statut",
    sortValue: (g) => g.status || "",
    render: (g) => (
      <BadgeStatus status={g.status === "atteint" || g.status === "depasse" ? "good" : g.status === "non_atteint" ? "critical" : "warning"}>
        {g.status || "-"}
      </BadgeStatus>
    ),
  },
];

export default function Decisions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [resultValue, setResultValue] = useState("");
  const [form, setForm] = useState({ title: "", description: "", predicted_impact: "", confidence_pct: "" });

  const { data: decisions, isLoading } = useQuery({
    queryKey: ["decisions"],
    queryFn: async () => { const l = await base44.entities.Decision.list("-created_date", 50); return l || []; },
  });
  // Goal (objectifs importés/saisis : cible vs actuel par domaine) n'avait
  // aucune page — la donnée arrivait par import et disparaissait. Elle vit
  // ici, à côté des décisions qu'elle est censée éclairer.
  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => { const l = await base44.entities.Goal.list("-created_date", 50); return l || []; },
  });

  const handleCreate = async () => {
    if (!form.title) return;
    await base44.entities.Decision.create({
      title: form.title, description: form.description,
      predicted_impact: Number(form.predicted_impact) || 0,
      confidence_pct: Number(form.confidence_pct) || 0,
      status: "a_decider",
    });
    setForm({ title: "", description: "", predicted_impact: "", confidence_pct: "" });
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["decisions"] });
    toast({ title: "Décision créée" });
  };

  const handleDecide = async (id) => {
    await base44.entities.Decision.update(id, { status: "decidee", decision_date: new Date().toISOString().slice(0, 10) });
    qc.invalidateQueries({ queryKey: ["decisions"] });
    toast({ title: "Décision enregistrée" });
  };

  const handleAddResult = async (id) => {
    await base44.entities.Decision.update(id, {
      status: "resultats", actual_impact: Number(resultValue) || 0,
      result_date: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null); setResultValue("");
    qc.invalidateQueries({ queryKey: ["decisions"] });
    toast({ title: "Résultats enregistrés" });
  };

  if (isLoading) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;

  const completed = (decisions || []).filter((d) => d.status === "resultats" && d.actual_impact != null && d.predicted_impact);
  const avgPerf = completed.length > 0 ? Math.round(completed.reduce((s, d) => s + (d.actual_impact / d.predicted_impact) * 100, 0) / completed.length) : null;
  const tooOptimistic = completed.filter((d) => d.actual_impact < d.predicted_impact).length;

  const pending = (decisions || []).filter((d) => d.status === "a_decider");
  const decided = (decisions || []).filter((d) => d.status === "decidee");
  const results = (decisions || []).filter((d) => d.status === "resultats");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Décisions</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Suivez vos décisions, comparez les prévisions aux résultats réels.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? <><X className="mr-1 h-4 w-4" />Annuler</> : <><Plus className="mr-1 h-4 w-4" />Nouvelle décision</>}</Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div><Label htmlFor="d-title">Titre</Label><Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Augmenter le prix du produit X" /></div>
          <div><Label htmlFor="d-desc">Description</Label><Input id="d-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Contexte et justification" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="d-imp">Impact prévu ($/mois)</Label><Input id="d-imp" type="number" value={form.predicted_impact} onChange={(e) => setForm({ ...form, predicted_impact: e.target.value })} placeholder="Ex: 5000" /></div>
            <div><Label htmlFor="d-conf">Confiance (%)</Label><Input id="d-conf" type="number" value={form.confidence_pct} onChange={(e) => setForm({ ...form, confidence_pct: e.target.value })} placeholder="Ex: 80" /></div>
          </div>
          <Button onClick={handleCreate} disabled={!form.title}>Créer la décision</Button>
        </div>
      )}

      {decisions && decisions.length === 0 && !showForm && (
        <EmptyState icon={Target} title="Aucune décision suivie" description="Créez une décision pour suivre son impact prévu et comparer avec les résultats réels." action={<Button onClick={() => setShowForm(true)}><Plus className="mr-1 h-4 w-4" />Nouvelle décision</Button>} />
      )}

      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Précision moyenne des prévisions</p>
            <p className="mt-1 text-2xl font-bold">{avgPerf}%</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Décisions avec résultats</p>
            <p className="mt-1 text-2xl font-bold">{completed.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Prévisions trop optimistes</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{tooOptimistic}</p>
          </div>
        </div>
      )}

      {pending.length > 0 && <Section title="À décider" items={pending} onDecide={handleDecide} />}
      {decided.length > 0 && <Section title="Décisions prises" items={decided} onAddResult={(id) => setEditingId(id)} editingId={editingId} resultValue={resultValue} setResultValue={setResultValue} submitResult={() => handleAddResult(editingId)} />}
      {results.length > 0 && <Section title="Résultats" items={results} />}

      {goals && goals.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Objectifs ({goals.length})</h2>
          <DataTable columns={goalColumns} data={goals} rowKey={(g, i) => g.id || i} searchPlaceholder="Rechercher un objectif…" emptyTitle="Aucun objectif" />
        </div>
      )}
    </div>
  );
}

function Section({ title, items, ...props }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title} ({items.length})</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((d) => <DecisionCard key={d.id} decision={d} {...props} editing={props.editingId === d.id} />)}
      </div>
    </div>
  );
}