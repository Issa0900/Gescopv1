import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Target, Plus, Trash2, Calendar } from "lucide-react";

// Réécrit le 18 sept 2026 (Phase 4) : ce panneau écrivait les objectifs dans
// Company.strategic_goals, un champ que rien d'autre dans l'app ne lisait —
// un objectif fixé ici ne pouvait jamais déclencher d'alerte ni être comparé
// à un KPI réel. L'entité Goal (importable, affichée dans Décisions) est la
// source de vérité décidée en Phase 0 ; ce panneau écrit désormais dedans.

const PRIORITY_TO_ENUM = { "élevée": "elevee", elevee: "elevee", urgente: "urgente", moyenne: "moyenne", faible: "faible" };
const ENUM_TO_LABEL = { elevee: "Élevée", urgente: "Urgente", moyenne: "Moyenne", faible: "Faible" };

function normalizePriority(p) {
  const key = String(p || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return PRIORITY_TO_ENUM[key] || "moyenne";
}

// "39.4%", "165.00 $", "+10%" -> nombre ; "En cours" (pas de chiffre) -> null,
// une valeur réellement pas encore mesurée plutôt qu'un zéro inventé.
function parseLooseNumber(v) {
  if (v == null) return null;
  const m = String(v).match(/-?\d+([.,]\d+)?/);
  if (!m) return null;
  return Number(m[0].replace(",", "."));
}

export default function StrategicGoalsPanel() {
  const qc = useQueryClient();
  const migrated = useRef(false);

  const { data: goals, isLoading } = useQuery({
    queryKey: ["strategic-goals"],
    queryFn: async () => (await base44.entities.Goal.list("-created_date", 100)) || [],
  });

  // Lue directement (pas via le `form` du parent, qui ne persiste qu'au clic
  // sur "Enregistrer") pour pouvoir vider strategic_goals côté serveur tout
  // de suite après migration — sinon la migration se rejouerait à chaque
  // visite de cette page tant que l'utilisateur n'a pas sauvegardé, créant
  // un doublon de Goal à chaque fois.
  const { data: company } = useQuery({
    queryKey: ["company-for-goals-migration"],
    queryFn: async () => (await base44.entities.Company.list())?.[0] || null,
  });

  // Migration ponctuelle : les objectifs déjà saisis dans Company.strategic_goals
  // (l'ancien système, jamais lu ailleurs) deviennent de vrais enregistrements
  // Goal une seule fois, puis le champ est vidé côté serveur pour ne plus
  // jamais rejouer.
  useEffect(() => {
    const legacy = company?.strategic_goals;
    if (migrated.current || !company || !Array.isArray(legacy) || legacy.length === 0 || isLoading) return;
    migrated.current = true;
    (async () => {
      for (const g of legacy) {
        await base44.entities.Goal.create({
          metric: g.title || g.kpi_name || "Objectif",
          target: parseLooseNumber(g.target_value),
          current: parseLooseNumber(g.current_value),
          period: g.deadline || undefined,
          priority: normalizePriority(g.priority),
          status: "en_cours",
        });
      }
      await base44.entities.Company.update(company.id, { strategic_goals: [] });
      qc.invalidateQueries({ queryKey: ["strategic-goals"] });
    })();
  }, [company, isLoading, qc]);

  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("2026-12-31");

  const addGoal = async () => {
    if (!newTitle.trim()) return;
    await base44.entities.Goal.create({
      metric: newTitle.trim(),
      target: parseLooseNumber(newTarget) ?? undefined,
      period: newDeadline,
      priority: "elevee",
      status: "en_cours",
    });
    setNewTitle("");
    setNewTarget("");
    qc.invalidateQueries({ queryKey: ["strategic-goals"] });
  };

  const removeGoal = async (id) => {
    await base44.entities.Goal.delete(id);
    qc.invalidateQueries({ queryKey: ["strategic-goals"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Objectifs Stratégiques de l'Entreprise
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fixez vos cibles quantitatives et temporelles. Ces objectifs sont les mêmes que ceux affichés sur la page Décisions.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(goals || []).map((g) => (
            <div key={g.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">{g.metric}</h3>
                <button type="button" onClick={() => removeGoal(g.id)} className="text-slate-400 hover:text-red-600 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-500 block">Valeur actuelle</span>
                  <strong className="text-slate-900 font-semibold">{g.current ?? "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Cible visée</span>
                  <strong className="text-emerald-600 font-bold">{g.target ?? "—"}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Échéance : {g.period || "—"}
                </span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  Priorité {ENUM_TO_LABEL[g.priority] || g.priority || "—"}
                </span>
              </div>
            </div>
          ))}
          {(goals || []).length === 0 && (
            <p className="text-sm text-muted-foreground italic col-span-2">Aucun objectif défini pour l'instant.</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Définir un nouvel objectif</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Intitulé de l'objectif (ex: Augmenter les ventes web)" className="text-xs bg-white" />
          <Input value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="Cible visée (ex: 3 500 000 $)" className="text-xs bg-white" />
          <Input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="text-xs bg-white" />
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={addGoal}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter l'objectif
          </Button>
        </div>
      </div>
    </div>
  );
}
