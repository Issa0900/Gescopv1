import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/EmptyState";
import PriorityBadge from "@/components/PriorityBadge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CheckSquare, Plus, Check, Trash2, Calendar, List } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskCalendar from "@/components/tasks/TaskCalendar";

const categories = ["urgent", "financier", "commercial", "marketing", "operationnel", "administratif", "strategique"];
const catLabels = {
  urgent: "Urgent",
  financier: "Financier",
  commercial: "Commercial",
  marketing: "Marketing",
  operationnel: "Opérationnel",
  administratif: "Administratif",
  stratégique: "Stratégique",
  strategique: "Stratégique",
};

export default function Taches() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState("list");
  const [form, setForm] = useState({ title: "", category: "strategique", priority: "moyenne", due_date: "" });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const list = await base44.entities.Task.list("-created_date", 100);
      return list || [];
    },
  });

  const createTask = async () => {
    if (!form.title) return;
    await base44.entities.Task.create({ ...form, status: "a_faire" });
    setForm({ title: "", category: "strategique", priority: "moyenne", due_date: "" });
    setShowForm(false);
    qc.invalidateQueries(["tasks"]);
    toast({ title: "Tâche créée" });
  };

  const toggleStatus = async (t) => {
    const next = t.status === "terminee" ? "a_faire" : "terminee";
    await base44.entities.Task.update(t.id, { status: next });
    qc.invalidateQueries(["tasks"]);
  };

  const remove = async (id) => {
    await base44.entities.Task.delete(id);
    qc.invalidateQueries(["tasks"]);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const todo = (tasks || []).filter((t) => t.status !== "terminee" && t.status !== "annulee");
  const done = (tasks || []).filter((t) => t.status === "terminee");

  const sorted = [...todo].sort((a, b) => {
    const order = { urgente: 0, elevee: 1, moyenne: 2, faible: 3 };
    return (order[a.priority] || 4) - (order[b.priority] || 4);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centre de tâches</h1>
          <p className="mt-1 text-muted-foreground">Toutes vos actions, priorisées automatiquement.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setView("list")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List className="h-4 w-4" /> Liste
            </button>
            <button
              onClick={() => setView("calendar")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Calendar className="h-4 w-4" /> Calendrier
            </button>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nouvelle tâche
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Titre</label>
              <input
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex. Vérifier les prix du fournisseur X"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Catégorie</label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => <option key={c} value={c}>{catLabels[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priorité</label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="urgente">Urgente</option>
                <option value="elevee">Élevée</option>
                <option value="moyenne">Moyenne</option>
                <option value="faible">Faible</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Échéance</label>
              <input
                type="date"
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={createTask}>Créer</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {!tasks || tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Aucune tâche" description="Convertissez des recommandations en tâches ou créez-en manuellement." />
      ) : view === "calendar" ? (
        <TaskCalendar tasks={tasks} onToggle={toggleStatus} />
      ) : (
        <>
          <div className="space-y-2">
            {sorted.map((t) => (
              <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <button
                  onClick={() => toggleStatus(t)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    t.status === "terminee" ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40"
                  )}
                >
                  {t.status === "terminee" && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1">
                  <p className={cn("font-medium", t.status === "terminee" && "text-muted-foreground line-through")}>{t.title}</p>
                  {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{catLabels[t.category] || t.category}</span>
                    <PriorityBadge level={t.priority} />
                    {t.due_date && <span className="text-xs text-muted-foreground">Échéance: {t.due_date}</span>}
                  </div>
                </div>
                <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {done.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">Terminées ({done.length})</h2>
              <div className="space-y-2">
                {done.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-muted-foreground line-through">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}