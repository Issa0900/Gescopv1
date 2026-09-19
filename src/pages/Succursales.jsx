import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import StatCard from "@/components/StatCard";
import EmptyState from "@/components/EmptyState";
import { fetchAll } from "@/lib/fetchAll";
import { Building, MapPin, DollarSign, TrendingUp } from "lucide-react";

export default function Succursales() {
  const { data: orders, isLoading: lo } = useQuery({ queryKey: ["orders"], queryFn: () => fetchAll(base44.entities.Order) });
  const { data: employees, isLoading: le } = useQuery({ queryKey: ["employees"], queryFn: () => fetchAll(base44.entities.Employee) });
  const { data: assets, isLoading: la } = useQuery({ queryKey: ["assets"], queryFn: () => fetchAll(base44.entities.Asset) });
  const { data: summaryRows } = useQuery({ queryKey: ["executive-summary"], queryFn: () => fetchAll(base44.entities.ExecutiveSummary) });

  if (lo || le || la) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  const hasOrders = orders && orders.length > 0;
  const hasEmployees = employees && employees.length > 0;
  const hasAssets = assets && assets.length > 0;
  const hasSummary = summaryRows && summaryRows.length > 0;

  if (!hasOrders && !hasEmployees && !hasAssets && !hasSummary) {
    return (
      <EmptyState
        icon={Building}
        title="Aucune donnée de succursale"
        description="Importez vos ventes, employés et immobilisations pour suivre le P&L par succursale."
      />
    );
  }

  // Grouper par succursale (location / location_id)
  const locationsMap = {};

  const getLoc = (loc) => {
    if (!loc) return "Non assigné";
    return String(loc).trim() || "Non assigné";
  };

  const ensureLoc = (loc) => {
    const key = getLoc(loc);
    if (!locationsMap[key]) {
      locationsMap[key] = {
        name: key,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        employerCost: 0,
        depreciation: 0,
      };
    }
    return locationsMap[key];
  };

  (orders || []).forEach(o => {
    const loc = ensureLoc(o.location_id || o.succursale || o.store || o.location);
    const rev = Number(o.total_revenue) || Number(o.total) || 0;
    const cogs = Number(o.total_cost) || Number(o.cost) || 0;
    loc.revenue += rev;
    loc.cogs += cogs;
    loc.grossProfit += Number(o.gross_profit) || (rev - cogs);
  });

  if ((orders || []).length === 0 && (summaryRows || []).length > 0) {
    summaryRows.forEach(s => {
      const loc = ensureLoc(s.location_id || s.succursale || s.store);
      const rev = Number(s.total_revenue) || Number(s.total) || 0;
      const cogs = Number(s.total_cost) || Number(s.cost) || 0;
      loc.revenue += rev;
      loc.cogs += cogs;
      loc.grossProfit += Number(s.gross_profit) || (rev - cogs);
    });
  }

  (employees || []).forEach(e => {
    const loc = ensureLoc(e.location || e.branch || e.succursale || e.department);
    loc.employerCost += Number(e.total_employer_cost) || 0;
  });

  (assets || []).forEach(a => {
    const loc = ensureLoc(a.location_id || a.succursale || a.location);
    loc.depreciation += (Number(a.net_book_value || 0) * (Number(a.dpa_rate || 0)));
  });

  const locations = Object.values(locationsMap).map(loc => {
    // EBITDA = Gross Profit - Employer Cost (simplification P&L Succursale)
    loc.ebitda = loc.grossProfit - loc.employerCost;
    // EBIT = EBITDA - Depreciation
    loc.ebit = loc.ebitda - loc.depreciation;
    loc.marginPct = loc.revenue > 0 ? (loc.ebit / loc.revenue) * 100 : 0;
    return loc;
  }).sort((a, b) => b.ebit - a.ebit);

  const totalEbitda = locations.reduce((sum, l) => sum + l.ebitda, 0);
  const totalEbit = locations.reduce((sum, l) => sum + l.ebit, 0);
  const totalRev = locations.reduce((sum, l) => sum + l.revenue, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Performance par Succursale</h1>
        <p className="mt-1 text-muted-foreground">P&L détaillé croisant Ventes, RH et Immobilisations.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Succursales" value={locations.length.toLocaleString()} icon={MapPin} />
        <StatCard label="Chiffre d'affaires global" value={`${Math.round(totalRev).toLocaleString("fr-CA")} $`} icon={DollarSign} />
        <StatCard label="EBITDA total" value={`${Math.round(totalEbitda).toLocaleString("fr-CA")} $`} icon={TrendingUp} />
        <StatCard label="EBIT total (après amort.)" value={`${Math.round(totalEbit).toLocaleString("fr-CA")} $`} icon={TrendingUp} accent={totalEbit > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Succursale</th>
              <th className="px-4 py-3 font-medium text-right">Revenus</th>
              <th className="px-4 py-3 font-medium text-right">Marge Brute (Ventes)</th>
              <th className="px-4 py-3 font-medium text-right">Coût Employeur (RH)</th>
              <th className="px-4 py-3 font-medium text-right">EBITDA</th>
              <th className="px-4 py-3 font-medium text-right">Amortissement (Actifs)</th>
              <th className="px-4 py-3 font-medium text-right">EBIT (Résultat)</th>
              <th className="px-4 py-3 font-medium text-right">Marge Nette %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {locations.map((loc) => (
              <tr key={loc.name} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{loc.name}</td>
                <td className="px-4 py-3 text-right">{Math.round(loc.revenue).toLocaleString("fr-CA")} $</td>
                <td className="px-4 py-3 text-right">{Math.round(loc.grossProfit).toLocaleString("fr-CA")} $</td>
                <td className="px-4 py-3 text-right text-red-600/80">{Math.round(loc.employerCost).toLocaleString("fr-CA")} $</td>
                <td className="px-4 py-3 text-right font-semibold">{Math.round(loc.ebitda).toLocaleString("fr-CA")} $</td>
                <td className="px-4 py-3 text-right text-red-600/80">{Math.round(loc.depreciation).toLocaleString("fr-CA")} $</td>
                <td className={`px-4 py-3 text-right font-bold ${loc.ebit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {Math.round(loc.ebit).toLocaleString("fr-CA")} $
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${loc.marginPct >= 10 ? "bg-emerald-100 text-emerald-700" : loc.marginPct >= 0 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {loc.marginPct.toFixed(1)} %
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

