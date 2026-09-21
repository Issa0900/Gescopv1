import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/fetchAll";
import { useObservations } from "@/hooks/useObservations";
import { useKpiEngine } from "@/lib/useKpiEngine";
import { KPI_REGISTRY } from "@/lib/core/kpiRegistry";
import { KPI_STATUS } from "@/lib/core/semanticTypes";
import { BarChart3 } from "lucide-react";

// Panneau réécrit le 18 sept 2026 : il affichait auparavant une classification
// codée en dur ("// Démo des KPIs classés") tirée d'un second moteur de KPI
// (base44/shared/core/kpi/*) dont la fonction d'éligibilité réelle
// (discoverKpis) n'était jamais appelée. kpiRegistry.js/kpiEngine.js est la
// source de vérité décidée (voir AGENTS.md) : l'éligibilité affichée ici est
// désormais calculée pour de vrai, contre les données effectivement importées.
const ALL_KPI_IDS = Object.keys(KPI_REGISTRY);

const STATUS_TAB = {
  measured: { label: "Disponibles maintenant", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  partial: { label: "Données partielles", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  pending: { label: "En attente de données", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

function classify(result) {
  if (!result) return "pending";
  if (result.status === KPI_STATUS.MEASURED || result.status === KPI_STATUS.VALID_ZERO) return "measured";
  if (result.status === KPI_STATUS.UNKNOWN || result.status === KPI_STATUS.INVALID) return "partial";
  return "pending";
}

export default function KpiManagementPanel() {
  const [activeTab, setActiveTab] = useState("measured");

  const { data: transactions } = useQuery({ queryKey: ["kpimgmt-transactions"], queryFn: () => fetchAll(base44.entities.Transaction, "-date") });
  const { data: expenses } = useQuery({ queryKey: ["kpimgmt-expenses"], queryFn: () => fetchAll(base44.entities.Expense, "-date") });
  const { data: employees } = useQuery({ queryKey: ["kpimgmt-employees"], queryFn: () => fetchAll(base44.entities.Employee) });
  const { data: payrolls } = useQuery({ queryKey: ["kpimgmt-payrolls"], queryFn: () => fetchAll(base44.entities.Payroll, "-period") });
  const { data: orders } = useQuery({ queryKey: ["kpimgmt-orders"], queryFn: () => fetchAll(base44.entities.Order, "-date") });
  const { data: customers } = useQuery({ queryKey: ["kpimgmt-customers"], queryFn: () => fetchAll(base44.entities.Customer) });
  const { data: cashflow } = useQuery({ queryKey: ["kpimgmt-cashflow"], queryFn: () => fetchAll(base44.entities.Cashflow, "-date") });
  const { data: campaignDaily } = useQuery({ queryKey: ["kpimgmt-campaign-daily"], queryFn: () => fetchAll(base44.entities.CampaignDaily, "-date") });
  const { data: observations } = useObservations();

  const { kpis: engineKpis } = useKpiEngine({
    transactions: transactions || [],
    orders: orders || [],
    customers: customers || [],
    observations: observations || [],
    cashflow: cashflow || [],
    expenses: expenses || [],
    employees: employees || [],
    payrolls: payrolls || [],
    campaignDaily: campaignDaily || [],
  }, ALL_KPI_IDS);

  const classified = ALL_KPI_IDS.map((id) => {
    const def = KPI_REGISTRY[id];
    const result = engineKpis.get(id);
    return { id, def, result, bucket: classify(result) };
  });

  const buckets = {
    measured: classified.filter((k) => k.bucket === "measured"),
    partial: classified.filter((k) => k.bucket === "partial"),
    pending: classified.filter((k) => k.bucket === "pending"),
  };

  const shown = buckets[activeTab] || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Répertoire des KPI & Indicateurs Métiers
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Éligibilité réelle de chaque indicateur, calculée à partir de vos données effectivement importées.
        </p>
      </div>

      <div className="flex gap-2 border-b border-border pb-2 text-sm">
        {Object.entries(STATUS_TAB).map(([key, { label, cls }]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors border ${
              activeTab === key ? `${cls} font-bold` : "text-slate-600 border-transparent hover:bg-slate-100"
            }`}
          >
            {label} ({buckets[key].length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shown.map(({ id, def, result }) => (
          <div key={id} className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{def.domain}</span>
              <h3 className="text-base font-bold text-slate-900">{def.name?.fr || id}</h3>
            </div>

            {result?.value != null && (
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(result.value * 100) / 100}
                {def.dataType === "percentage" ? "%" : def.dataType === "currency" ? " $" : ""}
              </p>
            )}

            <div className="flex flex-wrap gap-1 text-[11px]">
              <span className="text-slate-500">Données requises :</span>
              {(def.dependencies || []).length === 0 ? (
                <span className="text-slate-400 italic">directe</span>
              ) : (
                def.dependencies.map((rm) => (
                  <span key={rm} className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                    {rm}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Aucun indicateur dans cette catégorie pour l'instant.</p>
        )}
      </div>
    </div>
  );
}
