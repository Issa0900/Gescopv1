import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Target, Plus, Trash2, Calendar, TrendingUp } from "lucide-react";

export default function StrategicGoalsPanel({ form, setForm }) {
  const goals = form.strategic_goals || [
    {
      id: "goal-1",
      title: "Augmenter la marge brute",
      kpi_name: "Marge brute (%)",
      current_value: "39.4%",
      target_value: "42.0%",
      deadline: "2026-12-31",
      priority: "Élevée",
    },
    {
      id: "goal-2",
      title: "Optimiser le panier moyen",
      kpi_name: "Panier moyen (AOV)",
      current_value: "145.00 $",
      target_value: "165.00 $",
      deadline: "2026-09-30",
      priority: "Moyenne",
    },
  ];

  const [newTitle, setNewTitle] = useState("");
  const [newKpi, setNewKpi] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newDeadline, setNewDeadline] = useState("2026-12-31");

  const addGoal = () => {
    if (!newTitle.trim()) return;
    const nextGoals = [
      ...goals,
      {
        id: `goal-${Date.now()}`,
        title: newTitle.trim(),
        kpi_name: newKpi.trim() || "Chiffre d'affaires",
        current_value: "En cours",
        target_value: newTarget.trim() || "+10%",
        deadline: newDeadline,
        priority: "Élevée",
      },
    ];
    setForm((f) => ({ ...f, strategic_goals: nextGoals }));
    setNewTitle("");
    setNewKpi("");
    setNewTarget("");
  };

  const removeGoal = (id) => {
    setForm((f) => ({
      ...f,
      strategic_goals: goals.filter((g) => g.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Objectifs Stratégiques de l'Entreprise
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fixez vos cibles quantitatives et temporelles. GESCOP calibrera ses alertes et recommandations pour vous aider à les atteindre.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {goals.map((g) => (
          <div key={g.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">{g.kpi_name}</span>
                <h3 className="text-base font-bold text-slate-900">{g.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => removeGoal(g.id)}
                className="text-slate-400 hover:text-red-600 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block">Valeur actuelle</span>
                <strong className="text-slate-900 font-semibold">{g.current_value}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Cible visée</span>
                <strong className="text-emerald-600 font-bold">{g.target_value}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Échéance : {g.deadline}
              </span>
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                Priorité {g.priority}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire d'ajout rapide d'objectif */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Définir un nouvel objectif</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Intitulé de l'objectif (ex: Augmenter les ventes web)"
            className="text-xs bg-white"
          />
          <Input
            value={newKpi}
            onChange={(e) => setNewKpi(e.target.value)}
            placeholder="KPI associé (ex: Chiffre d'affaires)"
            className="text-xs bg-white"
          />
          <Input
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="Cible visée (ex: 3 500 000 $)"
            className="text-xs bg-white"
          />
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

