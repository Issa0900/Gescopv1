import React, { useState } from "react";
import { UNIVERSAL_KPI_CATALOG } from "../../../base44/shared/core/kpi/kpiCatalog";
import { BarChart3, CheckCircle2, AlertCircle, Plus, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function KpiManagementPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("available");

  // Démo des KPIs classés
  const kpiList = Object.values(UNIVERSAL_KPI_CATALOG);

  const availableKpis = kpiList.filter((k) =>
    ["gross_profit", "gross_margin_pct", "average_order_value", "revenue_per_branch"].includes(k.id)
  );

  const partialKpis = kpiList.filter((k) =>
    ["roas", "ctr", "cpc", "operating_profit", "net_profit"].includes(k.id)
  );

  const pendingKpis = kpiList.filter((k) =>
    !availableKpis.includes(k) && !partialKpis.includes(k)
  );

  const handleAddToDashboard = (kpiName) => {
    toast({
      title: "Indicateur épinglé",
      description: `« ${kpiName} » a été ajouté à votre tableau de bord principal.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Répertoire des KPI & Indicateurs Métiers
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Explorez l'éligibilité mathématique de chaque indicateur calculable dans GESCOP selon vos données importées.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-2 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("available")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "available" ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          ✓ Disponibles maintenant ({availableKpis.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("partial")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "partial" ? "bg-amber-50 text-amber-800 font-bold border border-amber-200" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Données partielles ({partialKpis.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === "all" ? "bg-slate-900 text-white font-bold" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Catalogue complet ({kpiList.length})
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(activeTab === "available" ? availableKpis : activeTab === "partial" ? partialKpis : kpiList).map((kpi) => (
          <div key={kpi.id} className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{kpi.primaryModule}</span>
                <h3 className="text-base font-bold text-slate-900">{kpi.name.fr}</h3>
              </div>
              <button
                type="button"
                onClick={() => handleAddToDashboard(kpi.name.fr)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors"
                title="Épingler sur le Dashboard"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Épingler
              </button>
            </div>

            <p className="text-xs text-muted-foreground">{kpi.description.fr}</p>

            <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-800 border border-slate-150">
              <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold">Formule de calcul :</span>
              {kpi.formula}
            </div>

            <div className="flex flex-wrap gap-1 text-[11px]">
              <span className="text-slate-500">Données requises :</span>
              {kpi.requiredMetrics.map((rm) => (
                <span key={rm} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                  {rm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

