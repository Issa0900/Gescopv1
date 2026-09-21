import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import DataTable from "@/components/ui/DataTable";
import { formatCAD } from "@/lib/utils";
import { fetchAll } from "@/lib/fetchAll";
import { Building2, Calculator, TrendingDown, Landmark } from "lucide-react";

export default function Immobilisations() {
  const { data: assets, isLoading, isError } = useQuery({
    queryKey: ["assets"],
    queryFn: () => fetchAll(base44.entities.Asset),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (isError) return <p className="text-sm text-red-600">Erreur lors du chargement des immobilisations.</p>;
  if (!assets || assets.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Aucune immobilisation"
        description="Importez vos données d'immobilisations pour suivre les valeurs d'acquisition et l'amortissement."
      />
    );
  }

  const total = assets.length;
  const initialValueTotal = assets.reduce((s, a) => s + (Number(a.initial_cost) || 0), 0);
  const netBookValueTotal = assets.reduce((s, a) => s + (Number(a.net_book_value) || 0), 0);
  const accumulatedDpa = assets.reduce((s, a) => s + (Number(a.accumulated_depreciation) || 0), 0);
  
  // Taux de vétusté : Amortissements cumulés / Valeur brute
  const vetustePct = initialValueTotal > 0 ? (accumulatedDpa / initialValueTotal) * 100 : 0;

  const assetColumns = [
    { key: "asset_id", header: "Identifiant", render: (a) => a.asset_id || "-" },
    { key: "description", header: "Description", searchValue: (a) => a.description || "", render: (a) => a.description || "-" },
    { key: "acquisition_date", header: "Date d'acquisition", render: (a) => a.acquisition_date || "-" },
    { key: "dpa_class", header: "Classe DPA", sortValue: (a) => a.dpa_class || "", render: (a) => a.dpa_class ? `${a.dpa_class} (${a.dpa_rate ? Math.round(a.dpa_rate * 100) : 0}%)` : "-" },
    { key: "initial_cost", header: "Valeur d'acquisition", align: "right", sortValue: (a) => Number(a.initial_cost) || 0, render: (a) => a.initial_cost != null ? formatCAD(a.initial_cost) : "-" },
    { key: "accumulated_depreciation", header: "Amort. Cumulé", align: "right", sortValue: (a) => Number(a.accumulated_depreciation) || 0, render: (a) => a.accumulated_depreciation != null ? <span className="text-red-600/80">{formatCAD(a.accumulated_depreciation)}</span> : "-" },
    { key: "net_book_value", header: "VNC", align: "right", sortValue: (a) => Number(a.net_book_value) || 0, render: (a) => a.net_book_value != null ? <span className="font-semibold">{formatCAD(a.net_book_value)}</span> : "-" },
    { key: "location_id", header: "Succursale", render: (a) => a.location_id || "-" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Immobilisations</h1>
        <p className="mt-1 text-muted-foreground">Suivi des actifs, amortissements et valeur nette comptable.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total des actifs" value={total.toLocaleString()} icon={Building2} />
        <StatCard label="Valeur d'acquisition totale" value={`${Math.round(initialValueTotal).toLocaleString("fr-CA")} $`} icon={Landmark} />
        <StatCard label="Valeur Nette Comptable" value={`${Math.round(netBookValueTotal).toLocaleString("fr-CA")} $`} icon={Calculator} />
        <StatCard 
          label="Taux de vétusté moyen" 
          value={`${Math.round(vetustePct)}%`} 
          sublabel="Amort. cumulés / Val. brute" 
          icon={TrendingDown} 
          accent={vetustePct > 70 ? "bg-red-50 text-red-600" : vetustePct > 50 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}
        />
      </div>

      <DataTable
        columns={assetColumns}
        data={assets}
        rowKey={(a, i) => a.id || i}
        searchPlaceholder="Rechercher un actif…"
        defaultPageSize={50}
        emptyTitle="Aucune immobilisation"
      />
    </div>
  );
}
