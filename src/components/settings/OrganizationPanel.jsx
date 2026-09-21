import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Layers, MapPin, Building, Briefcase, Users, Plus, Trash2, CheckCircle2, Globe } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function OrganizationPanel({ form, setForm }) {
  const { language } = useLanguage();
  const isEn = language === "en";

  const defaultOrg = {
    active_levels: ["entreprise", "region", "succursale", "departement", "employe"],
    regions: ["Grand Montréal", "Laurentides", "Estrie", "Québec Capitale"],
    branches: [
      { id: "b1", name: "Succursale Montréal - Centre", region: "Grand Montréal", type: "Succursale physique" },
      { id: "b2", name: "Succursale Laval", region: "Grand Montréal", type: "Succursale physique" },
      { id: "b3", name: "Succursale Saint-Jérôme", region: "Laurentides", type: "Succursale physique" },
      { id: "b4", name: "Boutique en ligne (E-commerce)", region: "National", type: "Canal numérique" }
    ],
    departments: [
      { id: "d1", name: "Ventes & Conseil Client", manager: "Direction des Ventes" },
      { id: "d2", name: "Achats & Gestion des stocks", manager: "Approvisionnement" },
      { id: "d3", name: "Comptabilité & Finance", manager: "Contrôleur financier" },
      { id: "d4", name: "Marketing & Acquisition", manager: "Responsable Marketing" }
    ],
  };

  const rawOrg = form?.organization_structure || {};
  const activeLevels = Array.isArray(rawOrg.active_levels)
    ? rawOrg.active_levels
    : defaultOrg.active_levels;
  const regions = Array.isArray(rawOrg.regions)
    ? rawOrg.regions
    : defaultOrg.regions;
  const branches = Array.isArray(rawOrg.branches)
    ? rawOrg.branches
    : defaultOrg.branches;
  const departments = Array.isArray(rawOrg.departments)
    ? rawOrg.departments
    : defaultOrg.departments;

  const [newBranch, setNewBranch] = useState("");
  const [newBranchRegion, setNewBranchRegion] = useState(
    typeof regions[0] === "string" ? regions[0] : (regions[0]?.name || "")
  );
  const [newDept, setNewDept] = useState("");
  const [newDeptManager, setNewDeptManager] = useState("");
  const [newRegion, setNewRegion] = useState("");

  const updateOrg = (patch) => {
    setForm((f) => ({
      ...f,
      organization_structure: {
        active_levels: activeLevels,
        regions,
        branches,
        departments,
        ...patch,
      },
    }));
  };

  const toggleLevel = (levelId) => {
    const next = activeLevels.includes(levelId)
      ? activeLevels.filter((l) => l !== levelId)
      : [...activeLevels, levelId];
    updateOrg({ active_levels: next });
  };

  // Branches Helpers
  const getBranchLabel = (b) => {
    if (!b) return "";
    if (typeof b === "string") return b;
    return b.name || b.label || b.id || "";
  };

  const addBranch = () => {
    if (!newBranch.trim()) return;
    const item = {
      id: "b_" + Date.now(),
      name: newBranch.trim(),
      region: newBranchRegion || "Grand Montréal",
      type: "Succursale",
    };
    updateOrg({ branches: [...branches, item] });
    setNewBranch("");
  };

  const removeBranch = (idx) => {
    updateOrg({ branches: branches.filter((_, i) => i !== idx) });
  };

  // Departments Helpers
  const getDeptLabel = (d) => {
    if (!d) return "";
    if (typeof d === "string") return d;
    return d.name || d.label || d.id || "";
  };

  const addDept = () => {
    if (!newDept.trim()) return;
    const item = {
      id: "d_" + Date.now(),
      name: newDept.trim(),
      manager: newDeptManager.trim() || (isEn ? "Manager" : "Responsable"),
    };
    updateOrg({ departments: [...departments, item] });
    setNewDept("");
    setNewDeptManager("");
  };

  const removeDept = (idx) => {
    updateOrg({ departments: departments.filter((_, i) => i !== idx) });
  };

  // Regions Helpers
  const addRegion = () => {
    if (!newRegion.trim()) return;
    const name = newRegion.trim();
    const exists = regions.some((r) => (typeof r === "string" ? r : r?.name) === name);
    if (!exists) {
      updateOrg({ regions: [...regions, name] });
    }
    setNewRegion("");
  };

  const removeRegion = (idx) => {
    updateOrg({ regions: regions.filter((_, i) => i !== idx) });
  };

  const levelOptions = [
    { id: "entreprise", label: isEn ? "1. Head Office / Company" : "1. Siège / Entreprise", icon: Building },
    { id: "region", label: isEn ? "2. Region / Territory" : "2. Région / Territoire", icon: Globe },
    { id: "succursale", label: isEn ? "3. Branch / Physical Store" : "3. Succursale / Magasin", icon: MapPin },
    { id: "departement", label: isEn ? "4. Department / Unit" : "4. Département métier", icon: Briefcase },
    { id: "equipe", label: isEn ? "5. Team / Shift" : "5. Équipe / Quart", icon: Users },
    { id: "employe", label: isEn ? "6. Individual Employee" : "6. Employé individuel", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          {isEn
            ? "Organizational Structure (Branches & Departments)"
            : "Structure Organisationnelle (Succursales & Départements)"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isEn
            ? "Defines company organizational tiers so GESCOP never confuses a Physical Branch / Location with an Internal Department."
            : "Définit les niveaux réels de votre entreprise afin que GESCOP ne confonde jamais une Succursale / Localisation avec un Département."}
        </p>
      </div>

      {/* Niveaux hiérarchiques actifs */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {isEn ? "Active organizational levels in your enterprise" : "Niveaux d'organisation actifs dans l'entreprise"}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
          {levelOptions.map(({ id, label, icon: Icon }) => {
            const isChecked = activeLevels.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleLevel(id)}
                className={
                  "rounded-xl border p-3 flex items-center justify-between text-left transition-all " +
                  (isChecked
                    ? "border-primary bg-primary/5 text-foreground font-semibold shadow-xs"
                    : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground")
                }
              >
                <div className="flex items-center gap-2 truncate">
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{label}</span>
                </div>
                {isChecked && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Registre des Régions */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-sky-500" />
            {isEn ? "Sales Territories & Regions (" + regions.length + ")" : "Territoires & Régions reconnus (" + regions.length + ")"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Geographical zones used to group points of sale and revenue distribution."
              : "Zones géographiques utilisées pour regrouper les points de vente et les résultats régionaux."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {regions.map((reg, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20"
            >
              <span>{typeof reg === "string" ? reg : reg?.name || reg?.id}</span>
              <button
                type="button"
                onClick={() => removeRegion(idx)}
                className="hover:text-red-500 text-sky-600 dark:text-sky-400 p-0.5 rounded transition-colors"
                title={isEn ? "Remove region" : "Supprimer la région"}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2 max-w-md pt-1">
          <Input
            value={newRegion}
            onChange={(e) => setNewRegion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRegion();
              }
            }}
            placeholder={isEn ? "Add a region (e.g. Greater Montreal, Ontario)" : "Ajouter une région (ex: Estrie, Laurentides)"}
            className="text-xs"
          />
          <Button type="button" size="sm" onClick={addRegion} className="gap-1 shadow-xs">
            <Plus className="h-4 w-4" /> {isEn ? "Add" : "Ajouter"}
          </Button>
        </div>
      </div>

      {/* Registre des Succursales */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-500" />
            {isEn ? "Registered Branches & Locations (" + branches.length + ")" : "Points de vente & Succursales reconnus (" + branches.length + ")"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Interpreted strictly as physical or digital sales channels during data imports."
              : "Ces entités sont strictement interprétées comme des localisations physiques ou canaux de vente lors des imports."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {branches.map((branch, idx) => {
            const label = getBranchLabel(branch);
            const region = typeof branch === "object" ? branch?.region : null;
            const bType = typeof branch === "object" ? branch?.type : null;
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              >
                <span>{label}</span>
                {region && (
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-300">
                    {region}
                  </span>
                )}
                {bType && bType !== "Succursale" && (
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-300">
                    {bType}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeBranch(idx)}
                  className="hover:text-red-500 text-emerald-700 dark:text-emerald-400 p-0.5 rounded transition-colors"
                  title={isEn ? "Remove branch" : "Supprimer la succursale"}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 max-w-lg pt-1">
          <Input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBranch();
              }
            }}
            placeholder={isEn ? "Add branch (e.g. Downtown Store)" : "Ajouter une succursale (ex: Magasin Centre-Ville)"}
            className="text-xs flex-1"
          />
          {regions.length > 0 && (
            <select
              value={newBranchRegion}
              onChange={(e) => setNewBranchRegion(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {regions.map((r, i) => {
                const val = typeof r === "string" ? r : r?.name;
                return (
                  <option key={i} value={val}>
                    {val}
                  </option>
                );
              })}
            </select>
          )}
          <Button type="button" size="sm" onClick={addBranch} className="gap-1 shrink-0 shadow-xs">
            <Plus className="h-4 w-4" /> {isEn ? "Add" : "Ajouter"}
          </Button>
        </div>
      </div>

      {/* Registre des Départements */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-blue-500" />
            {isEn ? "Internal Departments (" + departments.length + ")" : "Départements organisationnels (" + departments.length + ")"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Interpreted strictly as internal cost centers, services, or business functions."
              : "Ces termes sont strictement interprétés comme des fonctions, services internes ou centres de coûts."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {departments.map((dept, idx) => {
            const label = getDeptLabel(dept);
            const manager = typeof dept === "object" ? dept?.manager : null;
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 border border-blue-500/20"
              >
                <span>{label}</span>
                {manager && (
                  <span className="rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-normal text-blue-600 dark:text-blue-300">
                    {manager}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeDept(idx)}
                  className="hover:text-red-500 text-blue-700 dark:text-blue-400 p-0.5 rounded transition-colors"
                  title={isEn ? "Remove department" : "Supprimer le département"}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 max-w-lg pt-1">
          <Input
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDept();
              }
            }}
            placeholder={isEn ? "Department name (e.g. Customer Support)" : "Nom du département (ex: Service Client)"}
            className="text-xs flex-1"
          />
          <Input
            value={newDeptManager}
            onChange={(e) => setNewDeptManager(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDept();
              }
            }}
            placeholder={isEn ? "Lead / Role" : "Responsable (ex: Direction)"}
            className="text-xs sm:w-36"
          />
          <Button type="button" size="sm" onClick={addDept} className="gap-1 shrink-0 shadow-xs">
            <Plus className="h-4 w-4" /> {isEn ? "Add" : "Ajouter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
