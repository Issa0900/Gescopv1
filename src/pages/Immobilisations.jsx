import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Identifiant</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Date d'acquisition</th>
              <th className="px-4 py-3 font-medium">Classe DPA</th>
              <th className="px-4 py-3 font-medium">Valeur d'acquisition</th>
              <th className="px-4 py-3 font-medium">Amort. Cumulé</th>
              <th className="px-4 py-3 font-medium">VNC</th>
              <th className="px-4 py-3 font-medium">Succursale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assets.slice(0, 100).map((a, i) => (
              <tr key={a.id || i} className="hover:bg-muted/30">
                <td className="px-4 py-3">{a.asset_id || "-"}</td>
                <td className="px-4 py-3 font-medium">{a.description || "-"}</td>
                <td className="px-4 py-3">{a.acquisition_date || "-"}</td>
                <td className="px-4 py-3">{a.dpa_class ? `${a.dpa_class} (${a.dpa_rate ? Math.round(a.dpa_rate * 100) : 0}%)` : "-"}</td>
                <td className="px-4 py-3">{a.initial_cost != null ? `${Math.round(a.initial_cost).toLocaleString()} $` : "-"}</td>
                <td className="px-4 py-3 text-red-600/80">{a.accumulated_depreciation != null ? `${Math.round(a.accumulated_depreciation).toLocaleString()} $` : "-"}</td>
                <td className="px-4 py-3 font-semibold">{a.net_book_value != null ? `${Math.round(a.net_book_value).toLocaleString()} $` : "-"}</td>
                <td className="px-4 py-3">{a.location_id || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
