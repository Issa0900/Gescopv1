import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Layers, MapPin, Building, Briefcase, Users, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function OrganizationPanel({ form, setForm }) {
  const org = form.organization_structure || {
    active_levels: ["entreprise", "succursale", "departement", "employe"],
    branches: ["Montréal - Centre-Ville", "Québec - Sainte-Foy", "Laval", "Lévis"],
    departments: ["Ventes & Conseil", "Marketing", "Opérations & Logistique", "Direction Générale"],
  };

  const [newBranch, setNewBranch] = useState("");
  const [newDept, setNewDept] = useState("");

  const updateOrg = (newOrg) => {
    setForm((f) => ({ ...f, organization_structure: newOrg }));
  };

  const toggleLevel = (levelId) => {
    const active = org.active_levels.includes(levelId)
      ? org.active_levels.filter((l) => l !== levelId)
      : [...org.active_levels, levelId];
    updateOrg({ ...org, active_levels: active });
  };

  const addBranch = () => {
    if (!newBranch.trim()) return;
    updateOrg({ ...org, branches: [...org.branches, newBranch.trim()] });
    setNewBranch("");
  };

  const removeBranch = (idx) => {
    updateOrg({ ...org, branches: org.branches.filter((_, i) => i !== idx) });
  };

  const addDept = () => {
    if (!newDept.trim()) return;
    updateOrg({ ...org, departments: [...org.departments, newDept.trim()] });
    setNewDept("");
  };

  const removeDept = (idx) => {
    updateOrg({ ...org, departments: org.departments.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Structure Organisationnelle (Succursales & Départements)
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Définit les niveaux réels de votre entreprise afin que GESCOP ne confonde jamais une <strong>Succursale / Localisation</strong> avec un <strong>Département</strong>.
        </p>
      </div>

      {/* Niveaux hiérarchiques actifs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Niveaux d'organisation actifs dans l'entreprise</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
          {[
            { id: "entreprise", label: "1. Siège / Entreprise", icon: Building },
            { id: "region", label: "2. Région / Territoire", icon: MapPin },
            { id: "succursale", label: "3. Succursale / Magasin", icon: MapPin },
            { id: "departement", label: "4. Département métier", icon: Briefcase },
            { id: "equipe", label: "5. Équipe / Quart", icon: Users },
            { id: "employe", label: "6. Employé individuel", icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const isChecked = org.active_levels.includes(id);
            return (
              <div
                key={id}
                onClick={() => toggleLevel(id)}
                className={`cursor-pointer rounded-xl border p-3 flex items-center justify-between transition-colors ${
                  isChecked ? "border-primary bg-primary/5 text-slate-900 font-semibold" : "border-border text-slate-500 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{label}</span>
                </div>
                {isChecked && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Registre des Succursales */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Points de vente & Succursales reconnus ({org.branches.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Ces entités sont strictement interprétées comme des <strong>localisations physiques</strong> lors des imports.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {org.branches.map((branch, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 border border-emerald-200"
            >
              <span>{branch}</span>
              <button
                type="button"
                onClick={() => removeBranch(idx)}
                className="hover:text-red-600 text-emerald-700"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-md">
          <Input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            placeholder="Ajouter une succursale (ex: Sherbrooke)"
            className="text-xs"
          />
          <Button type="button" size="sm" onClick={addBranch}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>

      {/* Registre des Départements */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-blue-600" />
              Départements organisationnels ({org.departments.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Ces termes sont strictement interprétés comme des <strong>fonctions / services internes</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {org.departments.map((dept, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900 border border-blue-200"
            >
              <span>{dept}</span>
              <button
                type="button"
                onClick={() => removeDept(idx)}
                className="hover:text-red-600 text-blue-700"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-md">
          <Input
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="Ajouter un département (ex: Service Client)"
            className="text-xs"
          />
          <Button type="button" size="sm" onClick={addDept}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
}

